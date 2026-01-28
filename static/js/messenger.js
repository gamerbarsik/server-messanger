// === Основной код ===
document.addEventListener('DOMContentLoaded', function () {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // === Глобальные переменные ===
    var currentTab = 'online';
    let currentChatUser = null;
    let lastMessageTimestamps = {};
    let unreadMessages = {};
    let friendList = [];
    let isFirstLoad = true;
    let hasShownSummary = false;

    // === Сначала объявляем ВСЕ функции ===

    // --- Чат ---
    function sendMessage() {
        const text = document.getElementById('messageInput').value.trim();
        if (!text || !currentChatUser) return;

        const tempId = 'temp_' + Date.now();
        const moscowTime = getMoscowTime();

        addMessageToChat(text, true, moscowTime, tempId);
        saveMessageToHistory(currentChatUser.id, {
            message_id: tempId,
            text: text,
            is_own: true,
            timestamp: moscowTime
        });

        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_user_id: user.id,
                to_user_id: currentChatUser.id,
                text: text
            })
        })
            .then(() => {
                document.getElementById('messageInput').value = '';
                loadNewMessages(currentChatUser.id);
            })
            .catch(err => {
                showNotification('Ошибка отправки', false);
                const tempMsg = document.querySelector(`[data-message-id="${tempId}"]`);
                if (tempMsg) tempMsg.remove();
            });
    }

    // --- Друзья и онлайн ---
    function loadOnlineUsers(query = '') {
        if (!user || !user.id) return;

        let url = '/api/online';
        if (query) {
            url += '?q=' + encodeURIComponent(query);
        }

        fetch(url)
            .then(function (res) {
                if (res.status === 401) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                    return;
                }
                return res.json();
            })
            .then(function (users) {
                if (!users) return;

                var list = document.getElementById('onlineUsers');
                if (!list) return;

                list.innerHTML = '';
                for (var i = 0; i < users.length; i++) {
                    var u = users[i];
                    var li = document.createElement('li');
                    li.className = 'member-item';
                    li.dataset.userId = u.id;

                    var avatarContainer = document.createElement('div');
                    avatarContainer.className = 'member-avatar-container';

                    var avatar = document.createElement('div');
                    avatar.className = 'member-avatar';
                    avatar.textContent = u.display_name.charAt(0).toUpperCase();

                    var status = document.createElement('div');
                    status.className = 'member-status' + (u.is_online ? '' : ' offline');

                    avatarContainer.appendChild(avatar);
                    avatarContainer.appendChild(status);

                    var info = document.createElement('div');
                    info.className = 'member-info';
                    var nickname = document.createElement('div');
                    nickname.className = 'member-nickname';
                    nickname.textContent = u.display_name;
                    var username = document.createElement('div');
                    username.className = 'member-username';
                    username.textContent = u.username;

                    info.appendChild(nickname);
                    info.appendChild(username);

                    li.appendChild(avatarContainer);
                    li.appendChild(info);
                    list.appendChild(li);
                }

                var countEl = document.getElementById('membersCount');
                if (countEl) {
                    countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
                }

                updateUnreadBadges();
            })
            .catch(function (err) {
                console.warn('Не удалось загрузить онлайн-пользователей:', err);
            });
    }

    function sendHeartbeat() {
        if (!user || !user.id) return;
        fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        })
            .then(() => {
                loadOnlineUsers();
            })
            .catch(function (err) {
                console.warn('Heartbeat failed:', err);
            });
    }

    // --- Остальные функции (loadFriends, openChat, и т.д.) ---
    // ... (вставь остальной код как есть, но УЖЕ ПОСЛЕ sendMessage и loadOnlineUsers)

    // === Теперь инициализация ===

    // Обновление профиля
    document.getElementById('profile-nickname').textContent = user.display_name;
    document.getElementById('profile-username').textContent = user.username;
    const avatarText = user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = avatarText;

    // Запуск heartbeat
    sendHeartbeat();
    setInterval(sendHeartbeat, 30000);

    // Кнопки чата
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Поиск в правой панели
    var membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', function () {
            const query = this.value.trim();
            loadOnlineUsers(query);
        });
    }

    // Загрузка данных
    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);

    // ... остальная инициализация ...
});