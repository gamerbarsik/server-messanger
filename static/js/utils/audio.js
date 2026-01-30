let audioContext = null;
let notificationBuffer = null;
let isAudioUnlocked = false;

export async function initAudio() {
    if (audioContext) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioContext = new AudioContext();
        const response = await fetch('/static/sounds/notification.mp3');
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isAudioUnlocked = true;
    } catch (e) {
        console.warn('Audio init failed:', e.message);
        isAudioUnlocked = false;
    }
}

export function unlockAudio() {
    if (!isAudioUnlocked) initAudio();
}

export function playNotificationSound() {
    if (!isAudioUnlocked || !notificationBuffer) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = notificationBuffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (e) {
        console.warn('Audio playback failed:', e.message);
    }
}