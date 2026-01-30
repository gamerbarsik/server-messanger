import { showNotification } from '../utils/notifications.js';
import { openChat } from './chat.js';

/**
 * Загружает друзей по вкладке
 */
export function loadFriends(tab, user, currentTabRef, updateUnreadBadgesFn) {
    if (tab === 'pending') {
        fetch('/api/friend-requests/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                    return;
                }
                return res.json();
            })
            .then(data => renderFriends(data, tab, user, updateUnreadBadgesFn))
            .catch(err => {
                console.error('Не удалось загрузить:', err);
                renderFriends([], tab, user, updateUnreadBadgesFn);
            });
    } else {
        let url = `/api/friends?userId=${encodeURIComponent(user.id)}`;
        if (tab === 'online') {
            url += '&status=online';
        }

        fetch(url)
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                    return;
                }
                return res.json();
            })
            .then(allUsers => {
                let filtered = allUsers.filter(u => u.id !== user.id);
                if (tab === 'online') {
                    filtered = filtered.filter(u => u.is_online);
                }
                renderFriends(filtered, tab, user, updateUnreadBadgesFn);
            })
            .catch(err => {
                console.error('Не удалось загрузить:', err);
                renderFriends([], tab, user, updateUnreadBadgesFn);
            });
    }
}

/**
 * Поиск друзей
 */
export function searchFriends(query, user, updateUnreadBadgesFn) {
    fetch('/api/friends/search?q=' + encodeURIComponent(query))
        .then(res => res.json())
        .then(friends => {
            let filtered = friends.filter(u => u.id !== user.id);
            renderFriends(filtered, 'all', user, updateUnreadBadgesFn);
        })
        .catch(err => {
            console.error('Ошибка поиска:', err);
            renderFriends([], 'all', user, updateUnreadBadgesFn);
        });
}

/**
 * Добавить друга
 */
export function addFriend(nickname, user, currentTab) {
    fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: nickname, requesterId: user.id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification(`Заявка отправлена ${nickname}!`, true);
                loadFriends(currentTab, user, { currentTab }, () => { }); // updateUnreadBadges временно пустой
            } else {
                showNotification(data.error || 'Не удалось добавить друга', false);
            }
        })
        .catch(err => {
            showNotification('Нет связи с сервером', false);
        });
}

/**
 * Принять заявку
 */
export function acceptFriendRequest(requestId, user) {
    fetch('/api/friend-requests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId, userId: user.id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification('Заявка принята!', true);
                loadFriends('pending', user, { currentTab: 'pending' }, () => { });
            } else {
                showNotification(data.error || 'Ошибка', false);
            }
        });
}

/**
 * Отклонить заявку
 */
export function rejectFriendRequest(requestId, user) {
    fetch('/api/friend-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId, userId: user.id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification('Заявка отклонена', false);
                loadFriends('pending', user, { currentTab: 'pending' }, () => { });
            } else {
                showNotification(data.error || 'Ошибка', false);
            }
        });
}

/**
 * Отображение списка друзей
 */
export function renderFriends(data, tab, user, updateUnreadBadgesFn) {
    const list = document.getElementById('friendsList');
    if (!list) return;

    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет пользователей</div>';
        return;
    }

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        let isOnline = false;
        let displayName = '';
        let username = '';
        let userId = '';

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

        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.dataset.userId = userId;

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'friend-avatar-container';

        const avatar = document.createElement('div');
        avatar.className = 'friend-avatar' + (isOnline ? '' : ' offline');
        avatar.textContent = displayName.charAt(0).toUpperCase();

        const status = document.createElement('div');
        status.className = 'member-status' + (isOnline ? '' : ' offline');

        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(status);

        const info = document.createElement('div');
        info.className = 'friend-info';
        const name = document.createElement('div');
        name.className = 'friend-name';
        name.textContent = displayName;
        const statusText = document.createElement('div');
        statusText.className = 'friend-status' + (isOnline ? '' : ' offline');
        statusText.textContent = isOnline ? 'В сети' : 'Не в сети';

        info.appendChild(name);
        info.appendChild(statusText);

        const actions = document.createElement('div');
        actions.className = 'friend-actions';

        if (tab === 'pending') {
            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'message-btn';
            acceptBtn.style.background = '#43b581';
            acceptBtn.textContent = 'Принять';
            acceptBtn.addEventListener('click', () => {
                acceptFriendRequest(item.id, user);
            });

            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'message-btn';
            rejectBtn.style.background = '#ed4245';
            rejectBtn.textContent = 'Отклонить';
            rejectBtn.addEventListener('click', () => {
                rejectFriendRequest(item.id, user);
            });

            actions.appendChild(acceptBtn);
            actions.appendChild(rejectBtn);
        } else {
            const msgBtn = document.createElement('button');
            msgBtn.className = 'message-btn';
            msgBtn.textContent = 'Написать';
            msgBtn.addEventListener('click', () => {
                openChat(userId, displayName, username, isOnline, user);
            });
            actions.appendChild(msgBtn);
        }

        friendItem.appendChild(avatarContainer);
        friendItem.appendChild(info);
        friendItem.appendChild(actions);
        list.appendChild(friendItem);
    }

    updateUnreadBadgesFn();
}