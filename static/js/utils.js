// Вспомогательные функции
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getMoscowTime() {
    const now = new Date();
    const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return moscowTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Инициализация звука
let audioContext = null;
let notificationBuffer = null;
let isAudioUnlocked = false;

async function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch('/static/sounds/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isAudioUnlocked = true;
    } catch (e) {
        console.warn('Не удалось инициализировать звук:', e);
    }
}

function unlockAudio() {
    if (!isAudioUnlocked) initAudio();
}

function playNotificationSound() {
    if (!isAudioUnlocked || !notificationBuffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;
    source.connect(audioContext.destination);
    source.start();
}