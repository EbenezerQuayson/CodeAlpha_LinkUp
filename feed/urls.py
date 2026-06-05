from django.urls import path
from . import views

app_name = 'feed'

urlpatterns = [
    path('', views.global_feed, name='global_feed'),
    path('like/<int:post_id>/', views.like_post, name='like_post'),
    path('comments/<int:post_id>/', views.get_comments, name='get_comments'),
    path('comments/<int:post_id>/add/', views.add_comment, name='add_comment'),
    path('posts/<int:post_id>/delete/', views.delete_post, name='delete_post'),
    path('comments/<int:comment_id>/delete/', views.delete_comment, name='delete_comment'),
]
