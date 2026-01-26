import { state } from '../core/state.js';
import { api } from '../core/api.js';
import { openChat } from './chat.js';
import { showNotification } from './notifications.js';

export function renderFriends(data, tab) {
    const list = document.getElementById('friendsList');
    if (!list) return;

    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет пользователей</div>';
        return;
    }

    for (const item of data) {
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

        if (!displayName || !userId || userId === state.user.id) continue;

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
                api.acceptFriendRequest(item.id, state.user.id).then(data => {
                    if (data.success) {
                        showNotification('Заявка принята!', true);
                        loadFriends('pending');
                    } else {
                        showNotification(data.error || 'Ошибка', false);
                    }
                });
            });

            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'message-btn';
            rejectBtn.style.background = '#ed4245';
            rejectBtn.textContent = 'Отклонить';
            rejectBtn.addEventListener('click', () => {
                api.rejectFriendRequest(item.id, state.user.id).then(data => {
                    if (data.success) {
                        showNotification('Заявка отклонена', false);
                        loadFriends('pending');
                    } else {
                        showNotification(data.error || 'Ошибка', false);
                    }
                });
            });

            actions.appendChild(acceptBtn);
            actions.appendChild(rejectBtn);
        } else {
            const msgBtn = document.createElement('button');
            msgBtn.className = 'message-btn';
            msgBtn.textContent = 'Написать';
            msgBtn.addEventListener('click', () => {
                openChat(userId, displayName, username, isOnline);
            });
            actions.appendChild(msgBtn);
        }

        friendItem.appendChild(avatarContainer);
        friendItem.appendChild(info);
        friendItem.appendChild(actions);
        list.appendChild(friendItem);
    }

    updateUnreadBadges();
}

export function updateUnreadBadges() {
    document.querySelectorAll('.friend-item, .member-item').forEach(item => {
        const userId = item.dataset.userId;
        const container = item.querySelector('.friend-avatar-container, .member-avatar-container');
        if (!userId || !container) return;

        const oldBadge = container.querySelector('.unread-count-badge');
        if (oldBadge) oldBadge.remove();

        if (state.unreadMessages[userId] > 0) {
            const badge = document.createElement('div');
            badge.className = 'unread-count-badge';
            badge.textContent = state.unreadMessages[userId] > 9 ? '9+' : state.unreadMessages[userId];
            container.appendChild(badge);
        }
    });
}

// Вспомогательные функции
export function loadFriends(tab) {
    if (tab === 'pending') {
        api.getPendingRequests(state.user.id).then(data => {
            renderFriends(data, tab);
        }).catch(err => {
            console.error('Не удалось загрузить:', err);
            renderFriends([], tab);
        });
    } else {
        api.getFriends(state.user.id, tab).then(allUsers => {
            let filtered = allUsers.filter(u => u.id !== state.user.id);
            if (tab === 'online') {
                filtered = filtered.filter(u => u.is_online);
            }
            renderFriends(filtered, tab);
        }).catch(err => {
            console.error('Не удалось загрузить:', err);
            renderFriends([], tab);
        });
    }
}

export function searchFriends(query) {
    api.searchFriends(query).then(friends => {
        let filtered = friends.filter(u => u.id !== state.user.id);
        renderFriends(filtered, 'all');
    }).catch(err => {
        console.error('Ошибка поиска:', err);
        renderFriends([], 'all');
    });
}

export function addFriend(nickname) {
    api.addFriend(nickname, state.user.id).then(data => {
        if (data.success) {
            showNotification(`Заявка отправлена ${nickname}!`, true);
            loadFriends(state.currentTab);
        } else {
            showNotification(data.error || 'Не удалось добавить друга', false);
        }
    }).catch(err => {
        showNotification('Нет связи с сервером', false);
    });
}

export function showNotification(text, isSuccess = false) {
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