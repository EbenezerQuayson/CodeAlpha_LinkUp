from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    LIKE = 'like'
    COMMENT = 'comment'
    FOLLOW = 'follow'

    NOTIFICATION_TYPES = [
        (LIKE, 'Liked your post'),
        (COMMENT, 'Commented on your post'),
        (FOLLOW, 'Started following you'),
    ]

    # The user who RECEIVES the notification
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    # The user who TRIGGERED the action
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    # Optional — link to the post that was liked/commented on
    post_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender} → {self.recipient}: {self.notification_type}"

    def get_message(self):
        if self.notification_type == self.LIKE:
            return f"{self.sender.username} liked your post"
        elif self.notification_type == self.COMMENT:
            return f"{self.sender.username} commented on your post"
        elif self.notification_type == self.FOLLOW:
            return f"{self.sender.username} started following you"
        return ""

    def get_icon(self):
        icons = {
            self.LIKE: 'fa-heart',
            self.COMMENT: 'fa-comment',
            self.FOLLOW: 'fa-user-plus',
        }
        return icons.get(self.notification_type, 'fa-bell')

    def get_color(self):
        colors = {
            self.LIKE: '#ef4444',
            self.COMMENT: '#2563eb',
            self.FOLLOW: '#10b981',
        }
        return colors.get(self.notification_type, '#6b7280')
