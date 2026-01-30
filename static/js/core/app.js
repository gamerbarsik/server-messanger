import { initAudio, unlockAudio } from '../utils/audio.js';
import { loadFriends, renderFriends } from '../ui/friends.js';
import { openChat, sendMessage, checkAllMessages, updateUnreadBadges } from '../ui/chat.js';
import { initMobileUI } from '../ui/mobile.js';

export function initApp() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return;
    }

    // Инициализация
    document.getElementById('profile-nickname').textContent = user.display_name;
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('userAvatar').textContent = user.display_name.charAt(0).toUpperCase();

    // Аудио
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // Мобильная адаптация
    initMobileUI(user);

    // Обработчики
    document.getElementById('sendBtn').addEventListener('click', () => sendMessage(user));
    document.getElementById('messageInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(user);
        }
    });

    // Запуск
    setInterval(() => checkAllMessages(user, updateUnreadBadges), 1500);
    loadFriends('online', user, { currentTab: 'online' }, updateUnreadBadges);
}