export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function addMessageToChat(text, isOwn, timestamp) {
    const div = document.createElement('div');
    div.className = `message${isOwn ? ' own' : ''}`;
    div.innerHTML = `
    <div class="message-text">${escapeHtml(text)}</div>
    <div class="message-timestamp">${timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
  `;
    document.getElementById('chatMessages').appendChild(div);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}