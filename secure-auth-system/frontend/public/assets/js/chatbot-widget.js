// AI Security Assistant chatbot widget. Injects its own HTML into the page
// (so dashboard pages just need to include this script + call initChatbotWidget()),
// keeps conversation history in memory, and calls POST /api/ai/chat.

let chatHistory = [];

function initChatbotWidget() {
  const widgetHtml = `
    <button class="chatbot-fab" id="chatbotFab" aria-label="Open AI Security Assistant">&#128172;</button>
    <div class="chatbot-panel" id="chatbotPanel">
      <div class="chatbot-header">
        <div class="chatbot-header-title">&#129302; AI Security Assistant</div>
        <button class="chatbot-close" id="chatbotClose">&#10005;</button>
      </div>
      <div class="chatbot-messages" id="chatbotMessages">
        <div class="chatbot-msg assistant">Hi! I'm your AI security assistant. Ask me anything about passwords, 2FA, brute-force attacks, or how this app protects your account.</div>
      </div>
      <div class="chatbot-input-row">
        <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Ask a security question..." maxlength="1000">
        <button class="chatbot-send" id="chatbotSend" aria-label="Send">&#10148;</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  const fab = document.getElementById('chatbotFab');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const input = document.getElementById('chatbotInput');
  const sendBtn = document.getElementById('chatbotSend');
  const messagesEl = document.getElementById('chatbotMessages');

  fab.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chatbot-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';
    sendBtn.disabled = true;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-msg assistant';
    typingDiv.textContent = 'Thinking...';
    messagesEl.appendChild(typingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const result = await api.post('/ai/chat', { message, history: chatHistory });
      typingDiv.remove();
      appendMessage('assistant', result.reply);

      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: result.reply });
      if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
    } catch (err) {
      typingDiv.remove();
      appendMessage('assistant', err.message || "Sorry, I couldn't process that right now.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}
