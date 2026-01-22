// @ts-nocheck

document.addEventListener('DOMContentLoaded', function () {
    var user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    var currentTab = 'online';
    let currentChatUser = null;

    // Обновление профиля
    document.getElementById('profile-nickname').textContent = user.display_name;
    document.getElementById('profile-username').textContent = user.username;
    const avatarText = user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = avatarText;

    // Heartbeat
    function sendHeartbeat() {
        if (!user || !user.id) return;

        fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        })
            .then(() => {
                loadOnlineUsers();
            })
            .catch(function (err) {
                console.warn('Heartbeat failed:', err);
            });
    }

    sendHeartbeat();
    setInterval(sendHeartbeat, 30000);

    // Вкладки
    var tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabButtons.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            loadFriends(currentTab);
        });
    });

    // Поиск друзей
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            if (query === '') {
                loadFriends(currentTab);
            } else {
                searchFriends(query);
            }
        });
    }

    // Загрузка друзей
    function loadFriends(tab) {
        if (tab === 'pending') {
            fetch('/api/friend-requests/pending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            })
                .then(function (res) {
                    if (res.status === 401) {
                        localStorage.removeItem('user');
                        window.location.href = 'index.html';
                        return;
                    }
                    return res.json();
                })
                .then(function (data) {
                    renderFriends(data, tab);
                })
                .catch(function (err) {
                    console.error('Не удалось загрузить:', err);
                    renderFriends([], tab);
                });
        } else {
            let url = `/api/friends?userId=${encodeURIComponent(user.id)}`;
            if (tab === 'online') {
                url += '&status=online';
            }

            fetch(url)
                .then(function (res) {
                    if (res.status === 401) {
                        localStorage.removeItem('user');
                        window.location.href = 'index.html';
                        return;
                    }
                    return res.json();
                })
                .then(function (allUsers) {
                    let filtered = allUsers.filter(u => u.id !== user.id);
                    if (tab === 'online') {
                        filtered = filtered.filter(u => u.is_online);
                    }
                    renderFriends(filtered, tab);
                })
                .catch(function (err) {
                    console.error('Не удалось загрузить:', err);
                    renderFriends([], tab);
                });
        }
    }

    // Поиск друзей
    function searchFriends(query) {
        fetch('/api/friends/search?q=' + encodeURIComponent(query))
            .then(res => res.json())
            .then(friends => {
                let filtered = friends.filter(u => u.id !== user.id);
                renderFriends(filtered, 'all');
            })
            .catch(err => {
                console.error('Ошибка поиска:', err);
                renderFriends([], 'all');
            });
    }

    // Добавить друга
    function addFriend(nickname) {
        fetch('/api/friends/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUsername: nickname, requesterId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`Заявка отправлена ${nickname}!`, true);
                    loadFriends(currentTab);
                } else {
                    showNotification(data.error || 'Не удалось добавить друга', false);
                }
            })
            .catch(err => {
                showNotification('Нет связи с сервером', false);
            });
    }

    // Принять заявку
    function acceptFriendRequest(requestId) {
        fetch('/api/friend-requests/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification('Заявка принята!', true);
                    loadFriends('pending');
                } else {
                    showNotification(data.error || 'Ошибка', false);
                }
            });
    }

    // Отклонить заявку
    function rejectFriendRequest(requestId) {
        fetch('/api/friend-requests/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification('Заявка отклонена', false);
                    loadFriends('pending');
                } else {
                    showNotification(data.error || 'Ошибка', false);
                }
            });
    }

    // Отображение друзей
    function renderFriends(data, tab) {
        var list = document.getElementById('friendsList');
        if (!list) return;

        list.innerHTML = '';

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет пользователей</div>';
            return;
        }

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var isOnline = false;
            var displayName = '';
            var username = '';
            var userId = '';

            if (item.display_name) {
                displayName = item.display_name;
                username = item.username;
                isOnline = item.is_online || false;
                userId = item.id;
            } else if (item.from_user) {
                displayName = item.from_user.display_name;
                username = item.from_user.username;
                isOnline = item.from_user.is_online || false;
                userId = item.from_user.id;
            }

            if (!displayName || !userId) continue;

            var friendItem = document.createElement('div');
            friendItem.className = 'friend-item';

            var avatar = document.createElement('div');
            avatar.className = 'friend-avatar' + (isOnline ? '' : ' offline');
            avatar.textContent = displayName.charAt(0).toUpperCase();

            var info = document.createElement('div');
            info.className = 'friend-info';
            var name = document.createElement('div');
            name.className = 'friend-name';
            name.textContent = displayName;
            var status = document.createElement('div');
            status.className = 'friend-status' + (isOnline ? '' : ' offline');
            status.textContent = isOnline ? 'В сети' : 'Не в сети';

            var actions = document.createElement('div');
            actions.className = 'friend-actions';

            if (tab === 'pending') {
                var acceptBtn = document.createElement('button');
                acceptBtn.className = 'message-btn';
                acceptBtn.style.background = '#43b581';
                acceptBtn.textContent = 'Принять';
                acceptBtn.addEventListener('click', (function (reqId) {
                    return function () {
                        acceptFriendRequest(reqId);
                    };
                })(item.id));

                var rejectBtn = document.createElement('button');
                rejectBtn.className = 'message-btn';
                rejectBtn.style.background = '#ed4245';
                rejectBtn.textContent = 'Отклонить';
                rejectBtn.addEventListener('click', (function (reqId) {
                    return function () {
                        rejectFriendRequest(reqId);
                    };
                })(item.id));

                actions.appendChild(acceptBtn);
                actions.appendChild(rejectBtn);
            } else {
                var msgBtn = document.createElement('button');
                msgBtn.className = 'message-btn';
                msgBtn.textContent = 'Написать';
                msgBtn.addEventListener('click', function () {
                    openChat({
                        id: userId,
                        display_name: displayName,
                        username: username,
                        is_online: isOnline
                    });
                });
                actions.appendChild(msgBtn);
            }

            info.appendChild(name);
            info.appendChild(status);
            friendItem.appendChild(avatar);
            friendItem.appendChild(info);
            friendItem.appendChild(actions);
            list.appendChild(friendItem);
        }
    }

    // Загрузка онлайн-пользователей
    function loadOnlineUsers(query = '') {
        if (!user || !user.id) return;

        let url = '/api/online';
        if (query) {
            url += '?q=' + encodeURIComponent(query);
        }

        fetch(url)
            .then(function (res) {
                if (res.status === 401) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                    return;
                }
                return res.json();
            })
            .then(function (users) {
                if (!users) return;

                var list = document.getElementById('onlineUsers');
                if (!list) return;

                list.innerHTML = '';
                for (var i = 0; i < users.length; i++) {
                    var u = users[i];
                    var li = document.createElement('li');
                    li.className = 'member-item';
                    li.innerHTML = `
            <div class="member-avatar-container">
              <div class="member-avatar">${u.display_name.charAt(0).toUpperCase()}</div>
              <div class="member-status${u.is_online ? '' : ' offline'}"></div>
            </div>
            <div class="member-info">
              <div class="member-nickname">${escapeHtml(u.display_name)}</div>
              <div class="member-username">${escapeHtml(u.username)}</div>
            </div>
          `;
                    list.appendChild(li);
                }

                var countEl = document.getElementById('membersCount');
                if (countEl) {
                    countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
                }
            })
            .catch(function (err) {
                console.warn('Не удалось загрузить онлайн-пользователей:', err);
            });
    }

    // Поиск в правой панели
    var membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', function () {
            const query = this.value.trim();
            loadOnlineUsers(query);
        });
    }

    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);

    loadFriends(currentTab);

    // Показываем вкладку друзей по умолчанию
    setTimeout(() => {
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.search-box').style.display = 'flex';
    }, 100);

    // === ЧАТ ===

    function openChat(chatUser) {
        if (!chatUser || !chatUser.id) return;

        currentChatUser = chatUser;

        // Скрываем список друзей и заголовок
        document.getElementById('friendsList').style.display = 'none';
        document.querySelector('.friends-header').style.display = 'none';

        // Показываем чат
        document.getElementById('chatContainer').style.display = 'flex';

        // Обновляем заголовок
        document.querySelector('.profile-chat-nickname').textContent = chatUser.display_name;
        const statusEl = document.querySelector('.profile-chat-status');
        const indicatorEl = document.querySelector('.profile-chat-status-indicator');

        if (chatUser.is_online) {
            statusEl.textContent = 'В сети';
            statusEl.className = 'profile-chat-status';
            indicatorEl.style.background = 'var(--online)';
        } else {
            statusEl.textContent = 'Не в сети';
            statusEl.className = 'profile-chat-status offline';
            indicatorEl.style.background = 'var(--offline)';
        }

        document.querySelector('.profile-chat-avatar').textContent = chatUser.display_name.charAt(0).toUpperCase();

        // Загружаем историю
        loadChatHistory(chatUser.id);
    }

    function loadChatHistory(userId) {
        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                const list = document.getElementById('chatMessages');
                list.innerHTML = '';

                messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = `message${msg.is_own ? ' own' : ''}`;

                    const textDiv = document.createElement('div');
                    textDiv.className = 'message-text';
                    textDiv.textContent = msg.text;

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'message-timestamp';
                    timeDiv.textContent = msg.timestamp;

                    div.appendChild(textDiv);
                    div.appendChild(timeDiv);
                    list.appendChild(div);
                });

                list.scrollTop = list.scrollHeight;
            });
    }

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const text = document.getElementById('messageInput').value.trim();
        if (!text || !currentChatUser) return;

        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_user_id: user.id,
                to_user_id: currentChatUser.id,
                text: text
            })
        })
            .then(() => {
                document.getElementById('messageInput').value = '';
                loadChatHistory(currentChatUser.id);
            })
            .catch(err => {
                showNotification('Ошибка отправки', false);
            });
    }

    document.getElementById('backToFriendsBtn').addEventListener('click', function () {
        currentChatUser = null;
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.friends-header').style.display = 'block';
    });

    // === Модальные окна ===
    const modal = document.getElementById('addFriendModal');
    const openModalBtn = document.getElementById('addFriendBtn');
    const closeModalBtn = document.getElementById('cancelAddFriend');
    const confirmBtn = document.getElementById('confirmAddFriend');
    const friendInput = document.getElementById('friendUsername');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', function (e) {
            e.preventDefault();
            friendInput.value = '';
            modal.classList.add('show');
            friendInput.focus();
        });
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            const nickname = friendInput.value.trim();
            if (nickname && nickname.startsWith('@')) {
                addFriend(nickname);
                closeModal();
            } else {
                showNotification('Юзернейм должен начинаться с @', false);
            }
        });
    }

    // Поддержка Enter в модальных окнах
    document.getElementById('friendUsername').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmAddFriend').click();
        }
    });

    // Модальное окно редактирования профиля
    document.getElementById('userProfile').addEventListener('click', function () {
        document.getElementById('editDisplayName').value = user.display_name;
        document.getElementById('editProfileModal').classList.add('show');
    });

    document.getElementById('saveEditProfile').addEventListener('click', function () {
        const newDisplayName = document.getElementById('editDisplayName').value.trim();
        if (!newDisplayName || newDisplayName.length < 2) {
            showNotification('Ник должен быть от 2 символов', false);
            return;
        }

        fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, displayName: newDisplayName })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    user.display_name = newDisplayName;
                    localStorage.setItem('user', JSON.stringify(user));
                    document.getElementById('profile-nickname').textContent = newDisplayName;
                    document.getElementById('userAvatar').textContent = newDisplayName.charAt(0).toUpperCase();
                    document.getElementById('editProfileModal').classList.remove('show');
                    showNotification('Ник обновлён!', true);
                } else {
                    showNotification(data.error || 'Ошибка обновления', false);
                }
            })
            .catch(err => {
                showNotification('Нет связи с сервером', false);
            });
    });

    document.getElementById('cancelEditProfile').addEventListener('click', function () {
        document.getElementById('editProfileModal').classList.remove('show');
    });

    document.getElementById('editDisplayName').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('saveEditProfile').click();
        }
    });

    // === Модальное окно подтверждения выхода ===
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            logoutConfirmModal.classList.add('show');
        });
    }

    if (cancelLogout) {
        cancelLogout.addEventListener('click', function () {
            logoutConfirmModal.classList.remove('show');
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener('click', function () {
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            })
                .then(function () {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                })
                .catch(function (err) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
        });
    }

    // Поддержка Enter в окне подтверждения выхода
    document.addEventListener('keydown', function (e) {
        if (logoutConfirmModal.classList.contains('show') && e.key === 'Enter') {
            e.preventDefault();
            confirmLogout.click();
        }
    });

    // Закрытие модальных окон по клику на оверлей
    ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(modalId => {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.addEventListener('click', function (e) {
                if (e.target === modalEl) {
                    modalEl.classList.remove('show');
                }
            });
        }
    });

    // Закрытие по Esc
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.classList.contains('show')) {
                    el.classList.remove('show');
                }
            });
        }
    });

    // Система уведомлений
    let notificationContainer = null;

    function createNotificationContainer() {
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        return notificationContainer;
    }

    function showNotification(text, isSuccess = false) {
        const container = createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = `notification ${isSuccess ? 'success' : 'error'}`;

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = isSuccess
            ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586l9.293-9.293 1.414 1.414L9 19.414z"/></svg>'
            : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

        const textEl = document.createElement('div');
        textEl.className = 'notification-text';
        textEl.textContent = text;

        const progress = document.createElement('div');
        progress.className = 'notification-progress';

        notification.appendChild(icon);
        notification.appendChild(textEl);
        notification.appendChild(progress);
        container.appendChild(notification);

        setTimeout(() => {
            container.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) {
                container.classList.remove('show');
            }
        }, 5000);
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});