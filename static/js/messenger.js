document.addEventListener('DOMContentLoaded', function () {
    // === Шаг 1: Проверка авторизации ===
    var user = checkAuth(); // из auth-check.js

    // === Шаг 2: Глобальные переменные ===
    var currentTab = 'online';
    let currentChatUser = null;
    let lastMessageTimestamps = {};
    let unreadMessages = {};
    let friendList = [];
    let isFirstLoad = true;
    let hasShownSummary = false;

    // === Шаг 3: Инициализация UI ===
    document.getElementById('profile-nickname').textContent = user.display_name;
    document.getElementById('profile-username').textContent = user.username;
    const avatarText = user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = avatarText;

    // Разблокировка аудио
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // === Шаг 4: Запуск всех модулей ===
    // Heartbeat
    function sendHeartbeat() {
        if (!user || !user.id) return;
        fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        }).then(() => loadOnlineUsers()).catch(err => console.warn('Heartbeat failed:', err));
    }
    sendHeartbeat();
    setInterval(sendHeartbeat, 30000);

    // Вкладки
    var tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabButtons.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            loadFriends(currentTab);
        });
    });

    // Поиск
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            if (query === '') loadFriends(currentTab);
            else searchFriends(query);
        });
    }

    // Кнопки чата
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('backToFriendsBtn').addEventListener('click', function () {
        currentChatUser = null;
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.friends-header').style.display = 'block';
    });

    // Поиск в правой панели
    var membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', function () {
            loadOnlineUsers(this.value.trim());
        });
    }

    // Загрузка данных
    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);
    loadFriends(currentTab);

    setTimeout(() => {
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.search-box').style.display = 'flex';
    }, 100);

    // Запуск опроса сообщений
    setInterval(checkAllMessages, 1500);
});