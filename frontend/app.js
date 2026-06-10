let isAdmin = false;
let vendedorId = "Vendedor_Anonimo";
let sessionId = "sesion_" + Date.now();
let knownBotName = "ICARO";

// DOM Elements
const loginOverlay = document.getElementById('identity-modal');
const mainContainer = document.getElementById('main-container');
const btnLoginAdmin = document.getElementById('identity-submit');
const btnLoginSales = document.getElementById('identity-sales');
const usernameInput = document.getElementById('identity-username');
const passwordInput = document.getElementById('identity-password');
const currentUserBadge = document.getElementById('current-user-badge');

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');

// Panel Elements
const centerPanel = document.getElementById('center-panel');
const pricePanel = document.getElementById('price-panel');
const pricesList = document.getElementById('prices-list');
const priceEditorText = document.getElementById('price-editor-text');
const btnSavePrices = document.getElementById('btn-save-prices');

// Buttons
const btnCerebro = document.getElementById('btn-cerebro');
const btnPrecios = document.getElementById('btn-precios');
const btnImagenes = document.getElementById('btn-imagenes');

// --- LOGIN LOGIC ---
btnLoginAdmin.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        isAdmin = true;
        vendedorId = "Administrador";
        enterApp();
    } else {
        alert("Credenciales incorrectas para Admin.");
    }
});

btnLoginSales.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    if (!user || user.toLowerCase() === 'admin') {
        vendedorId = "Vendedor Nuevo";
    } else {
        vendedorId = user;
    }
    isAdmin = false;
    enterApp();
});

function enterApp() {
    loginOverlay.style.display = 'none';
    mainContainer.style.display = 'flex';
    currentUserBadge.textContent = `[ ${vendedorId} ]`;
    
    // First message logic
    chatHistory.innerHTML = '';
    if (vendedorId === "Vendedor Nuevo") {
        addMessage(`Hola, ¿con qué te puedo ayudar hoy? Veo que eres nuevo... ¿Cómo te llamas y cómo te gustaría llamarme a mí?`, false);
    } else {
        addMessage(`Hola ${vendedorId}, ¿con qué te puedo ayudar hoy?`, false);
    }

    if (isAdmin) {
        centerPanel.style.display = 'flex';
        priceEditorText.style.display = 'block';
        btnSavePrices.style.display = 'block';
        init3DGraph();
    } else {
        centerPanel.style.display = 'none';
        priceEditorText.style.display = 'none';
        btnSavePrices.style.display = 'none';
    }
    
    fetchPrices();
}

// --- BUTTON LOGIC ---
btnCerebro.addEventListener('click', () => {
    if (isAdmin) {
        centerPanel.style.display = 'flex';
        pricePanel.style.display = 'none';
    } else {
        alert("El Cerebro Virtual 3D es exclusivo para Administradores.");
    }
});

btnPrecios.addEventListener('click', () => {
    centerPanel.style.display = 'none';
    pricePanel.style.display = 'flex';
});

btnImagenes.addEventListener('click', () => {
    addMessage("La función de Generador de Imágenes requiere vinculación con DALL-E/Midjourney. Envíame un prompt y lo simularé por ahora.", false);
});

// --- PRICE LIST LOGIC ---
async function fetchPrices() {
    try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        pricesList.textContent = data.content;
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

// --- CHAT LOGIC ---
function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${isUser ? 'user' : 'system'}`;
    
    // Si es del sistema (bot), agregar el prefijo del nombre si aplica
    let finalText = text.replace(/\n/g, '<br>');
    if (!isUser) {
        finalText = `<strong style="color: #00ffcc;">[${knownBotName}]</strong> ` + finalText;
    }
    
    msgDiv.innerHTML = finalText;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = '';

    // Lógica para detectar si el usuario dice cómo llamarse o cómo llamar al bot
    if (vendedorId === "Vendedor Nuevo" && text.toLowerCase().includes("llamo") && text.toLowerCase().includes("llámate")) {
        vendedorId = "Vendedor Registrado"; // Evitamos que lo vuelva a preguntar
    }

    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg system';
    typingDiv.id = typingId;
    typingDiv.innerHTML = `[Procesando...]`;
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        // Le pasamos el system prompt especial para que sepa su rol y el nombre del usuario
        let extraContext = `El usuario con el que hablas es "${vendedorId}". Si el usuario te pidió que te llames de alguna forma, asume esa personalidad y responde acordemente.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text + "\n[System Context: " + extraContext + "]",
                topic: "Ventas",
                vendedor_id: vendedorId,
                session_id: sessionId,
                persona: 'icaro'
            })
        });
        
        const data = await response.json();
        document.getElementById(typingId).remove();
        
        // Tratar de extraer si el bot asumió un nuevo nombre
        const matchName = data.response.match(/Me llamaré (.*?) /i);
        if (matchName) {
            knownBotName = matchName[1].trim();
        }

        addMessage(data.response, false);
        
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

// --- 3D GRAPH (Admin Only) ---
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
                .backgroundColor('#000000')
                .linkColor(() => '#00ffcc')
                .nodeRelSize(5);
        } else {
            Graph.graphData(gData);
        }
    } catch (e) {
        console.error("Error loading 3D Graph", e);
    }
}
