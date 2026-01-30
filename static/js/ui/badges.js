import { state } from '../core/state.js';

export function updateUnreadBadges() {
    document.querySelectorAll('.friend-item, .member-item').forEach(item => {
        const userId = item.dataset.userId;
        const container = item.querySelector('.friend-avatar-container, .member-avatar-container');
        if (!userId || !container) return;

        const oldBadge = container.querySelector('.unread-count-badge');
        if (oldBadge) oldBadge.remove();

        if (state.unreadMessages[userId] > 0) {
            const badge = document.createElement('div');
            badge.className = 'unread-count-badge';
            badge.textContent = state.unreadMessages[userId] > 9 ? '9+' : state.unreadMessages[userId];
            container.appendChild(badge);
        }
    });
}