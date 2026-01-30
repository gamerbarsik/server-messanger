import { state } from './state.js';
import { initAudio, unlockAudio } from '../utils/audio.js';
import { loadFriends, renderFriends, addFriend, acceptFriendRequest, rejectFriendRequest } from '../ui/friends.js';
import { openChat, sendMessage, checkAllMessages, updateUnreadBadges } from '../ui/chat.js';
import { initMobileUI } from '../ui/mobile.js';

// Глобальные прокси для onclick
window.openChat = openChat;
window.addFriend = addFriend;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.updateUnreadBadges = updateUnreadBadges;

export function initApp() {
    state.user = JSON.parse(localStorage.getItem('user'));
    if (!state.user?.id || !state.user?.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return;
    }

    // Инициализация UI
    document.getElementById('profile-nickname').textContent = state.user.display_name;
    document.getElementById('profile-username').textContent = state.user.username;
    document.getElementById('userAvatar').textContent = state.user.display_name.charAt(0).toUpperCase();

    // Аудио
    ['click', 'keydown', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, unlockAudio, { once: true })
    );

    // Мобильная адаптация
    initMobileUI();

    // Обработчики
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('messageInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentTab = tab.dataset.tab;
            loadFriends(state.currentTab);
        });
    });

    document.getElementById('searchInput')?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if (q) searchFriends(q);
        else loadFriends(state.currentTab);
    });

    document.getElementById('membersSearch')?.addEventListener('input', e => {
        loadOnlineUsers(e.target.value.trim());
    });

    // Загрузка данных
    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);
    loadFriends(state.currentTab);

    setTimeout(() => {
        const fl = document.getElementById('friendsList');
        const tabs = document.querySelector('.tabs');
        const search = document.querySelector('.search-box');
        if (fl) fl.style.display = 'block';
        if (tabs) tabs.style.display = 'flex';
        if (search) search.style.display = 'flex';
    }, 100);

    setInterval(() => checkAllMessages(updateUnreadBadges), 1500);
}

// Онлайн-пользователи (упрощённо)
function loadOnlineUsers(query = '') {
    const url = query ? `/api/online?q=${encodeURIComponent(query)}` : '/api/online';
    fetch(url)
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('onlineUsers');
            if (!list) return;
            list.innerHTML = '';
            users.filter(u => u.id !== state.user.id).forEach(u => {
                const li = document.createElement('li');
                li.className = 'member-item';
                li.dataset.userId = u.id;
                li.innerHTML = `
          <div class="member-avatar-container">
            <div class="member-avatar">${u.display_name.charAt(0).toUpperCase()}</div>
            <div class="member-status${u.is_online ? '' : ' offline'}"></div>
          </div>
          <div class="member-info">
            <div class="member-nickname">${u.display_name}</div>
            <div class="member-username">${u.username}</div>
          </div>
        `;
                list.appendChild(li);
            });
            updateUnreadBadges();
        });
}