from django.urls import path
from . import views

app_name = 'profiles'

urlpatterns = [
    path('register/', views.register, name='register'),
    path('users/', views.users_list, name='users_list'),
    path('edit/', views.edit_profile, name='edit_profile'),
    path('follow/<int:user_id>/', views.follow_user, name='follow_user'),
    path('<str:username>/', views.profile_view, name='profile_view'),
]
