// chat.js — содержит всё, что связано с чатами и сообщениями
function createChatModule(user, unreadMessagesRef, updateUnreadBadgesFn) {
    const { unreadMessages } = unreadMessagesRef;
    let currentChatUser = null;
    let lastMessageTimestamps = {};
    let isFirstLoad = true;
    let hasShownSummary = false;

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    function getMoscowTime() {
        const now = new Date();
        const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
        return moscowTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function saveMessageToHistory(userId, messageData) {
        const key = `chat_history_${user.id}_${userId}`;
        let history = JSON.parse(localStorage.getItem(key) || '[]');

        if (!history.some(msg => msg.message_id === messageData.message_id)) {
            history.push(messageData);
            if (history.length > 1000) {
                history = history.slice(-1000);
            }
            localStorage.setItem(key, JSON.stringify(history));
        }
    }

    function loadHistoryFromStorage(userId) {
        const key = `chat_history_${user.id}_${userId}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');

        const list = document.getElementById('chatMessages');
        list.innerHTML = '';

        history.forEach(msg => {
            addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
        });

        return history.length > 0;
    }

    function addMessageToChat(text, isOwn, timestamp = null, messageId = null) {
        if (messageId && document.querySelector(`[data-message-id="${messageId}"]`)) {
            return;
        }

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

    function showInfoNotification(text) {
        const container = document.getElementById('notificationContainer') || (() => {
            const c = document.createElement('div');
            c.id = 'notificationContainer';
            c.className = 'notification-container';
            document.body.appendChild(c);
            return c;
        })();

        const n = document.createElement('div');
        n.className = 'notification info';
        n.innerHTML = `
      <div class="notification-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
      </div>
      <div class="notification-text">${text}</div>
      <div class="notification-progress"></div>
    `;
        container.appendChild(n);
        setTimeout(() => container.classList.add('show'), 10);
        setTimeout(() => {
            n.remove();
            if (container.children.length === 0) container.classList.remove('show');
        }, 5000);
    }

    function playNotificationSound() {
        // Используем глобальную функцию из основного файла
        if (window.playNotificationSound) {
            window.playNotificationSound();
        }
    }

    function showNotification(text, isSuccess = false) {
        const container = document.getElementById('notificationContainer') || (() => {
            const c = document.createElement('div');
            c.id = 'notificationContainer';
            c.className = 'notification-container';
            document.body.appendChild(c);
            return c;
        })();

        const n = document.createElement('div');
        n.className = `notification ${isSuccess ? 'success' : 'error'}`;
        n.innerHTML = `
      <div class="notification-icon">
        ${isSuccess
                ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586l9.293-9.293 1.414 1.414L9 19.414z"/></svg>'
                : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
            }
      </div>
      <div class="notification-text">${text}</div>
      <div class="notification-progress"></div>
    `;
        container.appendChild(n);
        setTimeout(() => container.classList.add('show'), 10);
        setTimeout(() => {
            n.remove();
            if (container.children.length === 0) container.classList.remove('show');
        }, 5000);
    }

    // === ОСНОВНЫЕ ФУНКЦИИ ===

    function openChat(userId, displayName, username, isOnline) {
        if (!userId || userId === user.id) {
            console.error('Неверный ID пользователя для чата');
            return;
        }

        currentChatUser = {
            id: userId,
            display_name: displayName,
            username: username,
            is_online: isOnline
        };

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

        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
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

                if (!hasLocalHistory) {
                    loadHistoryFromStorage(userId);
                }

                if (messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;
                }
            })
            .catch(err => console.error('Ошибка загрузки истории:', err));

        if (unreadMessages[userId] > 0) {
            unreadMessages[userId] = 0;
            updateUnreadBadgesFn();
        }
    }

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

    function loadNewMessages(userId) {
        const lastTime = lastMessageTimestamps[userId] || '';

        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                const newMessages = messages.filter(msg => {
                    const msgTime = msg.timestamp + '_' + msg.message_id;
                    return msgTime > lastTime;
                });

                if (newMessages.length === 0) return;

                const lastMsg = newMessages[newMessages.length - 1];
                lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;

                newMessages.forEach(msg => {
                    saveMessageToHistory(userId, {
                        message_id: msg.message_id,
                        text: msg.text,
                        is_own: msg.is_own,
                        timestamp: msg.timestamp
                    });

                    if (!msg.is_own) {
                        unreadMessages[userId] = (unreadMessages[userId] || 0) + 1;
                        updateUnreadBadgesFn();

                        if (!currentChatUser || currentChatUser.id !== userId) {
                            if (!isFirstLoad) {
                                showInfoNotification(`Новое сообщение от ${msg.author_name}`);
                                playNotificationSound();
                            }
                        }
                    }

                    if (currentChatUser && currentChatUser.id === userId) {
                        addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
                    }
                });

                if (currentChatUser && currentChatUser.id === userId && unreadMessages[userId] > 0) {
                    unreadMessages[userId] = 0;
                    updateUnreadBadgesFn();
                }
            })
            .catch(err => console.warn('Ошибка загрузки новых сообщений:', err));
    }

    function checkAllMessages() {
        if (!user || !user.id) return;

        fetch(`/api/friends?userId=${encodeURIComponent(user.id)}`)
            .then(res => res.json())
            .then(friends => {
                let totalUnread = 0;

                friends.forEach(friend => {
                    if (friend.id === user.id) return;

                    fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(friend.id)}`)
                        .then(res => res.json())
                        .then(messages => {
                            const lastMsg = messages[messages.length - 1];
                            if (!lastMsg || lastMsg.is_own) return;

                            const lastTime = lastMessageTimestamps[friend.id] || '';
                            const newTime = lastMsg.timestamp + lastMsg.message_id;

                            if (newTime !== lastTime) {
                                lastMessageTimestamps[friend.id] = newTime;

                                if (!currentChatUser || currentChatUser.id !== friend.id) {
                                    unreadMessages[friend.id] = (unreadMessages[friend.id] || 0) + 1;
                                    updateUnreadBadgesFn();
                                    totalUnread += 1;

                                    if (!isFirstLoad) {
                                        showInfoNotification(`Новое сообщение от ${friend.display_name}`);
                                        playNotificationSound();
                                    }
                                }
                            }
                        })
                        .catch(err => console.warn('Ошибка проверки сообщений:', err));
                });

                if (isFirstLoad && totalUnread > 0 && !hasShownSummary) {
                    hasShownSummary = true;
                    if (totalUnread === 1) {
                        showInfoNotification(`У вас 1 непрочитанное сообщение`);
                    } else {
                        showInfoNotification(`У вас ${totalUnread} непрочитанных сообщений!`);
                    }
                    playNotificationSound();
                }

                isFirstLoad = false;
            })
            .catch(err => console.warn('Ошибка загрузки друзей:', err));
    }

    // === ЭКСПОРТ ===

    return {
        openChat,
        sendMessage,
        loadNewMessages,
        checkAllMessages,
        getCurrentChatUser: () => currentChatUser
    };
}