/**
 * Onevora AI Assistant Logic
 */

const AI_API_BASE = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5001/api';

function toggleAIChat() {
    const window = document.getElementById('ai-chat-window');
    window.classList.toggle('open');
    if (window.classList.contains('open')) {
        document.getElementById('ai-chat-input').focus();
    }
}

function sendQuickMessage(msg) {
    document.getElementById('ai-chat-input').value = msg;
    sendAIChat();
}

async function sendAIChat() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Append user message
    appendMessage('user', message);
    input.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        const res = await fetch(`${AI_API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Append bot response
        appendMessage('bot', data.reply);

        // Append product suggestions if any
        if (data.products && data.products.length > 0) {
            appendProducts(data.products);
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        appendMessage('bot', 'Xin lỗi, tôi đang gặp chút sự cố kết nối. Bạn vui lòng thử lại sau nhé!');
    }
}

function appendMessage(sender, text) {
    const chatBody = document.getElementById('ai-chat-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${sender}`;
    msgDiv.innerText = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function appendProducts(products) {
    const chatBody = document.getElementById('ai-chat-body');
    const container = document.createElement('div');
    container.className = 'ai-products-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 8px;';

    products.forEach(p => {
        const card = document.createElement('a');
        card.className = 'ai-product-suggestion';
        card.href = `product-detail.html?id=${p.id}`;
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <div class="ai-product-info">
                <h5>${p.name}</h5>
                <p>${p.price.toLocaleString()}đ</p>
            </div>
        `;
        container.appendChild(card);
    });

    chatBody.appendChild(container);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
    const chatBody = document.getElementById('ai-chat-body');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'ai-message bot typing';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
