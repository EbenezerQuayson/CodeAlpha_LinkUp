from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Post, Comment
from profiles.models import Profile

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

    posts = Post.objects.all().order_by('-created_at')
    
    # Get the list of user IDs that the current user follows
    # We need to make sure the user has a profile. If they don't, we can create one or handle it.
    try:
        user_profile = request.user.profile
        followed_users = user_profile.follows.values_list('user_id', flat=True)
    except Profile.DoesNotExist:
        followed_users = []
        
    context = {
        'posts': posts,
        'followed_users': list(followed_users),
        'error_msg': error_msg
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

