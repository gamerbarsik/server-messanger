import { state } from '../core/state.js';
import { showNotification, showInfoNotification } from '../utils/notifications.js';
import { playNotificationSound } from '../utils/audio.js';
import { updateUnreadBadges } from './badges.js';

export function getMoscowTime() {
    const now = new Date();
    const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return moscowTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function saveMessageToHistory(userId, messageData) {
    const key = `chat_history_${state.user.id}_${userId}`;
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    if (!history.some(msg => msg.message_id === messageData.message_id)) {
        history.push(messageData);
        if (history.length > 1000) history = history.slice(-1000);
        localStorage.setItem(key, JSON.stringify(history));
    }
}

export function loadHistoryFromStorage(userId) {
    const key = `chat_history_${state.user.id}_${userId}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    const list = document.getElementById('chatMessages');
    list.innerHTML = '';
    history.forEach(msg => {
        addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
    });
    return history.length > 0;
}

function addMessageToChat(text, isOwn, timestamp = null, messageId = null) {
    if (messageId && document.querySelector(`[data-message-id="${messageId}"]`)) return;
    const div = document.createElement('div');
    div.className = `message${isOwn ? ' own' : ''}`;
    if (messageId) div.dataset.messageId = messageId;
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-timestamp';
    timeDiv.textContent = timestamp || getMoscowTime();
    div.appendChild(textDiv);
    div.appendChild(timeDiv);
    document.getElementById('chatMessages').appendChild(div);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

export function openChat(userId, displayName, username, isOnline) {
    if (!userId || userId === state.user.id) {
        console.error('Неверный ID пользователя для чата');
        return;
    }

    state.currentChatUser = { id: userId, display_name: displayName, username, is_online: isOnline };
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

    const hasLocalHistory = loadHistoryFromStorage(userId);

    fetch(`/api/messages/history?user1_id=${encodeURIComponent(state.user.id)}&user2_id=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(messages => {
            messages.forEach(msg => {
                saveMessageToHistory(userId, {
                    message_id: msg.message_id,
                    text: msg.text,
                    is_own: msg.is_own,
                    timestamp: msg.timestamp
                });
            });
            if (!hasLocalHistory) loadHistoryFromStorage(userId);
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                state.lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;
            }
        })
        .catch(err => console.error('Ошибка загрузки истории:', err));

    if (state.unreadMessages[userId] > 0) {
        state.unreadMessages[userId] = 0;
        updateUnreadBadges();
    }
}

export function sendMessage() {
    const text = document.getElementById('messageInput').value.trim();
    if (!text || !state.currentChatUser) return;

    const tempId = 'temp_' + Date.now();
    const moscowTime = getMoscowTime();
    addMessageToChat(text, true, moscowTime, tempId);
    saveMessageToHistory(state.currentChatUser.id, {
        message_id: tempId,
        text: text,
        is_own: true,
        timestamp: moscowTime
    });

    fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from_user_id: state.user.id,
            to_user_id: state.currentChatUser.id,
            text: text
        })
    })
        .then(() => {
            document.getElementById('messageInput').value = '';
            loadNewMessages(state.currentChatUser.id);
        })
        .catch(err => {
            showNotification('Ошибка отправки', false);
            const tempMsg = document.querySelector(`[data-message-id="${tempId}"]`);
            if (tempMsg) tempMsg.remove();
        });
}

export function loadNewMessages(userId) {
    const lastTime = state.lastMessageTimestamps[userId] || '';
    fetch(`/api/messages/history?user1_id=${encodeURIComponent(state.user.id)}&user2_id=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(messages => {
            const newMessages = messages.filter(msg => {
                const msgTime = msg.timestamp + '_' + msg.message_id;
                return msgTime > lastTime;
            });
            if (newMessages.length === 0) return;
            const lastMsg = newMessages[newMessages.length - 1];
            state.lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;
            newMessages.forEach(msg => {
                saveMessageToHistory(userId, {
                    message_id: msg.message_id,
                    text: msg.text,
                    is_own: msg.is_own,
                    timestamp: msg.timestamp
                });
                if (!msg.is_own) {
                    state.unreadMessages[userId] = (state.unreadMessages[userId] || 0) + 1;
                    updateUnreadBadges();
                    if (!state.currentChatUser || state.currentChatUser.id !== userId) {
                        if (!state.isFirstLoad) {
                            showInfoNotification(`Новое сообщение от ${msg.author_name}`);
                            playNotificationSound();
                        }
                    }
                }
                if (state.currentChatUser && state.currentChatUser.id === userId) {
                    addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
                }
            });
            if (state.currentChatUser && state.currentChatUser.id === userId && state.unreadMessages[userId] > 0) {
                state.unreadMessages[userId] = 0;
                updateUnreadBadges();
            }
        })
        .catch(err => console.warn('Ошибка загрузки новых сообщений:', err));
}

export function checkAllMessages(updateUnreadBadgesFn) {
    if (!state.user || !state.user.id) return;
    fetch(`/api/friends?userId=${encodeURIComponent(state.user.id)}`)
        .then(res => res.json())
        .then(friends => {
            let totalUnread = 0;
            friends.forEach(friend => {
                if (friend.id === state.user.id) return;
                fetch(`/api/messages/history?user1_id=${encodeURIComponent(state.user.id)}&user2_id=${encodeURIComponent(friend.id)}`)
                    .then(res => res.json())
                    .then(messages => {
                        const lastMsg = messages[messages.length - 1];
                        if (!lastMsg || lastMsg.is_own) return;
                        const lastTime = state.lastMessageTimestamps[friend.id] || '';
                        const newTime = lastMsg.timestamp + lastMsg.message_id;
                        if (newTime !== lastTime) {
                            state.lastMessageTimestamps[friend.id] = newTime;
                            if (!state.currentChatUser || state.currentChatUser.id !== friend.id) {
                                state.unreadMessages[friend.id] = (state.unreadMessages[friend.id] || 0) + 1;
                                updateUnreadBadgesFn();
                                totalUnread += 1;
                                if (!state.isFirstLoad) {
                                    showInfoNotification(`Новое сообщение от ${friend.display_name}`);
                                    playNotificationSound();
                                }
                            }
                        }
                    })
                    .catch(err => console.warn('Ошибка проверки сообщений:', err));
            });
            if (state.isFirstLoad && totalUnread > 0 && !state.hasShownSummary) {
                state.hasShownSummary = true;
                if (totalUnread === 1) {
                    showInfoNotification(`У вас 1 непрочитанное сообщение`);
                } else {
                    showInfoNotification(`У вас ${totalUnread} непрочитанных сообщений!`);
                }
                playNotificationSound();
            }
            state.isFirstLoad = false;
        })
        .catch(err => console.warn('Ошибка загрузки друзей:', err));
}

// export function updateUnreadBadges() {
//     document.querySelectorAll('.friend-item, .member-item').forEach(item => {
//         const userId = item.dataset.userId;
//         const container = item.querySelector('.friend-avatar-container, .member-avatar-container');
//         if (!userId || !container) return;

//         const oldBadge = container.querySelector('.unread-count-badge');
//         if (oldBadge) oldBadge.remove();

//         if (state.unreadMessages[userId] > 0) {
//             const badge = document.createElement('div');
//             badge.className = 'unread-count-badge';
//             badge.textContent = state.unreadMessages[userId] > 9 ? '9+' : state.unreadMessages[userId];
//             container.appendChild(badge);
//         }
//     });
// }