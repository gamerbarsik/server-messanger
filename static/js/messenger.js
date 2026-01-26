// @ts-nocheck

import { init as initState } from 'core/state.js';
import { checkAuth } from 'core/auth.js';
import { startMessagePolling } from 'core/polling.js';
import { initUI } from 'ui/init.js';

// Инициализация
initState();

// Проверка авторизации
checkAuth().then(isAuth => {
    if (!isAuth) return;

    // Инициализация UI
    initUI();

    // Запуск опроса сообщений
    startMessagePolling();
});