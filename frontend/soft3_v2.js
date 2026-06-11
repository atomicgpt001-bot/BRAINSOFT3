// ─── STATE ───────────────────────────────────────────────────────────────────
let currentTopic = 'General';
let sessionId    = 'sesion-' + Date.now();
let vendedor_id  = localStorage.getItem('soft3_username') || 'ATOMIC';
let knownBotName = localStorage.getItem('soft3_botname')  || 'Soft 3';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const chatHistory   = document.getElementById('chat-history');
const chatForm      = document.getElementById('chat-form');
const messageInput  = document.getElementById('message-input');
const newChatBtn    = document.getElementById('new-chat-btn');
const currentUser   = document.getElementById('current-user');
const editProfileBtn = document.getElementById('edit-profile-btn');
const chatTopicSpan = document.getElementById('chat-topic');
const nodeIndicator = document.getElementById('current-node-indicator');

// ─── COLOUR MAP ──────────────────────────────────────────────────────────────
const GROUP_COLORS = {
    0: '#58a6ff', // Núcleo
    1: '#3fb950', // Softres root
    2: '#39d353', // Módulos Softres
    3: '#bc8cff', // Módulos Soft 3
    4: '#e3b341', // Commits
    5: '#f78166', // Errores
    6: '#79c0ff', // Bóveda folders
    7: '#adbac7', // Bóveda files
};

// ─── 3D GRAPH ─────────────────────────────────────────────────────────────────
let Graph;

function initGraph() {
    const elem = document.getElementById('graph-container');
    if (!elem) return;

    fetch('/api/graph')
        .then(r => r.json())
        .then(gData => {
            if (!Graph) {
                Graph = ForceGraph3D()(elem)
                    .backgroundColor('#0d1117')
                    .graphData(gData)
                    .nodeLabel('label')
                    .nodeColor(node => GROUP_COLORS[node.group] || '#8b949e')
                    .nodeRelSize(5)
                    .nodeVal(node => node.size || 4)
                    .linkColor(() => '#30363d')
                    .linkOpacity(0.6)
                    .onNodeClick(node => {
                        currentTopic = node.label;
                        chatTopicSpan.textContent = node.label;
                        nodeIndicator.textContent = `Enfocado: ${node.label}`;

                        const dist = 60;
                        const ratio = 1 + dist / Math.hypot(node.x, node.y, node.z);
                        Graph.cameraPosition(
                            { x: node.x * ratio, y: node.y * ratio, z: node.z * ratio },
                            node,
                            800
                        );

                        addMessage(`📍 Contexto cambiado a: <strong>${node.label}</strong>. ¿En qué te puedo ayudar con este módulo?`, false);
                    });

                window.addEventListener('resize', () => {
                    if (Graph) {
                        Graph.width(elem.clientWidth).height(elem.clientHeight);
                    }
                });
            } else {
                Graph.graphData(gData);
            }
        })
        .catch(err => console.error('[Graph] Error loading graph data:', err));
}

// ─── CHAT UTILS ──────────────────────────────────────────────────────────────
function addMessage(html, isUser) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-content';

    if (!isUser) {
        bubble.innerHTML = `<strong style="color:#58a6ff">[${knownBotName}]</strong> ${html}`;
    } else {
        bubble.textContent = html;
    }

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const now = new Date();
    meta.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);
    chatHistory.appendChild(wrapper);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function startChat() {
    chatHistory.innerHTML = '';
    currentUser.textContent = vendedor_id;
    addMessage(`¡Hola <strong>${vendedor_id}</strong>! Soy <strong>${knownBotName}</strong>. Puedes hacerme clic en cualquier nodo del mapa para enfocarme en ese tema. ¿En qué te ayudo?`, false);
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
editProfileBtn.addEventListener('click', () => {
    const newName = prompt('¿Cuál es tu nombre de usuario?', vendedor_id);
    if (newName && newName.trim()) {
        vendedor_id = newName.trim();
        localStorage.setItem('soft3_username', vendedor_id);
        currentUser.textContent = vendedor_id;
        addMessage(`Perfecto, ahora te llamo <strong>${vendedor_id}</strong>.`, false);
    }
});

// ─── NEW CHAT ─────────────────────────────────────────────────────────────────
newChatBtn.addEventListener('click', () => {
    sessionId = 'sesion-' + Date.now();
    currentTopic = 'General';
    chatTopicSpan.textContent = 'General';
    startChat();
});

// ─── SUBMIT ──────────────────────────────────────────────────────────────────
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    addMessage(text, true);

    // Typing indicator
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = typingId;
    typingDiv.innerHTML = '<div class="message-content"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const context = `El usuario es "${vendedor_id}". Tu nombre es "${knownBotName}". Módulo activo: "${currentTopic}".`;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text + '\n[Context: ' + context + ']',
                topic: currentTopic,
                vendedor_id,
                session_id: sessionId,
                persona: 'soft3'
            })
        });

        const data = await response.json();
        document.getElementById(typingId)?.remove();

        if (data.response) {
            // Auto-detect bot name change
            const nameMatch = data.response.match(/me llamaré (\S+)/i);
            if (nameMatch) {
                knownBotName = nameMatch[1];
                localStorage.setItem('soft3_botname', knownBotName);
            }
            addMessage(data.response.replace(/\n/g, '<br>'), false);
        } else {
            addMessage('Sin respuesta del servidor.', false);
        }

        if (data.shouldCreateNode) {
            initGraph(); // refresh graph with new node
        }
    } catch (err) {
        document.getElementById(typingId)?.remove();
        addMessage('❌ Error de conexión con el Cerebro Soft 3. Verifica que el servidor esté corriendo.', false);
        console.error('[Chat]', err);
    }
});

// ─── TEXTAREA AUTO-RESIZE ─────────────────────────────────────────────────────
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
initGraph();
startChat();
