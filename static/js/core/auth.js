import { state } from './state.js';

// Проверка авторизации на сервере
export async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.user.id,
                username: state.user.username
            })
        });

        if (response.status === 403) {
            localStorage.removeItem('user');
            document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #18191c; color: white; font-family: Arial;">
          <div style="text-align: center;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">403 — Доступ запрещён</h1>
            <p>Вы не авторизованы. <a href="index.html" style="color: #5865f2; text-decoration: none;">Вернуться на главную</a></p>
          </div>
        </div>
      `;
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Ошибка авторизации:', e);
        return false;
    }
}