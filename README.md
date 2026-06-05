# CodeAlpha_LinkUp

A relational social media platform developed as part of the CodeAlpha Full Stack Development Internship. LinkUp allows users to create profiles, build a social graph by following others, publish content, and interact dynamically through asynchronous likes and comments.

## 🚀 Features

* **Robust Authentication:** Secure user registration and login handled by Django's built-in auth framework.
* **Automated Profile Generation:** Utilizes Django `post_save` signals to automatically construct relational user profiles upon account creation.
* **Relational Social Graph:** Complex Many-to-Many database routing allows users to follow and unfollow each other seamlessly.
* **Content Engine:** Users can publish posts and engage in discussions via linked comments.
* **Asynchronous Interactions:** Vanilla JavaScript and the Fetch API are used to process "Likes" and "Follows" in real-time, instantly updating UI metrics without requiring a page reload.
* **Responsive UI:** Clean, mobile-friendly interface built with HTML5, CSS3, and modern frontend design principles.

## 🛠️ Tech Stack

* **Backend:** Python, Django
* **Database:** SQLite (Configured for rapid development, easily portable to PostgreSQL)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript

## 📂 Project Structure

```text
CodeAlpha_LinkUp/
├── social_project/       # Core project settings and configuration
├── profiles/             # App managing user bios, avatars, and the follower graph
├── feed/                 # App managing posts, comments, and the like system
├── manage.py             # Django command-line utility
└── README.md

## ⚙️ Local Setup & Installation

To run this project locally, ensure you have Python installed, then follow these steps:

**1. Clone the repository**
`bash
git clone https://github.com/your-username/CodeAlpha_LinkUp.git
cd CodeAlpha_LinkUp
`

**2. Create and activate a virtual environment**
`bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
`

**3. Install dependencies**
`bash
pip install django
`

**4. Apply database migrations**
`bash
python manage.py makemigrations
python manage.py migrate
`

**5. Create a superuser (Admin access)**
`bash
python manage.py createsuperuser
`

**6. Spin up the development server**
`bash
python manage.py runserver
`

Once the server is running, navigate to `http://127.0.0.1:8000/` in your browser to view the platform. You can access the master dashboard at `http://127.0.0.1:8000/admin/`.


