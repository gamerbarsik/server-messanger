import { state } from '../core/state.js';
import { api } from '../core/api.js';
import { addMessageToChat } from '../utils/helpers.js';

export function openChat(userId, displayName, username, isOnline) {
    if (!userId || userId === state.user.id) return;

    state.currentChatUser = { id: userId, display_name: displayName, username, is_online: isOnline };

    // Скрыть список, показать чат
    document.getElementById('friendsList').style.display = 'none';
    document.querySelector('.friends-header').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';

    // Обновить заголовок
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

    loadChatHistory(userId);
}

export function loadChatHistory(userId) {
    api.getMessages(state.user.id, userId).then(messages => {
        const list = document.getElementById('chatMessages');
        list.innerHTML = '';

        messages.forEach(msg => {
            addMessageToChat(msg.text, msg.is_own, msg.timestamp);
            state.lastMessageTimestamps[userId] = msg.timestamp + '_' + msg.message_id;
        });
    });
}

export function sendMessage() {
    const text = document.getElementById('messageInput').value.trim();
    if (!text || !state.currentChatUser) return;

    api.sendMessage(state.user.id, state.currentChatUser.id, text).then(() => {
        document.getElementById('messageInput').value = '';
        addMessageToChat(text, true);
    });
}