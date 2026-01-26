import { state } from './state.js';
import { api } from './api.js';
import { showInfoNotification, playNotificationSound } from '../ui/notifications.js';
import { updateUnreadBadges } from '../ui/friends.js';

export function startMessagePolling() {
    setInterval(checkAllMessages, 1500);
}

function checkAllMessages() {
    if (!state.user || !state.user.id) return;

    api.getFriends(state.user.id).then(friends => {
        let totalUnread = 0;

        friends.forEach(friend => {
            if (friend.id === state.user.id) return;

            api.getMessages(state.user.id, friend.id).then(messages => {
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg || lastMsg.is_own) return;

                const lastTime = state.lastMessageTimestamps[friend.id] || '';
                const newTime = lastMsg.timestamp + lastMsg.message_id;

                if (newTime !== lastTime) {
                    state.lastMessageTimestamps[friend.id] = newTime;

                    if (!state.currentChatUser || state.currentChatUser.id !== friend.id) {
                        state.unreadMessages[friend.id] = (state.unreadMessages[friend.id] || 0) + 1;
                        updateUnreadBadges();
                        totalUnread += 1;

                        if (!state.isFirstLoad) {
                            showInfoNotification(`Новое сообщение от ${friend.display_name}`);
                            playNotificationSound();
                        }
                    }
                }
            });
        });

        if (state.isFirstLoad && totalUnread > 0 && !state.hasShownSummary) {
            state.hasShownSummary = true;
            if (totalUnread === 1) {
                showInfoNotification(`У вас 1 непрочитанное сообщение`);
            } else {
                showInfoNotification(`У вас ${totalUnread} непрочитанных сообщений!`);
            }
            playNotificationSound();
        }

        state.isFirstLoad = false;
    });
}