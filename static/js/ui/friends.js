import { state } from '../core/state.js';
import { showNotification } from '../utils/notifications.js';
import { openChat } from './chat.js';

export function loadFriends(tab) {
    const url = tab === 'pending'
        ? '/api/friend-requests/pending'
        : `/api/friends?userId=${encodeURIComponent(state.user.id)}${tab === 'online' ? '&status=online' : ''}`;

    const opts = tab === 'pending' ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.user.id })
    } : {};

    fetch(url, opts)
        .then(res => res.json())
        .then(data => renderFriends(data, tab))
        .catch(err => {
            console.error('Ошибка загрузки:', err);
            renderFriends([], tab);
        });
}

export function searchFriends(query) {
    fetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(friends => renderFriends(friends.filter(u => u.id !== state.user.id), 'all'))
        .catch(err => renderFriends([], 'all'));
}

export function addFriend(nickname) {
    fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: nickname, requesterId: state.user.id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification(`Заявка отправлена ${nickname}!`, true);
                loadFriends(state.currentTab);
            } else {
                showNotification(data.error || 'Не удалось добавить друга', false);
            }
        });
}

export function acceptFriendRequest(requestId) {
    fetch('/api/friend-requests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId: state.user.id })
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

export function rejectFriendRequest(requestId) {
    fetch('/api/friend-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId: state.user.id })
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

export function renderFriends(data, tab) {
    const list = document.getElementById('friendsList');
    if (!list) return;
    list.innerHTML = '';
    if (!data?.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">Нет пользователей</div>';
        return;
    }
    data.forEach(item => {
        const user = item.display_name ? item : item.from_user;
        if (!user || user.id === state.user.id) return;
        const isOnline = user.is_online || false;
        const li = document.createElement('div');
        li.className = 'friend-item';
        li.dataset.userId = user.id;
        li.innerHTML = `
      <div class="friend-avatar-container">
        <div class="friend-avatar${isOnline ? '' : ' offline'}">${user.display_name.charAt(0).toUpperCase()}</div>
        <div class="member-status${isOnline ? '' : ' offline'}"></div>
      </div>
      <div class="friend-info">
        <div class="friend-name">${user.display_name}</div>
        <div class="friend-status${isOnline ? '' : ' offline'}">${isOnline ? 'В сети' : 'Не в сети'}</div>
      </div>
      <div class="friend-actions">
        ${tab === 'pending'
                ? `<button class="message-btn" style="background:#43b581;" onclick="acceptFriendRequest(${item.id})">Принять</button>
             <button class="message-btn" style="background:#ed4245;" onclick="rejectFriendRequest(${item.id})">Отклонить</button>`
                : `<button class="message-btn" onclick="openChat('${user.id}', '${user.display_name}', '${user.username}', ${isOnline})">Написать</button>`}
      </div>
    `;
        list.appendChild(li);
    });
    // Обновляем счётчики через глобальную функцию
    if (typeof window.updateUnreadBadges === 'function') window.updateUnreadBadges();
}