import { state } from '../core/state.js';
import { api } from '../core/api.js';
import { loadFriends, searchFriends, addFriend } from './friends.js';
import { openChat, sendMessage } from './chat.js';
import { unlockAudio } from '../utils/audio.js';

export function initUI() {
    // Обновление профиля
    document.getElementById('profile-nickname').textContent = state.user.display_name;
    document.getElementById('profile-username').textContent = state.user.username;
    document.getElementById('userAvatar').textContent = state.user.display_name.charAt(0).toUpperCase();

    // Heartbeat
    setInterval(() => {
        api.heartbeat(state.user.id);
    }, 30000);

    // Вкладки
    let currentTab = 'online';
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            state.currentTab = currentTab;
            loadFriends(currentTab);
        });
    });

    // Поиск друзей
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query === '') {
                loadFriends(currentTab);
            } else {
                searchFriends(query);
            }
        });
    }

    // Кнопка добавления друга
    const addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', () => {
            const nickname = document.getElementById('friendUsername').value.trim();
            if (nickname && nickname.startsWith('@')) {
                addFriend(nickname);
                document.getElementById('addFriendModal').classList.remove('show');
            } else {
                showNotification('Юзернейм должен начинаться с @', false);
            }
        });
    }

    // Отправка сообщения
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Назад к друзьям
    document.getElementById('backToFriendsBtn').addEventListener('click', () => {
        state.currentChatUser = null;
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.friends-header').style.display = 'block';
    });

    // Загрузка онлайн-пользователей
    function loadOnlineUsers(query = '') {
        api.getOnlineUsers(query).then(users => {
            const list = document.getElementById('onlineUsers');
            if (!list) return;

            list.innerHTML = '';
            users.forEach(u => {
                const li = document.createElement('li');
                li.className = 'member-item';
                li.dataset.userId = u.id;

                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'member-avatar-container';

                const avatar = document.createElement('div');
                avatar.className = 'member-avatar';
                avatar.textContent = u.display_name.charAt(0).toUpperCase();

                const status = document.createElement('div');
                status.className = 'member-status' + (u.is_online ? '' : ' offline');

                avatarContainer.appendChild(avatar);
                avatarContainer.appendChild(status);

                const info = document.createElement('div');
                info.className = 'member-info';
                const nickname = document.createElement('div');
                nickname.className = 'member-nickname';
                nickname.textContent = u.display_name;
                const username = document.createElement('div');
                username.className = 'member-username';
                username.textContent = u.username;

                info.appendChild(nickname);
                info.appendChild(username);

                li.appendChild(avatarContainer);
                li.appendChild(info);
                list.appendChild(li);
            });

            const countEl = document.getElementById('membersCount');
            if (countEl) {
                countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
            }

            updateUnreadBadges();
        });
    }

    const membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', (e) => {
            loadOnlineUsers(e.target.value.trim());
        });
    }

    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);

    loadFriends(currentTab);

    // Показываем вкладку друзей
    setTimeout(() => {
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.search-box').style.display = 'flex';
    }, 100);

    // Разблокировка аудио
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
}

// Экспортируем функции для совместимости
export { showNotification, updateUnreadBadges } from './friends.js';