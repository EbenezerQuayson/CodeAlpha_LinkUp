from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Notification


@login_required
def notifications_list(request):
    """Return the current user's notifications as JSON."""
    notifications_qs = Notification.objects.filter(
        recipient=request.user
    ).select_related('sender', 'sender__profile').order_by('-created_at')
    
    unread_count = notifications_qs.filter(is_read=False).count()
    notifications = notifications_qs[:30]

    data = {
        'unread_count': unread_count,
        'notifications': [
            {
                'id': n.id,
                'message': n.get_message(),
                'icon': n.get_icon(),
                'color': n.get_color(),
                'is_read': n.is_read,
                'post_id': n.post_id,
                'notification_type': n.notification_type,
                'sender': n.sender.username,
                'sender_avatar': n.sender.profile.avatar.url if n.sender.profile.avatar else None,
                'created_at': n.created_at.strftime('%b %d, %Y at %I:%M %p'),
                'time_ago': _time_ago(n.created_at),
            }
            for n in notifications
        ]
    }
    return JsonResponse(data)


@login_required
def mark_notification_read(request, notification_id):
    """Mark a single notification as read."""
    if request.method == 'POST':
        notification = get_object_or_404(
            Notification, id=notification_id, recipient=request.user
        )
        notification.is_read = True
        notification.save()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def mark_all_read(request):
    """Mark all notifications for the current user as read."""
    if request.method == 'POST':
        Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'}, status=400)


def _time_ago(dt):
    """Return a human-friendly 'X ago' string."""
    from django.utils import timezone
    import math
    now = timezone.now()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return 'Just now'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes}m ago'
    hours = minutes // 60
    if hours < 24:
        return f'{hours}h ago'
    days = hours // 24
    if days < 7:
        return f'{days}d ago'
    weeks = days // 7
    return f'{weeks}w ago'
