from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from .models import Profile
from feed.models import Post

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Log the user in immediately
            login(request, user)
            return redirect('feed:global_feed')
    else:
        form = UserCreationForm()
    return render(request, 'registration/signup.html', {'form': form})

@login_required
def profile_view(request, username):
    user_obj = get_object_or_404(User, username=username)
    profile = user_obj.profile
    posts = Post.objects.filter(author=user_obj).order_by('-created_at')
    
    is_following = False
    if request.user != user_obj:
        is_following = request.user.profile.follows.filter(id=profile.id).exists()
        
    context = {
        'profile_user': user_obj,
        'profile': profile,
        'posts': posts,
        'is_following': is_following
    }
    return render(request, 'profiles/profile.html', context)

@login_required
def follow_user(request, user_id):
    if request.method == 'POST':
        target_user = get_object_or_404(User, id=user_id)
        if request.user == target_user:
            return JsonResponse({'error': 'Cannot follow yourself'}, status=400)

        my_profile = request.user.profile
        target_profile = target_user.profile

        if target_profile in my_profile.follows.all():
            my_profile.follows.remove(target_profile)
            followed = False
        else:
            my_profile.follows.add(target_profile)
            followed = True

        return JsonResponse({
            'followed': followed, 
            'followers_count': target_profile.followed_by.count(),
            'following_count': my_profile.follows.count()
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def users_list(request):
    """Display a list of all users except the current user"""
    users = User.objects.exclude(id=request.user.id)
    # Annotate each user with whether the current user follows them
    following_ids = request.user.profile.follows.values_list('user_id', flat=True)
    context = {
        'users': users,
        'following_ids': list(following_ids),
    }
    return render(request, 'profiles/users_list.html', context)


@login_required
def edit_profile(request):
    """Allow user to edit their own profile (bio & avatar)"""
    profile = request.user.profile
    if request.method == 'POST':
        bio = request.POST.get('bio', '')
        profile.bio = bio
        if 'avatar' in request.FILES:
            profile.avatar = request.FILES['avatar']
        profile.save()
        return redirect('profiles:profile_view', username=request.user.username)
    return render(request, 'profiles/edit_profile.html', {'profile': profile})
