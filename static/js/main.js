document.addEventListener('DOMContentLoaded', () => {
    
    // Function to get CSRF token from cookies
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');

    // Event Delegation for dynamic interactivity
    document.body.addEventListener('click', (e) => {
        
        // 1. Like Button Logic
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            const postId = likeBtn.dataset.postId;
            if (!postId) return;

            const postCard = likeBtn.closest('.post-card, .card');
            const likeCountDisplay = postCard ? postCard.querySelector('.like-count-display') : null;

            // Fetch to backend
            fetch(`/like/${postId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error liking post:', data.error);
                } else {
                    if (data.liked) {
                        likeBtn.classList.add('liked');
                        likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Liked';
                    } else {
                        likeBtn.classList.remove('liked');
                        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Like';
                    }
                    if (likeCountDisplay) {
                        likeCountDisplay.textContent = `${data.likes_count} Like${data.likes_count !== 1 ? 's' : ''}`;
                    }
                }
            })
            .catch(err => console.error(err));
        }

        // 2. Follow Button Logic
        const followBtn = e.target.closest('.follow-btn');
        if (followBtn) {
            e.preventDefault();
            const userId = followBtn.dataset.userId;
            if (!userId) return;

            const isCurrentlyFollowing = followBtn.classList.contains('following');
            const willBeFollowing = !isCurrentlyFollowing;

            // Optimistic UI Update: Button state
            if (willBeFollowing) {
                followBtn.classList.add('following', 'btn-outline');
                followBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Following';
            } else {
                followBtn.classList.remove('following', 'btn-outline');
                followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
            }

            // Optimistic UI Update: Numbers
            const followersDisplays = document.querySelectorAll(`.followers-count-display[data-user-id="${userId}"]`);
            followersDisplays.forEach(el => {
                let currentCount = parseInt(el.textContent) || 0;
                el.textContent = willBeFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);
            });

            const myFollowingDisplays = document.querySelectorAll('.my-following-count-display');
            myFollowingDisplays.forEach(el => {
                let currentCount = parseInt(el.textContent) || 0;
                el.textContent = willBeFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);
            });

            // Fetch to backend
            fetch(`/profiles/follow/${userId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error following user:', data.error);
                } else {
                    // Sync with actual server counts just to be perfectly accurate
                    followersDisplays.forEach(el => {
                        el.textContent = data.followers_count;
                    });
                    
                    myFollowingDisplays.forEach(el => {
                        el.textContent = data.following_count;
                    });
                }
            })
            .catch(err => {
                console.error(err);
            });
        }

        // 3. Delete Post Button Logic
        const deletePostBtn = e.target.closest('.delete-post-btn');
        if (deletePostBtn) {
            e.preventDefault();
            const postId = deletePostBtn.dataset.postId;
            if (!postId) return;

            if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                fetch(`/posts/${postId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                    }
                })
                .then(response => {
                    if (response.redirected) {
                        window.location.href = response.url;
                    } else if (response.ok) {
                        // Remove the post card from DOM
                        const postCard = deletePostBtn.closest('.post-card, .card');
                        if (postCard) {
                            postCard.style.transition = 'opacity 0.3s, transform 0.3s';
                            postCard.style.opacity = '0';
                            postCard.style.transform = 'scale(0.95)';
                            setTimeout(() => postCard.remove(), 300);
                        }
                    } else {
                        return response.json().then(data => {
                            alert(data.error || 'Failed to delete post.');
                        });
                    }
                })
                .catch(err => console.error(err));
            }
        }

        // 4. Delete Comment Button Logic (inside modal)
        const deleteCommentBtn = e.target.closest('.delete-comment-btn');
        if (deleteCommentBtn) {
            e.preventDefault();
            const commentId = deleteCommentBtn.dataset.commentId;
            if (!commentId) return;

            if (confirm('Delete this comment?')) {
                fetch(`/comments/${commentId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const commentItem = deleteCommentBtn.closest('.comment-item');
                        if (commentItem) {
                            commentItem.style.transition = 'opacity 0.3s';
                            commentItem.style.opacity = '0';
                            setTimeout(() => commentItem.remove(), 300);
                        }
                    } else {
                        alert(data.error || 'Failed to delete comment.');
                    }
                })
                .catch(err => console.error(err));
            }
        }
    });

    // 5. Comments Modal Logic
    const commentsModal = document.getElementById('commentsModal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    const modalPostId = document.getElementById('modalPostId');
    const commentInput = document.getElementById('commentInput');

    // We need the current username for showing delete buttons on own comments
    const currentUsername = document.body.dataset.currentUser || '';

    // Open Modal
    document.body.addEventListener('click', (e) => {
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            e.preventDefault();
            const postId = commentBtn.dataset.postId;
            if (!postId) return;

            modalPostId.value = postId;
            commentsList.innerHTML = '<p style="text-align:center; color:#666;">Loading comments...</p>';
            commentsModal.style.display = 'flex';

            // Fetch comments
            fetch(`/comments/${postId}/`)
            .then(response => response.json())
            .then(data => {
                commentsList.innerHTML = '';
                if (data.comments && data.comments.length > 0) {
                    data.comments.forEach(c => {
                        const deleteBtn = c.author === currentUsername
                            ? `<button class="delete-comment-btn" data-comment-id="${c.id}" title="Delete comment" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;"><i class="fa-regular fa-trash-can"></i></button>`
                            : '';
                        commentsList.innerHTML += `
                            <div class="comment-item">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="comment-author">${c.author}</span>
                                    <span class="comment-date">${c.created_at}</span>
                                    ${deleteBtn}
                                </div>
                                <p class="comment-text">${c.text}</p>
                            </div>
                        `;
                    });
                } else {
                    commentsList.innerHTML = '<p style="text-align:center; color:#666;">No comments yet. Be the first!</p>';
                }
            })
            .catch(err => {
                console.error(err);
                commentsList.innerHTML = '<p style="text-align:center; color:red;">Error loading comments.</p>';
            });
        }
    });

    // Close Modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            commentsModal.style.display = 'none';
        });
    }

    // Close Modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === commentsModal) {
            commentsModal.style.display = 'none';
        }
    });

    // Submit Comment
    if (commentForm) {
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const postId = modalPostId.value;
            const text = commentInput.value.trim();
            if (!text || !postId) return;

            fetch(`/comments/${postId}/add/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                } else {
                    commentInput.value = '';
                    // Remove "No comments yet" if it's there
                    if (commentsList.innerHTML.includes('No comments yet')) {
                        commentsList.innerHTML = '';
                    }
                    // Append new comment (current user can always delete their own)
                    commentsList.innerHTML += `
                        <div class="comment-item">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="comment-author">${data.author}</span>
                                <span class="comment-date">${data.created_at}</span>
                                <button class="delete-comment-btn" data-comment-id="${data.id}" title="Delete comment" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                            <p class="comment-text">${data.text}</p>
                        </div>
                    `;
                    // Scroll to bottom
                    commentsList.scrollTop = commentsList.scrollHeight;
                    
                    // Update comment count display on the post
                    const postCard = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
                    if (postCard) {
                        const card = postCard.closest('.post-card, .card');
                        if (card) {
                            const countDisplay = card.querySelector('.comment-count-display');
                            if (countDisplay) {
                                const currentText = countDisplay.textContent;
                                const match = currentText.match(/(\d+)/);
                                if (match) {
                                    const newCount = parseInt(match[1]) + 1;
                                    countDisplay.textContent = `${newCount} Comment${newCount !== 1 ? 's' : ''}`;
                                }
                            }
                        }
                    }
                }
            })
            .catch(err => console.error(err));
        });
    }

    // 6. Avatar preview on edit profile page
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.querySelector('.edit-avatar-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${event.target.result}" alt="Avatar preview" class="avatar-lg">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

});
