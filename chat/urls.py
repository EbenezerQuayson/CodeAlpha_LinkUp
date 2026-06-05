from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.conversations_list, name='conversations_list'),
    path('message/<int:message_id>/delete/', views.delete_message, name='delete_message'),
    path('message/<int:message_id>/edit/', views.edit_message, name='edit_message'),
    path('<str:username>/', views.chat_view, name='chat_view'),
]
