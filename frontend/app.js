let isAdmin = false;
let vendedorId = "Vendedor";
let sessionId = Date.now().toString();

// Elements
const loginOverlay = document.getElementById('login-overlay');
const mainContainer = document.getElementById('main-container');
const btnLoginAdmin = document.getElementById('btn-login-admin');
const btnLoginSales = document.getElementById('btn-login-sales');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const pricesList = document.getElementById('prices-list');
const editorPanel = document.getElementById('editor-panel');
const priceEditorText = document.getElementById('price-editor-text');
const btnSavePrices = document.getElementById('btn-save-prices');
const graphContainer = document.getElementById('graph-container');

// Login Logic
btnLoginAdmin.addEventListener('click', () => {
    const user = usernameInput.value.trim().toLowerCase();
    const pass = passwordInput.value.trim();
    if (user === 'admin' && pass === '1234') {
        isAdmin = true;
        vendedorId = "Admin";
        enterApp();
    } else {
        alert("Credenciales incorrectas");
    }
});

btnLoginSales.addEventListener('click', () => {
    const user = usernameInput.value.trim() || "Vendedor";
    isAdmin = false;
    vendedorId = user;
    enterApp();
});

function enterApp() {
    loginOverlay.style.display = 'none';
    mainContainer.style.display = 'flex';
    
    fetchPrices();

    if (isAdmin) {
        editorPanel.style.display = 'block';
        graphContainer.style.display = 'block';
        init3DGraph();
    } else {
        editorPanel.style.display = 'none';
        graphContainer.style.display = 'none';
    }
}

// Price List Logic
async function fetchPrices() {
    try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        const lines = data.content.split('\n');
        
        pricesList.innerHTML = '';
        lines.forEach(line => {
            if (line.trim() !== '') {
                const parts = line.split('-');
                const name = parts[0] ? parts[0].trim() : '';
                const price = parts[1] ? parts[1].trim() : '';
                if (name) {
                    const div = document.createElement('div');
                    div.className = 'price-item';
                    div.innerHTML = `<span>${name}</span><span>${price ? '- ' + price : ''}</span>`;
                    pricesList.appendChild(div);
                }
            }
        });

        if (isAdmin) {
            priceEditorText.value = data.content;
        }
    } catch (e) {
        console.error("Error fetching prices", e);
    }
}

btnSavePrices.addEventListener('click', async () => {
    const newContent = priceEditorText.value;
    try {
        await fetch('/api/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newContent })
        });
        alert("Precios guardados correctamente");
        fetchPrices();
    } catch (e) {
        console.error(e);
        alert("Error al guardar precios");
    }
});

// Chat Logic
function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    msgDiv.innerHTML = `<div class="message-content">${text.replace(/\n/g, '<br>')}</div>`;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = '';

    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = typingId;
    typingDiv.innerHTML = `<div class="message-content">Procesando...</div>`;
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                topic: "Ventas",
                vendedor_id: vendedorId,
                session_id: sessionId,
                persona: 'icaro'
            })
        });
        
        const data = await response.json();
        document.getElementById(typingId).remove();
        addMessage(data.response, false);
        
        // Si el admin está conectado, tal vez refrescar el grafo
        if (isAdmin && data.shouldCreateNode) {
            init3DGraph();
        }
    } catch (err) {
        document.getElementById(typingId).remove();
        addMessage("Error de conexión.", false);
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// 3D Graph Logic (Admin only)
let Graph;
async function init3DGraph() {
    try {
        const res = await fetch('/api/graph');
        const gData = await res.json();
        
        if (!Graph) {
            Graph = ForceGraph3D()(graphContainer)
                .graphData(gData)
                .nodeAutoColorBy('group')
                .nodeLabel('label')
                .backgroundColor('#000000');
        } else {
            Graph.graphData(gData);
        }
    } catch (e) {
        console.error("Error loading 3D Graph", e);
    }
}
