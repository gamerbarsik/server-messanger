let notificationContainer = null;

function createNotificationContainer() {
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    return notificationContainer;
}

export function showNotification(text, isSuccess = false) {
    const container = createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    icon.innerHTML = isSuccess
        ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586l9.293-9.293 1.414 1.414L9 19.414z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    const textEl = document.createElement('div');
    textEl.className = 'notification-text';
    textEl.textContent = text;
    const progress = document.createElement('div');
    progress.className = 'notification-progress';
    notification.appendChild(icon);
    notification.appendChild(textEl);
    notification.appendChild(progress);
    container.appendChild(notification);
    setTimeout(() => container.classList.add('show'), 10);
    setTimeout(() => {
        notification.remove();
        if (container.children.length === 0) container.classList.remove('show');
    }, 5000);
}

export function showInfoNotification(text) {
    const container = createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = 'notification info';
    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    const textEl = document.createElement('div');
    textEl.className = 'notification-text';
    textEl.textContent = text;
    const progress = document.createElement('div');
    progress.className = 'notification-progress';
    notification.appendChild(icon);
    notification.appendChild(textEl);
    notification.appendChild(progress);
    container.appendChild(notification);
    setTimeout(() => container.classList.add('show'), 10);
    setTimeout(() => {
        notification.remove();
        if (container.children.length === 0) container.classList.remove('show');
    }, 5000);
}