from django.contrib import admin
from .models import Thread, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 1

@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'updated_at')
    inlines = [MessageInline]
    filter_horizontal = ('participants',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'thread', 'timestamp', 'is_read')
    list_filter = ('is_read', 'timestamp')
    search_fields = ('body', 'sender__username')
