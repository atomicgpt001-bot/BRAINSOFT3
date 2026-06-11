let currentTopic = "General";
let sessionId = "sesion-" + Date.now();
let vendedor_id = localStorage.getItem('soft3_username') || "Cliente_Soft3";
let knownBotName = localStorage.getItem('soft3_botname') || "Soft 3";

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const currentNodeIndicator = document.getElementById('current-node-indicator');
const chatList = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
const currentUserSpan = document.getElementById('current-user');
const editProfileBtn = document.getElementById('edit-profile-btn');
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const userNameInput = document.getElementById('user-name');
const botNameInput = document.getElementById('bot-name');

// Initialize 3D Graph
let Graph;

function initGraph() {
    const elem = document.getElementById('graph-container');
    
    fetch('/api/graph')
        .then(res => res.json())
        .then(gData => {
            if (!Graph) {
                Graph = ForceGraph3D()(elem)
                    .graphData(gData)
                    .nodeLabel('label')
                    .nodeColor(node => {
                        if (node.group === 0) return '#003366'; // Soft 3 Core
                        if (node.group === 1) return '#0056b3'; // Folders
                        return '#007bff'; // Files
                    })
                    .nodeRelSize(6)
                    .linkColor(() => '#dee2e6')
                    .backgroundColor('#ffffff')
                    .onNodeClick(node => {
                        // Update Context
                        currentTopic = node.label;
                        currentNodeIndicator.textContent = `Rama: ${currentTopic}`;
                        
                        // Center Graph
                        const distance = 40;
                        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                        Graph.cameraPosition(
                            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                            node, // lookAt ({ x, y, z })
                            3000  // ms transition duration
                        );
                        
                        // System message
                        addMessage(`Cambiaste el enfoque a: ${currentTopic}. ¿En qué te ayudo con esta rama?`, false);
                    });
            } else {
                Graph.graphData(gData);
            }
                
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
    
    let finalText = text.replace(/\n/g, '<br>');
    if (!isUser) {
        finalText = `<strong>[${knownBotName}]</strong> ` + finalText;
    }
    contentDiv.innerHTML = finalText;
    
    msgDiv.appendChild(contentDiv);
    chatHistory.appendChild(msgDiv);
    
    // Auto-scroll
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Inicialización de chat
function startChat() {
    chatHistory.innerHTML = '';
    currentUserSpan.textContent = `Usuario: ${vendedor_id}`;
    
    if (vendedor_id === "Cliente_Soft3") {
        addMessage(`SOY TU ASISTENTE DE SOFT 3. ¿En qué puedo ayudarte?`, false);
    } else {
        addMessage(`Hola ${vendedor_id}, soy ${knownBotName}. ¿Con qué te puedo ayudar hoy?`, false);
    }
}

// Profile Logic
function loadProfile() {
    if (!localStorage.getItem('soft3_username')) {
        profileModal.style.display = 'flex';
    } else {
        profileModal.style.display = 'none';
        vendedor_id = localStorage.getItem('soft3_username');
        knownBotName = localStorage.getItem('soft3_botname') || "Soft 3";
        startChat();
    }
}

profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUsername = userNameInput.value.trim();
    const newBotname = botNameInput.value.trim();
    
    if (newUsername && newBotname) {
        localStorage.setItem('soft3_username', newUsername);
        localStorage.setItem('soft3_botname', newBotname);
        vendedor_id = newUsername;
        knownBotName = newBotname;
        profileModal.style.display = 'none';
        startChat();
    }
});

editProfileBtn.addEventListener('click', () => {
    userNameInput.value = vendedor_id === "Cliente_Soft3" ? "" : vendedor_id;
    botNameInput.value = knownBotName;
    profileModal.style.display = 'flex';
});

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
        let extraContext = `El usuario con el que hablas es "${vendedor_id}". Tu nombre es "${knownBotName}". Compórtate como tal y asume esa personalidad.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text + "\n[System Context: " + extraContext + "]",
                topic: currentTopic,
                vendedor_id: vendedor_id,
                session_id: sessionId,
                persona: 'soft3'
            })
        });
        
        const data = await response.json();
        
        // Remove typing
        document.getElementById(typingId).remove();
        
        // Extract new bot name if generated (Fallback in case user asks bot to change its name in chat)
        if (data.response) {
            const matchName = data.response.match(/Me llamaré (.*?) /i);
            if (matchName) {
                knownBotName = matchName[1].trim();
                localStorage.setItem('soft3_botname', knownBotName);
            }
        }
        
        addMessage(data.response || "No hubo respuesta.", false);
        
        // Refresh graph if new node created
        if (data.shouldCreateNode) {
            initGraph(); // Reload data
        }
        
    } catch (err) {
        document.getElementById(typingId).remove();
        addMessage("Error de conexión con el Cerebro Soft 3.", false);
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
    startChat();
});

// Run on start
initGraph();
loadProfile();
