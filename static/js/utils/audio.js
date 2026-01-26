let audioContext = null;
let notificationBuffer = null;
let isAudioUnlocked = false;

export async function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch('/static/sounds/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isAudioUnlocked = true;
    } catch (e) { console.warn('Звук недоступен:', e); }
}

export function unlockAudio() {
    if (!isAudioUnlocked) initAudio();
}

export function playNotificationSound() {
    if (!isAudioUnlocked || !notificationBuffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;
    source.connect(audioContext.destination);
    source.start();
}