from .models import Thread

def recent_threads(request):
    if request.user.is_authenticated:
        threads = request.user.threads.all().order_by('-updated_at')
        
        general_threads_data = []
        request_threads_data = []
        general_unread_count = 0
        request_unread_count = 0
        
        follower_ids = set(request.user.profile.followed_by.values_list('user_id', flat=True))
        
        for thread in threads:
            other_participants = thread.participants.exclude(id=request.user.id)
            if other_participants.exists():
                other_user = other_participants.first()
                last_message = thread.messages.order_by('-timestamp').first()
                
                # Check for unread messages sent by the other user
                unread_count = thread.messages.filter(is_read=False).exclude(sender=request.user).count()
                
                data = {
                    'id': thread.id,
                    'other_user': other_user,
                    'last_message': last_message,
                    'unread_count': unread_count,
                    'updated_at': thread.updated_at
                }
                
                if other_user.id in follower_ids:
                    general_threads_data.append(data)
                    general_unread_count += unread_count
                else:
                    request_threads_data.append(data)
                    request_unread_count += unread_count
                
        return {
            'general_threads': general_threads_data[:5],
            'request_threads': request_threads_data[:5],
            'general_unread_count': general_unread_count,
            'request_unread_count': request_unread_count
        }
    return {}
