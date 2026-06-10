let currentTopic = "General";
let sessionId = "sesion-" + Date.now();
const vendedor_id = "Administrador";

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const currentNodeIndicator = document.getElementById('current-node-indicator');
const chatList = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');

// Initialize 2D Graph
let Graph;

function initGraph() {
    const elem = document.getElementById('graph-container');
    
    fetch('/api/graph')
        .then(res => res.json())
        .then(gData => {
            Graph = ForceGraph()(elem)
                .graphData(gData)
                .nodeLabel('label')
                .nodeColor(node => {
                    if (node.group === 0) return '#003366'; // Soft 3 Core
                    if (node.group === 1) return '#0056b3'; // Folders
                    return '#007bff'; // Files
                })
                .nodeRelSize(6)
                .linkColor(() => '#dee2e6')
                .onNodeClick(node => {
                    // Update Context
                    currentTopic = node.label;
                    currentNodeIndicator.textContent = `Rama: ${currentTopic}`;
                    
                    // Center Graph
                    Graph.centerAt(node.x, node.y, 1000);
                    Graph.zoom(8, 2000);
                    
                    // System message
                    addMessage(`Cambiaste el enfoque a: ${currentTopic}. ¿En qué te ayudo con esta rama?`, false);
                });
                
            // Setup resizing
            window.addEventListener('resize', () => {
                Graph.width(elem.clientWidth).height(elem.clientHeight);
            });
        });
}

function addMessage(text, isUser) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    msgDiv.appendChild(contentDiv);
    chatHistory.appendChild(msgDiv);
    
    // Auto-scroll
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Handle Chat Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    
    messageInput.value = '';
    addMessage(text, true);
    
    // Show typing indicator
    const typingId = "typing-" + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = typingId;
    typingDiv.innerHTML = '<div class="message-content">...</div>';
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                topic: currentTopic,
                vendedor_id: vendedor_id,
                session_id: sessionId,
                persona: 'icaro'
            })
        });
        
        const data = await response.json();
        
        // Remove typing
        document.getElementById(typingId).remove();
        
        addMessage(data.response || "No hubo respuesta.", false);
        
        // Refresh graph if new node created
        if (data.shouldCreateNode) {
            initGraph(); // Reload data
        }
        
    } catch (err) {
        document.getElementById(typingId).remove();
        addMessage("Error de conexión con el Cerebro Icaro.", false);
        console.error(err);
    }
});

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value === '') {
        this.style.height = 'auto';
    }
});

messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Session Management (Mock)
newChatBtn.addEventListener('click', () => {
    sessionId = "sesion-" + Date.now();
    chatHistory.innerHTML = `
        <div class="message ai-message">
            <div class="message-content">
                Hola, soy ICARO. Se ha iniciado una nueva sesión.
            </div>
        </div>`;
    
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'chat-item active';
    sessionDiv.innerHTML = `<span>Nueva Sesión</span>`;
    
    // Deselect others
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    
    chatList.prepend(sessionDiv);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initGraph();
    
    // Add default session to list
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'chat-item active';
    sessionDiv.innerHTML = `<span>Sesión Actual</span>`;
    chatList.appendChild(sessionDiv);
});
