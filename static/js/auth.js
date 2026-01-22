// @ts-nocheck

let notificationContainer = null;

function createNotificationContainer() {
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    return notificationContainer;
}

function showNotification(text, isSuccess = false) {
    const container = document.getElementById('notification-container') || createNotificationContainer();

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

    // Запускаем анимации
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Исчезновение
    setTimeout(() => {
        notification.classList.add('exiting');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 5000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

// Валидация регистрации
function validateRegistration(displayName, username, password, password2) {
    const errors = [];

    if (!displayName.trim()) {
        errors.push('Поле "Ник" обязательно');
    } else if (displayName.length < 2) {
        errors.push('Ник слишком короткий (мин. 2 символа)');
    } else if (displayName.length > 32) {
        errors.push('Ник слишком длинный (макс. 32 символа)');
    }

    if (!username.trim()) {
        errors.push('Поле "Юзернейм" обязательно');
    } else if (!username.startsWith('@')) {
        errors.push('Юзернейм должен начинаться с @');
    } else if (username.length < 4) {
        errors.push('Юзернейм слишком короткий (мин. 4 символа)');
    } else if (username.length > 32) {
        errors.push('Юзернейм слишком длинный (макс. 32 символа)');
    }

    if (!password) {
        errors.push('Пароль обязателен');
    } else if (password.length < 6) {
        errors.push('Пароль слишком короткий (мин. 6 символов)');
    } else if (password.length > 128) {
        errors.push('Пароль слишком длинный (макс. 128 символов)');
    } else if (!/[a-zA-Z]/.test(password)) {
        errors.push('Пароль должен содержать хотя бы одну букву');
    } else if (!/\d/.test(password)) {
        errors.push('Пароль должен содержать хотя бы одну цифру');
    }

    if (password !== password2) {
        errors.push('Пароли не совпадают');
    }

    return errors;
}

// Регистрация
document.getElementById('registerBtn').addEventListener('click', async function () {
    const displayName = document.getElementById('regDisplayName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;

    const errors = validateRegistration(displayName, username, password, password2);
    if (errors.length > 0) {
        errors.forEach(err => showNotification(err, false));
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, username, password, password2 })
        });
        const data = await res.json();

        if (data.success) {
            showNotification('Успешная регистрация!', true);
            setTimeout(() => {
                window.location.href = 'messenger.html';
            }, 2000);
        } else {
            showNotification(data.error || 'Ошибка регистрации', false);
        }
    } catch (err) {
        showNotification('Нет связи с сервером, попробуйте позже', false);
    }
});

document.getElementById('loginBtn').addEventListener('click', async function () {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!identifier.trim()) {
        showNotification('Введите никнейм', false);
        return;
    }
    if (!identifier.startsWith('@')) {
        showNotification('Ник должен начинаться с @', false);
        return;
    }
    if (!password) {
        showNotification('Введите пароль', false);
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify({
                id: data.userId,
                username: data.username,
                display_name: data.displayName
            }));
            window.location.href = 'messenger.html';
        } else {
            showNotification(data.error || 'Неверный логин или пароль', false);
        }
    } catch (err) {
        showNotification('Нет связи с сервером', false);
    }
});

document.getElementById('showRegister').addEventListener('click', function () {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', function () {
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'block';
});

document.getElementById('loginPassword').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('regPassword2').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('registerBtn').click();
});