# CodeAlpha_LinkUp

CodeAlpha_LinkUp is a Django-based social networking platform built as part of the CodeAlpha Full Stack Development Internship. The app supports user registration, profile management, follower relationships, content publishing, real-time notifications, messaging, and media uploads.

## Key Features

* **Authentication & Registration**
  * Secure user login and signup using Django's authentication framework.
  * Profile creation and management for every registered user.
* **Social Graph**
  * Follow/unfollow functionality with Many-to-Many relational support.
  * User directory and discovery pages.
* **Feed & Content**
  * Create posts with text, images, and video attachments.
  * Like and comment on posts.
* **Real-Time Interactions**
  * Asynchronous likes, follows, and notifications using JavaScript and WebSockets.
  * Chat support for instant messages between users.
* **Notifications**
  * Event-driven notifications for new followers, likes, comments, and messages.
* **Responsive Frontend**
  * Mobile-friendly UI built with HTML5, CSS3, and vanilla JavaScript.

## Tech Stack

* **Backend:** Python 3, Django
* **Database:** SQLite (development-ready, easily swapped to PostgreSQL)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Real-time:** Django Channels / WebSockets

## Project Structure

```text
CodeAlpha_LinkUp/
├── chat/                 # Realtime chat and conversation features
├── feed/                 # Posts, comments, media, and feed views
├── notifications/        # Notification delivery and event handling
├── profiles/             # User profiles, avatars, and follow relationships
├── social_project/       # Django project settings, routing, and ASGI/WGI setup
├── static/               # CSS and JavaScript assets
├── templates/            # Shared and app-specific HTML templates
├── manage.py             # Django command-line utility
└── README.md             # Project documentation
```

## Local Setup

Make sure Python 3 is installed, then run the following commands from the project root.

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment (Windows)
venv\Scripts\activate

# Install Django and required packages
pip install django

# Create and apply database migrations
python manage.py makemigrations
python manage.py migrate

# Create an admin user
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

Open a browser and visit `http://127.0.0.1:8000/` to explore the app. The admin interface is available at `http://127.0.0.1:8000/admin/`.

## Notes

* The project uses SQLite by default for development.
* For production, switch to PostgreSQL or another supported database and update `social_project/settings.py` accordingly.
* If additional dependencies are added, install them in the active virtual environment.


