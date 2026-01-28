// friends.js — содержит всё, что связано с друзьями, онлайн, заявками
function createFriendsModule(user, currentTabRef, unreadMessagesRef, updateUnreadBadgesFn) {
    const { currentTab, setCurrentTab } = currentTabRef;
    const { unreadMessages } = unreadMessagesRef;

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    function showNotification(text, isSuccess = false) {
        const container = document.getElementById('notificationContainer') || (() => {
            const c = document.createElement('div');
            c.id = 'notificationContainer';
            c.className = 'notification-container';
            document.body.appendChild(c);
            return c;
        })();

        const n = document.createElement('div');
        n.className = `notification ${isSuccess ? 'success' : 'error'}`;
        n.innerHTML = `
      <div class="notification-icon">
        ${isSuccess
                ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586l9.293-9.293 1.414 1.414L9 19.414z"/></svg>'
                : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
            }
      </div>
      <div class="notification-text">${text}</div>
      <div class="notification-progress"></div>
    `;
        container.appendChild(n);
        setTimeout(() => container.classList.add('show'), 10);
        setTimeout(() => {
            n.remove();
            if (container.children.length === 0) container.classList.remove('show');
        }, 5000);
    }

    // === ЗАГРУЗКА ДРУЗЕЙ ===

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

    // === ОТОБРАЖЕНИЕ ===

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
                        // Передаём в chat.js через глобальный вызов
                        window.openChat(uid, dname, uname, online);
                    };
                })(userId, displayName, username, isOnline));
                actions.appendChild(msgBtn);
            }

            friendItem.appendChild(avatarContainer);
            friendItem.appendChild(info);
            friendItem.appendChild(actions);
            list.appendChild(friendItem);
        }

        updateUnreadBadgesFn();
    }

    // === ОНЛАЙН ПОЛЬЗОВАТЕЛИ ===

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

                updateUnreadBadgesFn();
            })
            .catch(function (err) {
                console.warn('Не удалось загрузить онлайн-пользователей:', err);
            });
    }

    // === ЭКСПОРТ ===

    return {
        loadFriends,
        searchFriends,
        addFriend,
        loadOnlineUsers,
        renderFriends
    };
}