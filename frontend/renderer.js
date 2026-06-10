const API_URL = 'http://localhost:3050/api';

// --- Identity Logic ---
const identityModal = document.getElementById('identity-modal');
const identityInput = document.getElementById('identity-input');
const identitySubmit = document.getElementById('identity-submit');

let vendedorId = localStorage.getItem('vendedor_id');

function checkIdentity() {
    if (vendedorId === 'ADMIN_MASTER') {
        window.location.href = 'admin.html';
        return;
    }
    
    if (vendedorId) {
        identityModal.style.display = 'none';
        appendSystemMessage(`Bienvenido, Vendedor: ${vendedorId}. Enlace neuronal establecido.`);
    } else {
        identityModal.style.display = 'flex';
    }
}

identitySubmit.addEventListener('click', () => {
    const val = identityInput.value.trim();
    if (val) {
        vendedorId = val;
        localStorage.setItem('vendedor_id', val);
        checkIdentity();
    }
});

// Run on load
checkIdentity();

// --- State ---
let currentTopic = 'Atomic';
let currentColor = '#00ffcc';
let isListening = false;

// --- Elements ---
const topicItems = document.querySelectorAll('.topic-list li');
const rootElement = document.documentElement;
const currentTopicBadge = document.getElementById('current-topic-badge');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const voiceStatus = document.getElementById('voice-status');
const globalBrainBtn = document.getElementById('global-brain-btn');

const fileUpload = document.getElementById('file-upload');
const attachBtn = document.getElementById('attach-btn');
const attachmentPreview = document.getElementById('attachment-preview');
const workflowActions = document.getElementById('workflow-actions');
const wfVoiceBtn = document.getElementById('wf-voice-btn');
const wfFinishBtn = document.getElementById('wf-finish-btn');

// --- Global Brain Logic ---
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

// --- Topic Switching Logic ---
topicItems.forEach(item => {
    item.addEventListener('click', () => {
        topicItems.forEach(i => {
            i.classList.remove('active');
            i.style.borderLeftColor = 'transparent';
        });

        currentTopic = item.getAttribute('data-topic');
        currentColor = item.getAttribute('data-color');

        item.classList.add('active');
        item.style.borderLeftColor = currentColor;

        rootElement.style.setProperty('--accent', currentColor);
        currentTopicBadge.innerText = `[ ${currentTopic.toUpperCase()} ]`;
        currentTopicBadge.style.color = currentColor;
        currentTopicBadge.style.textShadow = `0 0 5px ${currentColor}`;

        appendSystemMessage(`Topic changed to ${currentTopic}. Neural pathways aligned.`);
        window.addNeuralNode(currentTopic, null, currentColor);
        
        // Travel to node in 3D space
        if (window.focusNodeInGraph) {
            window.focusNodeInGraph(currentTopic);
        }
    });
});

document.querySelector('[data-topic="Atomic"]').click();

// Automatically load Global Brain on startup
setTimeout(() => globalBrainBtn.click(), 500);

// --- Chat Logic ---
function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerText = `> ${text}`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendAIMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg ai';
    div.innerText = `SYS: ${text}`;
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
    
    // Trigger Neural Animation
    if (window.highlightPath) window.highlightPath(currentTopic);
    
    try {
        appendSystemMessage('Orchestrating... (Gemini -> OpenClae)');
        let response;
        
        if (currentFiles.length > 0) {
            const formData = new FormData();
            formData.append('message', text);
            formData.append('topic', currentTopic);
            formData.append('vendedor_id', vendedorId);
            currentFiles.forEach(f => formData.append('files', f));
            
            response = await fetch(`${API_URL}/chat-upload`, {
                method: 'POST',
                body: formData
            });
            // Clear files after send
            currentFiles = [];
            fileUpload.value = '';
            updateAttachmentPreview();
        } else {
            response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, topic: currentTopic, vendedor_id: vendedorId })
            });
        }

        const data = await response.json();
        
        appendAIMessage(data.response);
        speakText(data.response);

        if (data.shouldCreateNode && data.nodeData) {
            appendSystemMessage(`Node Created/Updated: ${data.nodeData.title}`);
            window.addNeuralNode(currentTopic, data.nodeData.title, currentColor);
        }

        if (data.showWorkflowButtons) {
            workflowActions.style.display = 'flex';
        } else if (data.hideWorkflowButtons) {
            workflowActions.style.display = 'none';
        }

        // Reset Neural Animation
        if (window.resetHighlight) setTimeout(window.resetHighlight, 1000);

    } catch (err) {
        console.error(err);
        appendSystemMessage("Error connecting to Neural Core.");
        if (window.resetHighlight) window.resetHighlight();
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// --- Node Summary Logic ---
window.fetchNodeSummary = async function(topic, fileName) {
    appendSystemMessage(`Fetching summary for ${fileName}...`);
    try {
        const response = await fetch(`${API_URL}/node/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, fileName })
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
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        const voices = window.speechSynthesis.getVoices();
        
        // Try to find a male Spanish voice (Pablo, Jorge, or a generic male voice)
        const maleVoice = voices.find(v => 
            v.lang.startsWith('es') && 
            (v.name.includes('Pablo') || v.name.includes('Jorge') || v.name.toLowerCase().includes('male'))
        ) || voices.find(v => v.lang.startsWith('es'));
        
        if (maleVoice) utterance.voice = maleVoice;
        
        // Faster and fluid
        utterance.rate = 1.35;
        utterance.pitch = 0.9;
        
        window.speechSynthesis.speak(utterance);
    }
}
