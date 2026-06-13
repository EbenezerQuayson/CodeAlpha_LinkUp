from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from feed.models import Post, Comment
from profiles.models import Profile
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .views import _time_ago

def _send_notification_ws(notification):
    """Helper to send WebSocket payload for a single notification"""
    channel_layer = get_channel_layer()
    group_name = f"user_{notification.recipient.id}"
    
    payload = {
        'id': notification.id,
        'message': notification.get_message(),
        'icon': notification.get_icon(),
        'color': notification.get_color(),
        'is_read': notification.is_read,
        'post_id': notification.post_id,
        'notification_type': notification.notification_type,
        'sender': notification.sender.username,
        'sender_avatar': notification.sender.profile.avatar.url if notification.sender.profile.avatar else None,
        'created_at': notification.created_at.strftime('%b %d, %Y at %I:%M %p'),
        'time_ago': _time_ago(notification.created_at),
    }

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'notification_message',
            'notification': payload
        }
    )

@receiver(post_save, sender=Notification)
def push_notification_ws(sender, instance, created, **kwargs):
    """When a new notification is created, push it to the user's WebSocket"""
    if created:
        _send_notification_ws(instance)

@receiver(post_save, sender=Comment)
def notify_on_comment(sender, instance, created, **kwargs):
    """Create a notification when someone comments on a post."""
    if created:
        post_author = instance.post.author
        # Don't notify yourself
        if instance.author != post_author:
            Notification.objects.create(
                recipient=post_author,
                sender=instance.author,
                notification_type=Notification.COMMENT,
                post_id=instance.post.id,
            )


@receiver(m2m_changed, sender=Post.likes.through)
def notify_on_like(sender, instance, action, pk_set, **kwargs):
    """Create a notification when someone likes a post."""
    if action == 'post_add' and pk_set:
        from django.contrib.auth.models import User
        for user_id in pk_set:
            liker = User.objects.get(pk=user_id)
            # Don't notify yourself
            if liker != instance.author:
                # Avoid duplicate notifications
                Notification.objects.get_or_create(
                    recipient=instance.author,
                    sender=liker,
                    notification_type=Notification.LIKE,
                    post_id=instance.id,
                )


@receiver(m2m_changed, sender=Profile.follows.through)
def notify_on_follow(sender, instance, action, pk_set, **kwargs):
    """Create a notification when someone follows a user."""
    if action == 'post_add' and pk_set:
        # instance is the Profile who is now following others
        # pk_set contains the Profile PKs being followed
        for followed_profile_id in pk_set:
            followed_profile = Profile.objects.get(pk=followed_profile_id)
            # Don't notify yourself
            if instance.user != followed_profile.user:
                # Avoid spammy duplicate follow notifications
                Notification.objects.get_or_create(
                    recipient=followed_profile.user,
                    sender=instance.user,
                    notification_type=Notification.FOLLOW,
                )
