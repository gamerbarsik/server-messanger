// @ts-nocheck

document.addEventListener('DOMContentLoaded', function () {
    var user = JSON.parse(localStorage.getItem('user'));

    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    var currentTab = 'online';
    let currentChatUser = null;
    let lastMessageTimestamps = {};
    let unreadMessages = {};
    let friendList = [];

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

            if (!displayName || !userId || userId === user.id) continue;

            var friendItem = document.createElement('div');
            friendItem.className = 'friend-item';
            friendItem.dataset.userId = userId;

            var avatarContainer = document.createElement('div');
            avatarContainer.className = 'friend-avatar-container';

            var avatar = document.createElement('div');
            avatar.className = 'friend-avatar' + (isOnline ? '' : ' offline');
            avatar.textContent = displayName.charAt(0).toUpperCase();

            var status = document.createElement('div');
            status.className = 'member-status' + (isOnline ? '' : ' offline');

            avatarContainer.appendChild(avatar);
            avatarContainer.appendChild(status);

            var info = document.createElement('div');
            info.className = 'friend-info';
            var name = document.createElement('div');
            name.className = 'friend-name';
            name.textContent = displayName;
            var statusText = document.createElement('div');
            statusText.className = 'friend-status' + (isOnline ? '' : ' offline');
            statusText.textContent = isOnline ? 'В сети' : 'Не в сети';

            info.appendChild(name);
            info.appendChild(statusText);

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
                msgBtn.addEventListener('click', (function (uid, dname, uname, online) {
                    return function () {
                        openChat(uid, dname, uname, online);
                    };
                })(userId, displayName, username, isOnline));
                actions.appendChild(msgBtn);
            }

            friendItem.appendChild(avatarContainer);
            friendItem.appendChild(info);
            friendItem.appendChild(actions);
            list.appendChild(friendItem);
        }

        updateUnreadBadges();
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
                    li.dataset.userId = u.id;

                    var avatarContainer = document.createElement('div');
                    avatarContainer.className = 'member-avatar-container';

                    var avatar = document.createElement('div');
                    avatar.className = 'member-avatar';
                    avatar.textContent = u.display_name.charAt(0).toUpperCase();

                    var status = document.createElement('div');
                    status.className = 'member-status' + (u.is_online ? '' : ' offline');

                    avatarContainer.appendChild(avatar);
                    avatarContainer.appendChild(status);

                    var info = document.createElement('div');
                    info.className = 'member-info';
                    var nickname = document.createElement('div');
                    nickname.className = 'member-nickname';
                    nickname.textContent = u.display_name;
                    var username = document.createElement('div');
                    username.className = 'member-username';
                    username.textContent = u.username;

                    info.appendChild(nickname);
                    info.appendChild(username);

                    li.appendChild(avatarContainer);
                    li.appendChild(info);
                    list.appendChild(li);
                }

                var countEl = document.getElementById('membersCount');
                if (countEl) {
                    countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
                }

                updateUnreadBadges();
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

    function openChat(userId, displayName, username, isOnline) {
        if (!userId || userId === user.id) {
            console.error('Неверный ID пользователя для чата');
            return;
        }

        currentChatUser = {
            id: userId,
            display_name: displayName,
            username: username,
            is_online: isOnline
        };

        document.getElementById('friendsList').style.display = 'none';
        document.querySelector('.friends-header').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';

        document.querySelector('.profile-chat-nickname').textContent = displayName;
        const statusEl = document.querySelector('.profile-chat-status');
        const indicatorEl = document.querySelector('.profile-chat-status-indicator');

        if (isOnline) {
            statusEl.textContent = 'В сети';
            statusEl.className = 'profile-chat-status';
            indicatorEl.style.background = 'var(--online)';
        } else {
            statusEl.textContent = 'Не в сети';
            statusEl.className = 'profile-chat-status offline';
            indicatorEl.style.background = 'var(--offline)';
        }

        document.querySelector('.profile-chat-avatar').textContent = displayName.charAt(0).toUpperCase();

        // Загружаем полную историю
        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                const list = document.getElementById('chatMessages');
                list.innerHTML = '';

                messages.forEach(msg => {
                    addMessageToChat(msg.text, msg.is_own, msg.timestamp);
                    lastMessageTimestamps[userId] = msg.timestamp + '_' + msg.message_id;
                });

                if (unreadMessages[userId] > 0) {
                    unreadMessages[userId] = 0;
                    updateUnreadBadges();
                }
            })
            .catch(err => console.error('Ошибка загрузки истории:', err));
    }

    function addMessageToChat(text, isOwn, timestamp) {
        const div = document.createElement('div');
        div.className = `message${isOwn ? ' own' : ''}`;

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-timestamp';
        timeDiv.textContent = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.appendChild(textDiv);
        div.appendChild(timeDiv);
        document.getElementById('chatMessages').appendChild(div);
        document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
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
                addMessageToChat(text, true);
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

    // === Умный polling новых сообщений ===

    function loadNewMessages(userId) {
        const lastTime = lastMessageTimestamps[userId] || '';

        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                const newMessages = messages.filter(msg => {
                    const msgTime = msg.timestamp + '_' + msg.message_id;
                    return msgTime > lastTime;
                });

                if (newMessages.length === 0) return;

                const lastMsg = newMessages[newMessages.length - 1];
                lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;

                newMessages.forEach(msg => {
                    if (!msg.is_own) {
                        unreadMessages[userId] = (unreadMessages[userId] || 0) + 1;
                        updateUnreadBadges();

                        if (!currentChatUser || currentChatUser.id !== userId) {
                            playNotificationSound();

                            const totalUnread = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
                            if (totalUnread === 1) {
                                showInfoNotification(`Получено новое сообщение`);
                            } else {
                                showInfoNotification(`У вас ${totalUnread} непрочитанных сообщений!`);
                            }
                        }
                    }
                });

                if (currentChatUser && currentChatUser.id === userId) {
                    newMessages.forEach(msg => {
                        addMessageToChat(msg.text, msg.is_own, msg.timestamp);
                    });

                    if (unreadMessages[userId] > 0) {
                        unreadMessages[userId] = 0;
                        updateUnreadBadges();
                    }
                }
            })
            .catch(err => console.warn('Ошибка загрузки новых сообщений:', err));
    }

    function loadFriendsForPolling() {
        fetch(`/api/friends?userId=${encodeURIComponent(user.id)}`)
            .then(res => res.json())
            .then(friends => {
                friendList = friends.filter(f => f.id !== user.id);
            })
            .catch(err => console.warn('Не удалось загрузить друзей для polling:', err));
    }

    // Запуск polling каждые 1.5 секунды
    loadFriendsForPolling();
    setInterval(() => {
        if (friendList.length === 0) {
            loadFriendsForPolling();
        } else {
            friendList.forEach(friend => {
                loadNewMessages(friend.id);
            });
        }
    }, 1500);

    // === Уведомления ===

    function playNotificationSound() {
        try {
            const audio = new Audio('/static/sounds/notification.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => console.warn('Звук отключён:', e));
        } catch (e) {
            console.warn('Не удалось проиграть звук:', e);
        }
    }

    function showInfoNotification(text) {
        const container = createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = 'notification info';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';

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

    function updateUnreadBadges() {
        // Обновляем в списке друзей (центральная панель)
        document.querySelectorAll('.friend-item').forEach(item => {
            const userId = item.dataset.userId;
            const avatarContainer = item.querySelector('.friend-avatar-container');
            if (!userId || !avatarContainer) return;

            // Удаляем старые счётчики
            const oldBadge = avatarContainer.querySelector('.unread-count-badge');
            if (oldBadge) oldBadge.remove();

            // Добавляем новый, если есть непрочитанные
            if (unreadMessages[userId] > 0) {
                const badge = document.createElement('div');
                badge.className = 'unread-count-badge';
                badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
                avatarContainer.appendChild(badge);
            }
        });

        // Обновляем в правой панели (онлайн-пользователи)
        document.querySelectorAll('.member-item').forEach(item => {
            const userId = item.dataset.userId;
            const avatarContainer = item.querySelector('.member-avatar-container');
            if (!userId || !avatarContainer) return;

            const oldBadge = avatarContainer.querySelector('.unread-count-badge');
            if (oldBadge) oldBadge.remove();

            if (unreadMessages[userId] > 0) {
                const badge = document.createElement('div');
                badge.className = 'unread-count-badge';
                badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
                avatarContainer.appendChild(badge);
            }
        });
    }

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