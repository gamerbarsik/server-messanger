import { playNotificationSound as playSound } from '../utils/audio.js';

let container = null;

function getContainer() {
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

export function showInfoNotification(text) {
    const c = getContainer();
    const n = document.createElement('div');
    n.className = 'notification info';
    n.innerHTML = `
    <div class="notification-icon">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
    </div>
    <div class="notification-text">${text}</div>
    <div class="notification-progress"></div>
  `;
    c.appendChild(n);
    setTimeout(() => c.classList.add('show'), 10);
    setTimeout(() => {
        n.remove();
        if (c.children.length === 0) c.classList.remove('show');
    }, 5000);
}

export { playSound as playNotificationSound };