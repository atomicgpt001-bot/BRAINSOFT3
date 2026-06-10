const API_URL = '/api';

// --- State ---
let currentNeurona = 'General';
let currentRama = 'Base';
let currentColor = '#00ffcc';
let isListening = false;

// --- Elements ---
const rootElement = document.documentElement;
const currentTopicBadge = document.getElementById('current-topic-badge');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const voiceStatus = document.getElementById('voice-status');
const globalBrainBtn = document.getElementById('global-brain-btn');
const imageEditorBtn = document.getElementById('image-editor-btn');
const priceListBtn = document.getElementById('price-list-btn');
const dynamicNeuronasContainer = document.getElementById('dynamic-neuronas');

const fileUpload = document.getElementById('file-upload');
const attachBtn = document.getElementById('attach-btn');
const attachmentPreview = document.getElementById('attachment-preview');
const workflowActions = document.getElementById('workflow-actions');
const wfVoiceBtn = document.getElementById('wf-voice-btn');
const wfFinishBtn = document.getElementById('wf-finish-btn');

const mainApp = document.getElementById('main-app');
const authOverlay = document.getElementById('auth-overlay');
const loginAdminBtn = document.getElementById('login-admin-btn');
const loginSalesBtn = document.getElementById('login-sales-btn');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const telegramTokenInput = document.getElementById('telegram-token-input');

const autonomousToggle = document.getElementById('autonomous-toggle');
const modeLabel = document.getElementById('mode-label');

if (autonomousToggle) {
    autonomousToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            modeLabel.innerText = "Autónomo";
            modeLabel.style.color = "#ff3333";
            appendSystemMessage("⚠️ ADVERTENCIA: MODO AUTÓNOMO ACTIVADO. El sistema ejecutará comandos sin pedir permiso.");
        } else {
            modeLabel.innerText = "Cauteloso";
            modeLabel.style.color = "#00ffcc";
            appendSystemMessage("🛡️ MODO CAUTELOSO ACTIVADO. El sistema pedirá permiso antes de ejecutar comandos críticos.");
        }
    });
}

const ttsToggleBtn = document.getElementById('tts-toggle-btn');
let ttsEnabled = true;

const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewFrame = document.getElementById('file-preview-frame');
const closePreviewBtn = document.getElementById('close-preview-btn');

// Fetch user data logic
let currentUser = null;

// Array of nice colors to cycle through
const NEURONA_COLORS = ["#00ffcc", "#ff00ff", "#ffff00", "#ff3333", "#ff9900", "#0066ff", "#00ccff", "#ff00aa"];

// --- Dynamic UI Loader ---
async function loadDynamicUI() {
    try {
        const res = await fetch(`${API_URL}/vault`);
        const vaultStructure = await res.json();
        
        dynamicNeuronasContainer.innerHTML = ''; // Clear existing
        let colorIdx = 0;
        
        vaultStructure.forEach(neuronaObj => {
            const color = NEURONA_COLORS[colorIdx % NEURONA_COLORS.length];
            colorIdx++;
            
            const section = document.createElement('div');
            section.className = 'panel-section';
            
            const h2 = document.createElement('h2');
            h2.innerText = neuronaObj.neurona;
            h2.style.color = color;
            section.appendChild(h2);
            
            const ul = document.createElement('ul');
            ul.className = 'topic-list';
            
            neuronaObj.ramas.forEach(ramaObj => {
                const li = document.createElement('li');
                li.setAttribute('data-neurona', neuronaObj.neurona);
                li.setAttribute('data-rama', ramaObj.rama);
                li.setAttribute('data-color', color);
                li.innerText = ramaObj.rama;
                
                li.addEventListener('click', () => selectRama(li, neuronaObj.neurona, ramaObj.rama, color));
                ul.appendChild(li);
            });
            
            section.appendChild(ul);
            dynamicNeuronasContainer.appendChild(section);
        });
        
        // Auto-select the first one if available
        const firstLi = dynamicNeuronasContainer.querySelector('li');
        if (firstLi) {
            firstLi.click();
        }
        
    } catch (e) {
        console.error("Error loading dynamic UI", e);
    }
}

