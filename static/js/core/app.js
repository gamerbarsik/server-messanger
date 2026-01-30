import { state } from './state.js';
import { initAudio, unlockAudio } from '../utils/audio.js';
import { loadFriends, renderFriends, searchFriends, addFriend, loadOnlineUsers } from '../ui/friends.js';
import { openChat, sendMessage, checkAllMessages, updateUnreadBadges } from '../ui/chat.js';
import { initMobileUI } from '../ui/mobile.js';

export function initApp() {
    state.user = JSON.parse(localStorage.getItem('user'));
    if (!state.user || !state.user.id || !state.user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return;
    }

    // Инициализация UI
    document.getElementById('profile-nickname').textContent = state.user.display_name;
    document.getElementById('profile-username').textContent = state.user.username;
    const avatarText = state.user.display_name ? state.user.display_name.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = avatarText;

    // Аудио
    ['click', 'keydown', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, unlockAudio, { once: true })
    );

    // Мобильная адаптация
    initMobileUI();

    // Обработчики
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('backToFriendsBtn').addEventListener('click', () => {
        state.currentChatUser = null;
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.friends-header').style.display = 'block';
    });

    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentTab = tab.dataset.tab;
            loadFriends(state.currentTab);
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const query = e.target.value.trim().toLowerCase();
            if (query === '') loadFriends(state.currentTab);
            else searchFriends(query);
        });
    }

    const membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', e => loadOnlineUsers(e.target.value.trim()));
    }

    // Загрузка данных
    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);
    loadFriends(state.currentTab);

    setTimeout(() => {
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.search-box').style.display = 'flex';
    }, 100);

    setInterval(() => checkAllMessages(updateUnreadBadges), 1500);
}