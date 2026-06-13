import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Thread

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
        else:
            self.other_username = self.scope['url_route']['kwargs']['username']
            
            # Create a unique, consistent room name for these two users
            users = sorted([self.scope['user'].username, self.other_username])
            self.room_group_name = f"chat_{users[0]}_{users[1]}"

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def chat_message(self, event):
        """Receive a new message from the channel layer and send to WebSocket."""
        await self.send(text_data=json.dumps(event))
        
    async def chat_message_delete(self, event):
        """Receive a deleted message event and send to WebSocket."""
        await self.send(text_data=json.dumps(event))
        
    async def chat_message_edit(self, event):
        """Receive an edited message event and send to WebSocket."""
        await self.send(text_data=json.dumps(event))
