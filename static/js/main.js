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
        
        // Like Button Logic
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

        //  Follow Button Logic
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

        //  Delete Post Button Logic
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

        //  Delete Comment Button Logic (inside comment modal)
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

    // Comments Modal Logic
    const commentsModal = document.getElementById('commentsModal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    const modalPostId = document.getElementById('modalPostId');
    const commentInput = document.getElementById('commentInput');

    //   Getting current username for showing delete buttons on their own comments
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

    //  Avatar preview on edit profile page
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

   
    // NOTIFICATION SYSTEM

    const notifBellBtn   = document.getElementById('notifBellBtn');
    const notifDropdown  = document.getElementById('notifDropdown');
    const notifBellWrap  = document.getElementById('notifBellWrap');
    const notifBadge     = document.getElementById('notifBadge');
    const notifList      = document.getElementById('notifList');
    const notifEmpty     = document.getElementById('notifEmpty');
    const notifMarkAllBtn = document.getElementById('notifMarkAllBtn');

    // Only run if the bell is present (i.e. user is authenticated)
    if (!notifBellBtn) return;

    // Track the last known unread count so we can fire toasts only for truly new ones
    let lastUnreadCount = 0;
    let lastNotifIds = new Set();
    let isDropdownOpen = false;

    // ── Toast helper ──────────────────────────────────────────
    function createToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(notif) {
        const container = createToastContainer();

        const colorMap = {
            'like':    '#ef4444',
            'comment': '#2563eb',
            'follow':  '#10b981',
            'message': '#8b5cf6',
        };
        const color = colorMap[notif.notification_type] || '#6b7280';

        const titleMap = {
            'like':    'New Like',
            'comment': 'New Comment',
            'follow':  'New Follower',
            'message': 'New Message',
        };
        const title = titleMap[notif.notification_type] || 'Notification';

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = color;
        toast.innerHTML = `
            <div class="toast-icon" style="background: ${color};">
                <i class="fa-solid ${notif.icon}"></i>
            </div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-msg">${notif.message}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        // Navigate on click (anywhere except close btn)
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.toast-close')) {
                handleNotifClick(notif);
                dismissToast(toast);
            }
        });

        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast(toast);
        });

        container.appendChild(toast);

        // Auto-dismiss after 5 s
        setTimeout(() => dismissToast(toast), 5000);
    }

    function dismissToast(toast) {
        if (!toast.parentNode) return;
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 350);
    }

    // ── Navigate on notification click ────────────────────────
    function handleNotifClick(notif) {
        if (notif.notification_type === 'message') {
            window.location.href = `/chat/${notif.sender}/`;
            return;
        }

        // Mark as read (fire-and-forget)
        fetch(`/notifications/${notif.id}/read/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken }
        }).catch(() => {});

        if (notif.notification_type === 'follow') {
            window.location.href = `/profiles/${notif.sender}/`;
        } else if (notif.post_id) {
            window.location.href = `/#post-${notif.post_id}`;
        }
    }

    // ── Render notification list ──────────────────────────────
    function renderNotifications(notifications) {
        // Remove all existing .notif-item elements (keep notifEmpty)
        notifList.querySelectorAll('.notif-item').forEach(el => el.remove());

        if (!notifications || notifications.length === 0) {
            if (notifEmpty) notifEmpty.style.display = 'flex';
            return;
        }

        if (notifEmpty) notifEmpty.style.display = 'none';

        notifications.forEach((n, index) => {
            const item = document.createElement('div');
            item.className = `notif-item ${n.is_read ? '' : 'unread'}`;
            item.dataset.notifId = n.id;
            item.style.animationDelay = `${index * 40}ms`;

            const colorMap = {
                'like':    '#ef4444',
                'comment': '#2563eb',
                'follow':  '#10b981',
            };
            const color = colorMap[n.notification_type] || '#6b7280';

            let avatarHtml;
            if (n.sender_avatar) {
                avatarHtml = `
                    <div class="notif-avatar-wrap">
                        <img src="${n.sender_avatar}" class="notif-avatar" alt="${n.sender}">
                        <div class="notif-type-icon" style="background: ${color};">
                            <i class="fa-solid ${n.icon}"></i>
                        </div>
                    </div>`;
            } else {
                avatarHtml = `
                    <div class="notif-icon-wrap" style="background: ${color};">
                        <i class="fa-solid ${n.icon}"></i>
                    </div>`;
            }

            item.innerHTML = `
                ${avatarHtml}
                <div class="notif-body">
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-time">${n.time_ago}</div>
                </div>
            `;

            item.addEventListener('click', () => {
                item.classList.remove('unread');
                handleNotifClick(n);
                // Update badge count optimistically
                const currentBadgeCount = parseInt(notifBadge.textContent) || 0;
                if (!n.is_read && currentBadgeCount > 0) {
                    updateBadge(currentBadgeCount - 1);
                }
                n.is_read = true;
            });

            notifList.appendChild(item);
        });
    }

    // ── Update badge ─────────────────────────────────────────
    function updateBadge(count) {
        if (count > 0) {
            notifBadge.textContent = count > 99 ? '99+' : count;
            notifBadge.style.display = '';
            notifBellWrap.classList.add('has-unread');
        } else {
            notifBadge.style.display = 'none';
            notifBellWrap.classList.remove('has-unread');
        }
    }

    // ── Fetch notifications from server ───────────────────────
    function fetchNotifications(showToasts = false) {
        fetch('/notifications/')
            .then(res => res.json())
            .then(data => {
                updateBadge(data.unread_count);

                if (showToasts) {
                    // Show toasts for brand-new notifications (not seen before)
                    data.notifications.forEach(n => {
                        if (!n.is_read && !lastNotifIds.has(n.id)) {
                            showToast(n);
                        }
                    });
                }

                // Update set of known IDs
                lastNotifIds = new Set(data.notifications.map(n => n.id));
                lastUnreadCount = data.unread_count;

                // If dropdown is currently open, refresh it live
                if (isDropdownOpen) {
                    renderNotifications(data.notifications);
                }
            })
            .catch(() => {}); // Silently fail (user might not be logged in)
    }

    // ── Open / close dropdown ─────────────────────────────────
    function openDropdown() {
        isDropdownOpen = true;
        notifDropdown.classList.add('open');
        notifBellBtn.setAttribute('aria-expanded', 'true');
        notifDropdown.setAttribute('aria-hidden', 'false');

        // Fetch & render latest notifications
        fetch('/notifications/')
            .then(res => res.json())
            .then(data => {
                updateBadge(data.unread_count);
                renderNotifications(data.notifications);
                lastNotifIds = new Set(data.notifications.map(n => n.id));
                lastUnreadCount = data.unread_count;
            })
            .catch(() => {});
    }

    function closeDropdown() {
        isDropdownOpen = false;
        notifDropdown.classList.remove('open');
        notifBellBtn.setAttribute('aria-expanded', 'false');
        notifDropdown.setAttribute('aria-hidden', 'true');
    }

    notifBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !notifBellWrap.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDropdownOpen) closeDropdown();
    });

    // ── Mark all as read ──────────────────────────────────────
    if (notifMarkAllBtn) {
        notifMarkAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fetch('/notifications/mark-all-read/', {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken }
            })
            .then(res => res.json())
            .then(() => {
                // Clear all unread styling
                notifList.querySelectorAll('.notif-item.unread').forEach(el => {
                    el.classList.remove('unread');
                });
                updateBadge(0);
            })
            .catch(() => {});
        });
    }

    // ── Initial fetch ──────────────
    fetchNotifications(false); // On page load: don't show toasts for existing unread
    
    // ── WebSockets for Real-Time Notifications ──────────────
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const notifSocket = new WebSocket(`${protocol}//${window.location.host}/ws/notifications/`);
    
    notifSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        if (data.type === 'chat_notification') {
            const badge = document.getElementById('chatBadge');
            if (badge) {
                const count = data.notification.unread_count;
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
            // Show toast if there's a sender (new message)
            if (data.notification.sender && data.notification.is_new) {
                showToast(data.notification);
            }
            return;
        }

        // data is a single notification object
        
        // Don't duplicate if we already know about it
        if (!lastNotifIds.has(data.id)) {
            lastNotifIds.add(data.id);
            lastUnreadCount += 1;
            updateBadge(lastUnreadCount);
            
            // Immediately show toast
            showToast(data);
            
            // If dropdown is open, re-render to inject it at top
            if (isDropdownOpen) {
                // Easiest is to just re-fetch the list to guarantee correct ordering and max 30 items
                fetchNotifications(false);
            }
        }
    };

    notifSocket.onclose = function(e) {
        console.error('Notification socket closed unexpectedly');
        // Fallback to polling if websocket dies
        setInterval(() => fetchNotifications(true), 30000);
    };

    // ── Create Post Modal Logic ────────────────────────────────
    const createPostTriggers = document.querySelectorAll('.create-post-trigger');
    const createPostModal = document.getElementById('createPostModal');
    if (createPostModal) {
        const closeCreatePostModal = document.getElementById('closeCreatePostModal');
        const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
        const postModalSections = document.querySelectorAll('.post-modal-section');
        const createPostContent = document.getElementById('createPostContent');

        // Image section elements
        const postImageSection = document.getElementById('postImageSection');
        const modalImageInput = document.getElementById('modalImageInput');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const postImagePreview = document.getElementById('postImagePreview');
        const removeImageBtn = document.getElementById('removeImageBtn');
        const imageInputPrompt = document.getElementById('imageInputPrompt');

        // Open modal
        createPostTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                createPostModal.style.display = 'flex';
                const tab = trigger.dataset.tab;
                if (tab) {
                    activateModalTab(tab);
                } else {
                    // Default to focus on textarea if no specific tab clicked
                    createPostContent.focus();
                }
            });
        });

        // Close modal
        closeCreatePostModal.addEventListener('click', () => {
            createPostModal.style.display = 'none';
        });

        // Close on outside click (shares logic with commentsModal if needed, but safer to add here)
        window.addEventListener('click', (e) => {
            if (e.target === createPostModal) {
                createPostModal.style.display = 'none';
            }
        });

        // Tab switching
        modalTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                activateModalTab(btn.dataset.tab);
            });
        });

        function activateModalTab(tabId) {
            // Update active button state
            modalTabBtns.forEach(btn => {
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Show corresponding section
            postModalSections.forEach(section => {
                section.style.display = 'none';
            });
            
            if (tabId === 'image') {
                document.getElementById('postImageSection').style.display = 'block';
            } else if (tabId === 'attachment') {
                document.getElementById('postAttachmentSection').style.display = 'block';
            } else if (tabId === 'live') {
                document.getElementById('postLiveSection').style.display = 'block';
            }
        }

        // Image/Video upload preview logic
        const postVideoPreview = document.getElementById('postVideoPreview');
        const modalErrorMsg = document.getElementById('modalErrorMsg');
        
        if (postImageSection) {
            postImageSection.addEventListener('click', (e) => {
                if (e.target.closest('#removeImageBtn')) return;
                modalImageInput.click();
            });
        }

        if (modalImageInput) {
            modalImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (modalErrorMsg) modalErrorMsg.style.display = 'none';
                
                if (file) {
                    // Check file size (50MB = 50 * 1024 * 1024)
                    if (file.size > 50 * 1024 * 1024) {
                        if (modalErrorMsg) {
                            modalErrorMsg.textContent = "File size cannot exceed 50MB.";
                            modalErrorMsg.style.display = 'block';
                        }
                        modalImageInput.value = '';
                        return;
                    }

                    const isVideo = file.type.startsWith('video/');
                    const reader = new FileReader();
                    
                    reader.onload = (event) => {
                        if (isVideo) {
                            postImagePreview.style.display = 'none';
                            if (postVideoPreview) {
                                postVideoPreview.src = event.target.result;
                                postVideoPreview.style.display = 'block';
                            }
                        } else {
                            if (postVideoPreview) postVideoPreview.style.display = 'none';
                            postImagePreview.src = event.target.result;
                            postImagePreview.style.display = 'block';
                        }
                        
                        imagePreviewContainer.style.display = 'block';
                        imageInputPrompt.style.display = 'none';
                        postImageSection.style.padding = '0'; // Remove padding to let image fill nicely
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the file input again
                modalImageInput.value = '';
                postImagePreview.src = '#';
                postImagePreview.style.display = 'none';
                if (postVideoPreview) {
                    postVideoPreview.src = '';
                    postVideoPreview.style.display = 'none';
                }
                if (modalErrorMsg) modalErrorMsg.style.display = 'none';
                
                imagePreviewContainer.style.display = 'none';
                imageInputPrompt.style.display = 'block';
                postImageSection.style.padding = '16px';
            });
        }
        
        // Form submission behavior
        const createPostForm = document.getElementById('createPostForm');
        if (createPostForm) {
            createPostForm.addEventListener('submit', (e) => {
                // If it's a standard form submission, let it proceed to global_feed
                // Optionally we could show a loading spinner
                const submitBtn = createPostForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Posting...';
                    submitBtn.disabled = true;
                }
            });
        }
    }
});
