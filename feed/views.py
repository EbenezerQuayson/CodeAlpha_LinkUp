import math
import random
import hashlib
from datetime import timedelta

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count

from .models import Post, Comment
from profiles.models import Profile


def _score_posts(posts, followed_user_ids, seed):
    """
    Weighted-shuffle ranking algorithm.

    Each post receives a score from three signals, then a seeded random
    jitter is added so the feed feels fresh without being chaotic.

    Signals
    -------
    1. Recency  – exponential decay with a 24-hour half-life.
                  A post from right now scores ~10, one from 24h ago ~5.
    2. Engagement – log-scaled (likes + comments + 1) so a viral post
                    bubbles up but doesn't dominate forever.
    3. Follow bonus – +2 if the author is someone you follow, so your
                      network's posts surface more often.

    Jitter
    ------
    ±30 % of the computed score, drawn from a seeded RNG so the same
    seed (rotated every 10 min) produces the same shuffle — rapid
    refreshes stay stable, but checking back later feels different.
    """
    now = timezone.now()
    half_life_hours = 24.0
    decay_rate = math.log(2) / half_life_hours

    rng = random.Random(seed)

    scored = []
    for post in posts:
        # 1. Recency (0–10 range for recent posts, decays toward 0)
        age_hours = max((now - post.created_at).total_seconds() / 3600.0, 0)
        recency = 10.0 * math.exp(-decay_rate * age_hours)

        # 2. Engagement (logarithmic so it doesn't overwhelm)
        engagement = math.log1p(post.num_likes + post.num_comments)

        # 3. Follow bonus
        follow_bonus = 2.0 if post.author_id in followed_user_ids else 0.0

        score = recency + engagement + follow_bonus

        # 4. Seeded jitter: ±30 %
        jitter = rng.uniform(-0.30, 0.30) * score
        score += jitter

        scored.append((score, post))

    # Sort descending by score
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [post for _, post in scored]


@login_required
def global_feed(request):
    error_msg = None
    if request.method == 'POST':
        content = request.POST.get('content')
        media_file = request.FILES.get('image')

        if media_file and media_file.size > 50 * 1024 * 1024:
            error_msg = "File size cannot exceed 50MB."
        elif content or media_file:
            post = Post(author=request.user, content=content)
            if media_file:
                if media_file.content_type.startswith('video/'):
                    post.video = media_file
                else:
                    post.image = media_file
            post.save()
            return redirect('feed:global_feed')

    # Single annotated query — counts resolved in the DB, no N+1
    posts_qs = (
        Post.objects
        .select_related('author', 'author__profile')
        .annotate(
            num_likes=Count('likes', distinct=True),
            num_comments=Count('comments', distinct=True),
        )
    )

    # Follow list for the scoring algorithm
    try:
        user_profile = request.user.profile
        followed_user_ids = set(
            user_profile.follows.values_list('user_id', flat=True)
        )
    except Profile.DoesNotExist:
        followed_user_ids = set()

    # Build a seed that rotates every 10 minutes, unique per user.
    # This means the same user sees a stable order on quick refreshes
    # but gets a fresh shuffle every ~10 min.
    time_bucket = int(timezone.now().timestamp()) // 600  # 600s = 10 min
    seed_input = f"{request.user.id}-{time_bucket}"
    seed = int(hashlib.md5(seed_input.encode()).hexdigest(), 16) % (2**32)

    posts = _score_posts(list(posts_qs), followed_user_ids, seed)

    context = {
        'posts': posts,
        'followed_users': list(followed_user_ids),
        'error_msg': error_msg,
    }
    return render(request, 'feed/global.html', context)

@login_required
def like_post(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        if request.user in post.likes.all():
            post.likes.remove(request.user)
            liked = False
        else:
            post.likes.add(request.user)
            liked = True
        return JsonResponse({'liked': liked, 'likes_count': post.total_likes()})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def get_comments(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    comments = post.comments.all().order_by('created_at')
    comments_data = [{
        'id': c.id,
        'author': c.author.username,
        'text': c.text,
        'created_at': c.created_at.strftime('%Y-%m-%d %H:%M')
    } for c in comments]
    return JsonResponse({'comments': comments_data})

@login_required
def add_comment(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        # Handle both form data and json data
        import json
        try:
            data = json.loads(request.body)
            text = data.get('text', '')
        except json.JSONDecodeError:
            text = request.POST.get('text', '')

        if text.strip():
            comment = Comment.objects.create(post=post, author=request.user, text=text)
            return JsonResponse({
                'id': comment.id,
                'author': comment.author.username,
                'text': comment.text,
                'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M')
            })
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def delete_post(request, post_id):
    """Delete a post if the user is the author"""
    post = get_object_or_404(Post, id=post_id)
    if post.author != request.user:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    post.delete()
    return redirect('feed:global_feed')


@login_required
def delete_comment(request, comment_id):
    """Delete a comment if the user is the author"""
    comment = get_object_or_404(Comment, id=comment_id)
    if comment.author != request.user:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    post_id = comment.post.id
    comment.delete()
    return JsonResponse({'success': True})

