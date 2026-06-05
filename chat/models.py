from django.db import models
from django.contrib.auth.models import User

class Thread(models.Model):
    participants = models.ManyToManyField(User, related_name='threads')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Thread {self.id}"

    def get_other_user(self, current_user):
        """Return the other user in a 2-person thread"""
        return self.participants.exclude(id=current_user.id).first()

    def get_last_message(self):
        """Return the most recent message in this thread"""
        return self.messages.order_by('-timestamp').first()

    def get_unread_count(self, user):
        """Return count of unread messages for a specific user"""
        return self.messages.filter(is_read=False).exclude(sender=user).count()

class Message(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    body = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"
