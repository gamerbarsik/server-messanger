// @ts-nocheck

import { init as initState } from './js/core/state.js';
import { checkAuth } from './js/core/auth.js';
import { startMessagePolling } from './js/core/polling.js';
import { initUI } from './js/ui/init.js';

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