import { state } from './state.js';
import { initAudio, unlockAudio } from '../utils/audio.js';
import { loadFriends, renderFriends, searchFriends, addFriend, loadOnlineUsers } from '../ui/friends.js';
import { openChat, sendMessage, checkAllMessages } from '../ui/chat.js';
import { initMobileUI } from '../ui/mobile.js';
import { updateUnreadBadges } from '../ui/badges.js';
import { showNotification } from '../utils/notifications.js';

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

    // === Модальные окна ===
    function initModals() {
        // Добавить друга
        const addModal = document.getElementById('addFriendModal');
        const openAddBtn = document.getElementById('addFriendBtn');
        const closeAddBtn = document.getElementById('cancelAddFriend');
        const confirmAddBtn = document.getElementById('confirmAddFriend');
        const friendInput = document.getElementById('friendUsername');

        if (openAddBtn && addModal) {
            openAddBtn.addEventListener('click', e => {
                e.preventDefault();
                friendInput.value = '';
                addModal.classList.add('show');
                friendInput.focus();
            });
        }

        if (closeAddBtn) {
            closeAddBtn.addEventListener('click', () => {
                addModal?.classList.remove('show');
            });
        }

        if (confirmAddBtn) {
            confirmAddBtn.addEventListener('click', () => {
                const nickname = friendInput.value.trim();
                if (nickname && nickname.startsWith('@')) {
                    addFriend(nickname);
                    addModal?.classList.remove('show');
                } else {
                    showNotification('Юзернейм должен начинаться с @', false);
                }
            });
        }

        // Enter в поле добавления
        friendInput?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAddBtn?.click();
            }
        });

        // Редактирование профиля
        const editModal = document.getElementById('editProfileModal');
        const userProfile = document.getElementById('userProfile');
        const saveEditBtn = document.getElementById('saveEditProfile');
        const cancelEditBtn = document.getElementById('cancelEditProfile');
        const editDisplayName = document.getElementById('editDisplayName');

        userProfile?.addEventListener('click', () => {
            editDisplayName.value = state.user.display_name;
            editModal?.classList.add('show');
        });

        cancelEditBtn?.addEventListener('click', () => {
            editModal?.classList.remove('show');
        });

        saveEditBtn?.addEventListener('click', () => {
            const newDisplayName = editDisplayName.value.trim();
            if (!newDisplayName || newDisplayName.length < 2) {
                showNotification('Ник должен быть от 2 символов', false);
                return;
            }

            fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: state.user.id, displayName: newDisplayName })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        state.user.display_name = newDisplayName;
                        localStorage.setItem('user', JSON.stringify(state.user));
                        document.getElementById('profile-nickname').textContent = newDisplayName;
                        document.getElementById('userAvatar').textContent = newDisplayName.charAt(0).toUpperCase();
                        editModal?.classList.remove('show');
                        showNotification('Ник обновлён!', true);
                    } else {
                        showNotification(data.error || 'Ошибка обновления', false);
                    }
                })
                .catch(err => showNotification('Нет связи с сервером', false));
        });

        editDisplayName?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEditBtn?.click();
            }
        });

        // Выход
        const logoutModal = document.getElementById('logoutConfirmModal');
        const logoutBtn = document.getElementById('logoutBtn');
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');

        logoutBtn?.addEventListener('click', () => {
            logoutModal?.classList.add('show');
        });

        cancelLogout?.addEventListener('click', () => {
            logoutModal?.classList.remove('show');
        });

        confirmLogout?.addEventListener('click', () => {
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: state.user.id })
            })
                .then(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                })
                .catch(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
        });

        // Закрытие по Esc
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.classList.contains('show')) el.classList.remove('show');
                });
            }
        });

        // Закрытие по клику на оверлей
        ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(id => {
            const el = document.getElementById(id);
            el?.addEventListener('click', e => {
                if (e.target === el) el.classList.remove('show');
            });
        });
    }

    // Вызов инициализации
    initModals();

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