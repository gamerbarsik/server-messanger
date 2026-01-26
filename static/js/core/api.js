// Все API-запросы
export const api = {
    // Регистрация и вход
    register(displayName, username, password) {
        return fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, username, password, password2: password })
        }).then(r => r.json());
    },

    login(identifier, password) {
        return fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        }).then(r => r.json());
    },

    logout(userId) {
        return fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        }).then(r => r.json());
    },

    // Друзья
    getFriends(userId, tab = 'all') {
        let url = `/api/friends?userId=${encodeURIComponent(userId)}`;
        if (tab === 'online') url += '&status=online';
        return fetch(url).then(r => r.json());
    },

    searchFriends(query) {
        return fetch(`/api/friends/search?q=${encodeURIComponent(query)}`).then(r => r.json());
    },

    addFriend(targetUsername, requesterId) {
        return fetch('/api/friends/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUsername, requesterId })
        }).then(r => r.json());
    },

    getPendingRequests(userId) {
        return fetch('/api/friend-requests/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        }).then(r => r.json());
    },

    acceptFriendRequest(requestId, userId) {
        return fetch('/api/friend-requests/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, userId })
        }).then(r => r.json());
    },

    rejectFriendRequest(requestId, userId) {
        return fetch('/api/friend-requests/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, userId })
        }).then(r => r.json());
    },

    // Профиль
    updateProfile(userId, displayName) {
        return fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, displayName })
        }).then(r => r.json());
    },

    heartbeat(userId) {
        return fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        }).then(r => r.json());
    },

    getOnlineUsers(query = '') {
        let url = '/api/online';
        if (query) url += `?q=${encodeURIComponent(query)}`;
        return fetch(url).then(r => r.json());
    },

    // Сообщения
    getMessages(user1Id, user2Id) {
        return fetch(`/api/messages/history?user1_id=${encodeURIComponent(user1Id)}&user2_id=${encodeURIComponent(user2Id)}`)
            .then(r => r.json());
    },

    sendMessage(fromId, toId, text) {
        return fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_user_id: fromId, to_user_id: toId, text })
        }).then(r => r.json());
    }
};