function selectRama(liElement, neurona, rama, color) {
    document.querySelectorAll('.topic-list li').forEach(i => {
        i.classList.remove('active');
        i.style.borderLeftColor = 'transparent';
    });

    currentNeurona = neurona;
    currentRama = rama;
    currentColor = color;

    if (liElement) {
        liElement.classList.add('active');
        liElement.style.borderLeftColor = currentColor;
    }

    rootElement.style.setProperty('--accent', currentColor);
    currentTopicBadge.innerText = `[ ${currentNeurona.toUpperCase()} > ${currentRama.toUpperCase()} ]`;
    currentTopicBadge.style.color = currentColor;
    currentTopicBadge.style.textShadow = `0 0 5px ${currentColor}`;

    appendSystemMessage(`Enlace establecido: ${currentNeurona} / ${currentRama}`);
    
    // Tell the graph to add this node
    window.addNeuralNode(currentNeurona, currentRama, currentColor);
    
    if (window.focusNodeInGraph) {
        window.focusNodeInGraph(currentRama);
    }
}

// --- Global Tools Logic ---
globalBrainBtn.addEventListener('click', async () => {
    appendSystemMessage('Fetching Global Brain structure...');
    try {
        const res = await fetch(`${API_URL}/vault`);
        const vaultStructure = await res.json();
        window.renderGlobalGraph(vaultStructure);
        appendSystemMessage('Global Brain loaded.');
    } catch (e) {
        appendSystemMessage('Error fetching Global Brain: ' + e.message);
    }
});

imageEditorBtn.addEventListener('click', () => {
    appendSystemMessage('Launching Image Editor...');
    window.openPreview('/editor');
});

priceListBtn.addEventListener('click', () => {
    appendSystemMessage('Fetching Price List...');
    window.openPreview('/prices');
});

// --- Collapse Logic ---
const leftPanel = document.getElementById('left-panel');
const leftCollapseBtn = document.getElementById('left-collapse-btn');
leftCollapseBtn.addEventListener('click', () => {
    leftPanel.classList.toggle('collapsed');
    setTimeout(() => {
        if (window.Graph) {
            window.Graph.width(document.getElementById('graph-container').clientWidth);
        }
    }, 450);
});

const rightPanel = document.getElementById('right-panel');
const rightCollapseBtn = document.getElementById('right-collapse-btn');
rightCollapseBtn.addEventListener('click', () => {
    rightPanel.classList.toggle('collapsed');
    setTimeout(() => {
        if (window.Graph) {
            window.Graph.width(document.getElementById('graph-container').clientWidth);
        }
    }, 450);
});

// --- Chat Logic ---
function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerText = `> ${text}`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Add to 3D graph
    if (window.addChatMessageNode) {
        window.addChatMessageNode(text, true, currentNeurona ? `${currentNeurona}_${currentRama}` : null);
    }
}

function appendAIMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg ai';
    div.innerHTML = `SYS: ${text.replace(/\[⬇️ Descargar archivo generado\]\((.*?)\)/g, '<br><br><button class="sys-btn" onclick="openPreview(\'http://localhost:3050$1\')">📄 ABRIR ARCHIVO GENERADO</button>')}`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Add to 3D graph
    if (window.addChatMessageNode) {
        window.addChatMessageNode(text, false, currentNeurona ? `${currentNeurona}_${currentRama}` : null);
    }
}

window.executeCommand = async function(command) {
    appendSystemMessage(`Executing: ${command}`);
    try {
        const res = await fetch(`${API_URL}/execute-command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const data = await res.json();
        if (data.success) {
            appendSystemMessage(`Execution Result:\n${data.output}`);
        } else {
            appendSystemMessage(`Execution Error:\n${data.error}`);
        }
    } catch(e) {
        appendSystemMessage(`Execution Network Error.`);
    }
};

function appendCommandApproval(command) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.style.borderLeftColor = '#ff3333';
    div.innerHTML = `
        <div style="color:#ff3333; margin-bottom:5px;">⚠️ ALERTA DE PERMISO: El sistema requiere ejecutar un comando en el servidor:</div>
        <pre style="background:#000; padding:10px; border:1px solid #333; color:#fff; overflow-x:auto;">${command}</pre>
        <div style="margin-top:10px; display:flex; gap:10px;">
            <button class="sys-btn" style="color:#00ffcc; border-color:#00ffcc;" onclick="executeCommand('${command.replace(/'/g, "\\'")}'); this.parentElement.innerHTML='Comando Aprobado';">APROBAR</button>
            <button class="sys-btn" style="color:#ff3333; border-color:#ff3333;" onclick="this.parentElement.innerHTML='Comando Rechazado';">RECHAZAR</button>
        </div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Preview Logic
window.openPreview = function(url) {
    filePreviewFrame.src = url;
    filePreviewContainer.style.display = 'block';
};
closePreviewBtn.addEventListener('click', () => {
    filePreviewContainer.style.display = 'none';
    filePreviewFrame.src = '';
});

// --- File Attachments & Drag/Drop ---
let currentFiles = [];

attachBtn.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
    currentFiles = Array.from(e.target.files);
    updateAttachmentPreview();
});

chatInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    chatInput.style.border = `2px solid ${currentColor}`;
});

chatInput.addEventListener('dragleave', (e) => {
    e.preventDefault();
    chatInput.style.border = '1px solid #333';
});

chatInput.addEventListener('drop', (e) => {
    e.preventDefault();
    chatInput.style.border = '1px solid #333';
    if (e.dataTransfer.files.length > 0) {
        currentFiles = Array.from(e.dataTransfer.files);
        updateAttachmentPreview();
    }
});

function updateAttachmentPreview() {
    if (currentFiles.length === 0) {
        attachmentPreview.innerText = '';
        return;
    }
    const names = currentFiles.map(f => f.name).join(', ');
    attachmentPreview.innerText = `📎 Attached: ${names}`;
}

// --- Workflow Actions ---
wfVoiceBtn.addEventListener('click', () => {
    if (!isListening && recognition) recognition.start();
});

wfFinishBtn.addEventListener('click', () => {
    chatInput.value = "[SYS_CMD: FINALIZAR REPORTE]";
    sendMessage();
});

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && currentFiles.length === 0) return;

    if (text === "[SYS_CMD: FINALIZAR REPORTE]") {
        appendUserMessage(">> ENVIANDO REPORTE Y FINALIZANDO FLUJO...");
    } else {
        appendUserMessage(text + (currentFiles.length > 0 ? ` [${currentFiles.length} files attached]` : ''));
    }
    
    chatInput.value = '';
    
    if (window.highlightPath) window.highlightPath(currentRama);
    
    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    appendSystemMessage(`<div id="${loadingId}">[ TRANSMITTING... ]</div>`);

    try {
        let response;
        let extraContext = `El usuario con el que hablas es "${vendedorId}". Si el usuario te pidió que te llames de alguna forma, asume esa personalidad y responde acordemente.`;

        if (currentFiles.length > 0) {
            const formData = new FormData();
            formData.append('message', text + "\n[System Context: " + extraContext + "]");
            formData.append('topic', currentRama || "Ventas");
            formData.append('vendedor_id', vendedorId);
            formData.append('persona', 'icaro');
            currentFiles.forEach(f => formData.append('files', f));
            
            response = await fetch(`${API_URL}/chat-upload`, {
                method: 'POST',
                body: formData
            });
            currentFiles = [];
            fileUpload.value = '';
            updateAttachmentPreview();
        } else {
            response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text + "\n[System Context: " + extraContext + "]", 
                    topic: currentRama || "Ventas", 
                    vendedor_id: vendedorId, 
                    persona: "icaro" 
                })
            });
        }

        const data = await response.json();
        
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        
        appendAIMessage(data.response);
        speakText(data.response);

        if (data.shouldCreateNode) {
            appendSystemMessage(`Node Created/Updated: ${data.neurona}/${data.rama}`);
            window.addNeuralNode(data.neurona, data.rama, currentColor);
            
            // If the AI created a NEW neurona or rama, reload the UI to show it!
            if (data.neurona !== currentNeurona || data.rama !== currentRama) {
                loadDynamicUI();
            }
        }

        if (data.showWorkflowButtons) {
            workflowActions.style.display = 'flex';
        } else if (data.hideWorkflowButtons) {
            workflowActions.style.display = 'none';
        }

        if (data.terminalCommand) {
            const isAutonomous = document.getElementById('autonomous-toggle').checked;
            if (isAutonomous) {
                appendSystemMessage(`MODO AUTÓNOMO ACTIVO: Ejecutando comando automáticamente...`);
                window.executeCommand(data.terminalCommand);
            } else {
                appendCommandApproval(data.terminalCommand);
            }
        }

        if (window.resetHighlight) setTimeout(window.resetHighlight, 1000);

    } catch (err) {
        console.error(err);
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        appendSystemMessage("Error connecting to Neural Core. (503 Overload o red caída)");
        if (window.resetHighlight) window.resetHighlight();
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

const assignNodeBtn = document.getElementById('assign-node-btn');
if (assignNodeBtn) {
    assignNodeBtn.addEventListener('click', () => {
        const advisor = document.getElementById('advisor-select').value;
        if (!currentNeurona || !currentRama) {
            appendSystemMessage("⚠️ Selecciona un nodo en el Cerebro Global primero.");
            return;
        }
        chatInput.value = `[SYS_CMD: ASIGNAR ESTE NODO A ASESOR: ${advisor}. Etiqueta el archivo con el asesor y resume el contexto.]`;
        sendMessage();
    });
}

// --- Node Summary Logic ---
window.fetchNodeSummary = async function(neurona, rama, fileName) {
    appendSystemMessage(`Fetching summary for ${fileName}...`);
    try {
        const response = await fetch(`${API_URL}/node/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ neurona, rama, fileName })
        });
        const data = await response.json();
        appendAIMessage(`[SUMMARY: ${fileName}] ${data.summary}`);
        speakText(data.summary);
    } catch (err) {
        appendSystemMessage("Error fetching node summary.");
    }
};

// --- Voice Recognition (Web Speech API) ---
let recognition;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onstart = function() {
        isListening = true;
        micBtn.classList.add('active');
        voiceStatus.innerText = "Listening...";
        appendSystemMessage("Mic active.");
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        sendMessage();
    };

    recognition.onerror = function(event) {
        console.error("Speech error:", event.error);
        voiceStatus.innerText = "Error: " + event.error;
    };

    recognition.onend = function() {
        isListening = false;
        micBtn.classList.remove('active');
        voiceStatus.innerText = "Microphone Off";
    };
} else {
    voiceStatus.innerText = "Voice not supported.";
    micBtn.disabled = true;
}

micBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        if (recognition) recognition.start();
    }
});

// --- Text to Speech ---
ttsToggleBtn.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggleBtn.innerHTML = ttsEnabled ? '<span class="icon">🔊</span> TTS: ON' : '<span class="icon">🔇</span> TTS: OFF';
});

function speakText(text) {
    if (!ttsEnabled) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        // Remove markdown elements or buttons before reading
        const cleanText = text.replace(/\[⬇️ Descargar archivo generado\]\(.*?\)/g, 'El archivo ha sido generado.');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        const voices = window.speechSynthesis.getVoices();
        
        const maleVoice = voices.find(v => 
            v.lang.startsWith('es') && 
            (v.name.includes('Pablo') || v.name.includes('Jorge') || v.name.toLowerCase().includes('male'))
        ) || voices.find(v => v.lang.startsWith('es'));
        
        if (maleVoice) utterance.voice = maleVoice;
        
        utterance.rate = 1.35;
        utterance.pitch = 0.9;
        
        window.speechSynthesis.speak(utterance);
    }
}


let vendedorId = "Vendedor Nuevo";

function checkAuth() {
    if (currentUser) {
        authOverlay.style.display = 'none';
        mainApp.style.display = 'flex';
        
        if(currentUser.role === 'admin') {
            imageEditorBtn.style.display = 'block';
            document.getElementById('admin-mode-container').style.display = 'flex';
        } else {
            globalBrainBtn.style.display = 'none';
            imageEditorBtn.style.display = 'none';
            document.getElementById('admin-mode-container').style.display = 'none';
        }
        
        document.getElementById('user-badge').innerText = vendedorId;
        
        // Chat inicial
        chatHistory.innerHTML = '';
        if (vendedorId === "Vendedor Nuevo") {
            appendSystemMessage("SOY TU ASISTENTE. DIME CÓMO TE GUSTARÍA QUE ME LLAME, Y TÚ, ¿CÓMO TE LLAMAS?");
        } else {
            appendSystemMessage(`Hola ${vendedorId}, ¿con qué te puedo ayudar hoy?`);
        }
        
        loadDynamicUI();
    } else {
        authOverlay.style.display = 'flex';
        mainApp.style.display = 'none';
    }
}

loginAdminBtn.addEventListener('click', () => {
    const user = authUsername.value.trim().toLowerCase();
    const pass = authPassword.value.trim();
    if (user === 'admin' && pass === '1234') {
        currentUser = { role: 'admin' };
        vendedorId = "Administrador";
        authError.innerText = '';
        checkAuth();
    } else {
        authError.innerText = "Credenciales incorrectas.";
    }
});

loginSalesBtn.addEventListener('click', () => {
    const user = authUsername.value.trim();
    if (!user || user.toLowerCase() === 'admin') {
        vendedorId = "Vendedor Nuevo";
    } else {
        vendedorId = user;
    }
    currentUser = { role: 'sales' };
    authError.innerText = '';
    checkAuth();
});

// Remove API logic and initialization call to checkAuth
checkAuth();

settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

saveSettingsBtn.addEventListener('click', async () => {
    const token = telegramTokenInput.value;
    try {
        await fetch(`${API_URL}/settings/telegram`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token})
        });
        settingsModal.style.display = 'none';
        appendSystemMessage('Telegram bot settings updated.');
    } catch(e) {
        alert('Error saving settings');
    }
});

// Init
checkAuth();
