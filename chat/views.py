from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
import json
from .models import Thread, Message

@login_required
def conversations_list(request):
    """Display a list of all conversations for the current user"""
    threads = Thread.objects.filter(participants=request.user).order_by('-updated_at')
    # Pre-process threads so template doesn't need to call methods with arguments
    thread_list = []
    for thread in threads:
        thread.other_user = thread.get_other_user(request.user)
        thread.last_message = thread.get_last_message()
        thread.unread_count = thread.get_unread_count(request.user)
        thread_list.append(thread)
    context = {'threads': thread_list}
    return render(request, 'chat/conversations.html', context)


@login_required
def chat_view(request, username):
    other_user = get_object_or_404(User, username=username)

    # Check if a thread already exists between the two users
    # A thread must contain both request.user and other_user
    threads = Thread.objects.filter(participants=request.user).filter(participants=other_user)

    if threads.exists():
        thread = threads.first()
    else:
        # Create a new thread if one doesn't exist
        thread = Thread.objects.create()
        thread.participants.add(request.user, other_user)

    # Mark messages sent by the other user as read
    thread.messages.filter(sender=other_user, is_read=False).update(is_read=True)

    if request.method == 'POST':
        body = request.POST.get('body')
        if body:
            Message.objects.create(
                thread=thread,
                sender=request.user,
                body=body
            )
            # Update thread updated_at
            thread.save()
            return redirect('chat:chat_view', username=username)

    messages = thread.messages.order_by('timestamp')

    return render(request, 'chat/chat.html', {
        'thread': thread,
        'other_user': other_user,
        'chat_messages': messages
    })


@login_required
def delete_message(request, message_id):
    if request.method == 'POST':
        message = get_object_or_404(Message, id=message_id)
        if message.sender == request.user:
            message.is_deleted = True
            message.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'error': 'You do not have permission to delete this message'}, status=403)
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def edit_message(request, message_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_body = data.get('body')
            message = get_object_or_404(Message, id=message_id)
            
            if message.is_deleted:
                return JsonResponse({'error': 'Cannot edit a deleted message'}, status=400)
            
            if message.sender != request.user:
                return JsonResponse({'error': 'You do not have permission to edit this message'}, status=403)
                
            time_difference = timezone.now() - message.timestamp
            if time_difference > timedelta(minutes=15):
                return JsonResponse({'error': 'Messages can only be edited within 15 minutes of sending'}, status=403)
                
            if new_body and new_body.strip():
                message.body = new_body.strip()
                message.is_edited = True
                message.save()
                return JsonResponse({'success': True, 'new_body': message.body})
            else:
                return JsonResponse({'error': 'Message cannot be empty'}, status=400)
                
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'error': 'Invalid request'}, status=400)
