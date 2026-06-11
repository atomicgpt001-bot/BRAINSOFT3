// ─── STATE ───────────────────────────────────────────────────────────────────
let currentTopic = 'General';
let sessionId    = 'sesion-' + Date.now();
let vendedor_id  = localStorage.getItem('soft3_username') || 'ATOMIC';
let knownBotName = localStorage.getItem('soft3_botname')  || 'Soft 3';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const chatHistory    = document.getElementById('chat-history');
const chatForm       = document.getElementById('chat-form');
const messageInput   = document.getElementById('message-input');
const newChatBtn     = document.getElementById('new-chat-btn');
const sidebarUser    = document.getElementById('sidebar-username');
const avatarBtn      = document.getElementById('avatar-btn');
const chatTopicSpan  = document.getElementById('chat-topic');
const menuItems      = document.querySelectorAll('.menu-item');
const moduleCards    = document.querySelectorAll('.module-card');
const contentPages   = document.querySelectorAll('.content-page');

// ─── NAVIGATION LOGIC ─────────────────────────────────────────────────────────
function switchTab(targetTabId, moduleName = null) {
    // 1. Hide all pages
    contentPages.forEach(page => page.classList.remove('active'));
    
    // 2. Resolve target ID
    let targetPageId = `page-${targetTabId}`;
    let targetElement = document.getElementById(targetPageId);
    
    // If it's a module, route to simulated module view
    if (targetTabId.startsWith('mod_')) {
        targetPageId = 'page-module-details';
        targetElement = document.getElementById(targetPageId);
        if (moduleName) {
            loadModuleDetails(moduleName);
        }
    }
    
    if (targetElement) {
        targetElement.classList.add('active');
    }
    
    // 3. Highlight menu item
    menuItems.forEach(item => {
        item.classList.remove('active');
        const itemTarget = item.getAttribute('data-target');
        if (itemTarget === targetTabId) {
            item.classList.add('active');
        }
    });
    
    // 4. Update Chat focus
    if (moduleName) {
        updateChatFocus(moduleName);
    } else if (targetTabId === 'dashboard') {
        updateChatFocus('General');
    } else if (targetTabId === 'map') {
        updateChatFocus('Mapa Neuronal');
        // Lazy-load WebGL Graph
        setTimeout(initGraph, 100);
    } else if (targetTabId === 'vault') {
        updateChatFocus('Bóveda Obsidian');
        loadVaultStructure();
    } else if (targetTabId === 'prices') {
        updateChatFocus('Lista de Precios');
        loadPrices();
    }
}

// Bind Sidebar menu items
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        const moduleName = item.getAttribute('data-module');
        switchTab(target, moduleName);
    });
});

// Bind Grid cards
moduleCards.forEach(card => {
    card.addEventListener('click', () => {
        const target = card.getAttribute('data-target');
        const module = card.getAttribute('data-module');
        switchTab(target, module);
    });
});

// Bind back to dashboard button
const backBtn = document.getElementById('back-to-dashboard-btn');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        switchTab('dashboard');
    });
}

// Update Chat Focus & notify bot context
function updateChatFocus(topic) {
    currentTopic = topic;
    chatTopicSpan.textContent = topic;
    
    // Add info note in chat
    addMessage(`📍 Enfoque cambiado a: <strong>${topic}</strong>. Pregúntame lo que necesites sobre esta sección.`, false, true);
}

// ─── CHART.JS DASHBOARD ───────────────────────────────────────────────────────
let barChartInstance, donutChartInstance, gaugeChartInstance;

function initCharts() {
    const ctxBar = document.getElementById('revenueBarChart');
    const ctxDonut = document.getElementById('queriesDonutChart');
    const ctxGauge = document.getElementById('efficiencyGaugeChart');
    
    if (!ctxBar || !ctxDonut || !ctxGauge) return;
    
    // 1. Revenue & Expenses comparison
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'],
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: [12000, 19000, 15000, 24000, 22000, 29000, 31000, 28000, 34000],
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                },
                {
                    label: 'Compras ($)',
                    data: [9000, 12000, 11000, 15000, 14000, 18000, 21000, 19000, 22000],
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter' } } }
            },
            scales: {
                y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter' } } },
                x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } }
            }
        }
    });

    // 2. Query distribution per module
    donutChartInstance = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Ventas', 'Administración', 'Inventario', 'Compras', 'Otros'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: ['#2563eb', '#0d9488', '#f97316', '#7c3aed', '#64748b'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter' } } }
            }
        }
    });

    // 3. Efficiency Gauge (Semi-donut)
    gaugeChartInstance = new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
            labels: ['Eficiente', 'Latencia'],
            datasets: [{
                data: [94.8, 5.2],
                backgroundColor: ['#2563eb', '#f1f5f9'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: 270,
            cutout: '80%',
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ─── SIMULATED MODULES DATA ──────────────────────────────────────────────────
function loadModuleDetails(name) {
    const titleEl = document.getElementById('module-detail-title');
    const subtitleEl = document.getElementById('module-detail-subtitle');
    const statsRow = document.getElementById('module-stats-row');
    const tableHeader = document.getElementById('module-table-header');
    const tableBody = document.getElementById('module-table-body');
    
    titleEl.textContent = `Módulo: ${name}`;
    subtitleEl.textContent = `Operaciones de ${name} sincronizadas en tiempo real`;
    
    // Default mock stats and data rows
    let stats = [];
    let headers = [];
    let rows = [];
    
    if (name === 'Inventario') {
        stats = [
            { label: 'Referencias en Stock', value: '1,240' },
            { label: 'Alertas de Stock Bajo', value: '12', alert: true },
            { label: 'Valor del Almacén', value: '$84,520' }
        ];
        headers = ['ID', 'Código SKU', 'Producto', 'Categoría', 'Stock Físico', 'Precio Unitario'];
        rows = [
            ['1', 'INV-00234', 'Cafetera Espresso Premium', 'Línea Hogar', '45', '$220.00'],
            ['2', 'INV-00109', 'Silla de Oficina Ergonómica', 'Mobiliario', '8', '$150.00'],
            ['3', 'INV-00561', 'Pantalla Monitor 27" 4K', 'Electrónicos', '19', '$320.00'],
            ['4', 'INV-00782', 'Juego Toallas Hotel Blancas', 'Hotelería', '150', '$25.00'],
            ['5', 'INV-00445', 'Cerradura Inteligente WiFi', 'Seguridad', '3', '$180.00']
        ];
    } else if (name === 'Ventas') {
        stats = [
            { label: 'Facturado Hoy', value: '$12,450' },
            { label: 'Cotizaciones Pendientes', value: '24' },
            { label: 'Tasa de Conversión', value: '72%' }
        ];
        headers = ['Nº Factura', 'Cliente', 'Fecha', 'Vendedor', 'Método Pago', 'Total Neto'];
        rows = [
            ['FAC-10023', 'Inversiones Omega S.A.', '11/06/2026', 'Santiago', 'Transferencia', '$3,400.00'],
            ['FAC-10024', 'María Gómez Pérez', '11/06/2026', 'Carlos', 'Tarjeta Crédito', '$150.00'],
            ['FAC-10025', 'Hotel Splendid', '11/06/2026', 'Santiago', 'Factura 30 días', '$6,200.00'],
            ['FAC-10026', 'Juan Torres Díaz', '11/06/2026', 'Lucía', 'Efectivo', '$80.00'],
            ['FAC-10027', 'Constructora Del Sol', '11/06/2026', 'Santiago', 'Transferencia', '$2,620.00']
        ];
    } else if (name === 'Empleados') {
        stats = [
            { label: 'Fichas Registradas', value: '85' },
            { label: 'Presentes Hoy', value: '82' },
            { label: 'Faltas / Permisos', value: '3', alert: true }
        ];
        headers = ['RUT/ID', 'Colaborador', 'Departamento', 'Rol / Cargo', 'Asistencia', 'Entrada'];
        rows = [
            ['EMP-01', 'Santiago Rivas', 'Ventas', 'Ejecutivo Senior', 'Presente', '08:02 AM'],
            ['EMP-02', 'Marcela Saldivar', 'Administración', 'Sub-Gerente', 'Presente', '07:55 AM'],
            ['EMP-03', 'Carlos Mendoza', 'Soporte', 'Soporte TI', 'Presente', '08:15 AM'],
            ['EMP-04', 'Eduardo Parra', 'Bodega', 'Encargado Logística', 'Falta Autorizada', '-'],
            ['EMP-05', 'Laura Sepúlveda', 'Contabilidad', 'Contador General', 'Presente', '08:00 AM']
        ];
    } else {
        // Fallback simulated module data
        stats = [
            { label: 'Registros Procesados', value: '1,452' },
            { label: 'Eventos Pendientes', value: '4' },
            { label: 'Estado del Servicio', value: 'Operativo' }
        ];
        headers = ['ID Registro', 'Detalle Operación', 'Fecha Sinc', 'Usuario', 'Estado'];
        rows = [
            ['REG-119', `Sincronización Módulo ${name}`, '11/06/2026 14:12', 'ATOMIC', 'Sincronizado'],
            ['REG-118', 'Limpieza de caché local', '11/06/2026 12:00', 'Sistema', 'Completado'],
            ['REG-117', 'Revisión periódica de consistencia', '11/06/2026 09:30', 'Admin', 'Completado'],
            ['REG-116', 'Carga masiva de datos iniciales', '10/06/2026 18:22', 'ATOMIC', 'Sincronizado'],
            ['REG-115', 'Ajuste de parámetros de control', '10/06/2026 11:10', 'Santiago', 'Completado']
        ];
    }
    
    // Inject stats
    statsRow.innerHTML = '';
    stats.forEach(st => {
        const card = document.createElement('div');
        card.className = `stat-item-card ${st.alert ? 'style-alert' : ''}`;
        if (st.alert) card.style.borderColor = '#ef4444';
        card.innerHTML = `
            <span>${st.label}</span>
            <h2 style="${st.alert ? 'color:#dc2626' : ''}">${st.value}</h2>
        `;
        statsRow.appendChild(card);
    });
    
    // Inject Headers
    tableHeader.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    // Inject Body Rows
    tableBody.innerHTML = '';
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = r.map((tdText, idx) => {
            if (idx === 0) return `<td style="font-weight:600; color:#2563eb;">${tdText}</td>`;
            if (tdText.includes('⚠️') || tdText.includes('Falta')) return `<td><span class="badge-red">${tdText}</span></td>`;
            if (tdText.includes('Presente') || tdText.includes('Sincronizado') || tdText.includes('OK')) return `<td><span class="badge-success">${tdText}</span></td>`;
            return `<td>${tdText}</td>`;
        }).join('');
        tableBody.appendChild(tr);
    });
}

// ─── SUPABASE PRICES TABLE ───────────────────────────────────────────────────
let allProducts = [];
let activeCategory = 'Todas';

async function loadPrices() {
    const tableBody = document.getElementById('prices-table-body');
    const loadingEl = document.getElementById('prices-loading');
    const tableEl = document.getElementById('prices-data-table');
    
    if (!tableBody) return;
    
    try {
        const response = await fetch('/api/prices');
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.products;
            renderCategoryPills();
            renderPricesTable();
            if (loadingEl) loadingEl.style.display = 'none';
            if (tableEl) tableEl.style.display = 'table';
        } else {
            if (loadingEl) loadingEl.textContent = 'Error al sincronizar Base de Datos Supabase.';
        }
    } catch (e) {
        console.error('[Prices] Fetch error:', e);
        if (loadingEl) loadingEl.textContent = 'Error de conexión con el Cerebro Soft 3.';
    }
}

function renderCategoryPills() {
    const pillsList = document.getElementById('prices-categories-list');
    if (!pillsList) return;
    
    const categories = new Set();
    allProducts.forEach(p => categories.add(p.category));
    
    let html = `<span class="category-pill ${activeCategory === 'Todas' ? 'active' : ''}" onclick="filterPriceCategory('Todas')">Todas</span>`;
    categories.forEach(cat => {
        html += `<span class="category-pill ${activeCategory === cat ? 'active' : ''}" onclick="filterPriceCategory('${cat}')">${cat}</span>`;
    });
    pillsList.innerHTML = html;
}

window.filterPriceCategory = function(category) {
    activeCategory = category;
    renderCategoryPills();
    renderPricesTable();
};

const priceSearch = document.getElementById('prices-search-input');
if (priceSearch) {
    priceSearch.addEventListener('input', renderPricesTable);
}

function renderPricesTable() {
    const tbody = document.getElementById('prices-table-body');
    const searchQuery = priceSearch ? priceSearch.value.toLowerCase() : '';
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filtered = allProducts.filter(p => {
        const catMatch = activeCategory === 'Todas' || p.category === activeCategory;
        const searchMatch = p.name.toLowerCase().includes(searchQuery) || p.code.toLowerCase().includes(searchQuery);
        return catMatch && searchMatch;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style:italic; color:#94a3b8; padding:30px;">Ningún producto coincide con los filtros.</td></tr>`;
        return;
    }
    
    filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image}" class="prod-thumbnail" alt="Thumb"></td>
            <td style="font-family:monospace; font-size:0.75rem; color:#64748b;">${p.code}</td>
            <td style="font-weight:600; color:#0f172a;">${p.name}</td>
            <td>${p.category}</td>
            <td>${p.stock !== null && p.stock !== undefined ? p.stock : 'N/A'}</td>
            <td class="prod-price">$ ${p.price.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ─── OBSIDIAN VAULT EXPLORER ─────────────────────────────────────────────────
async function loadVaultStructure() {
    const treeList = document.getElementById('vault-tree-list');
    if (!treeList) return;
    
    try {
        const res = await fetch('/api/vault');
        const structure = await res.json();
        
        treeList.innerHTML = '';
        
        if (structure.length === 0) {
            treeList.innerHTML = '<div class="empty-state">La Bóveda está vacía.</div>';
            return;
        }
        
        structure.forEach(folder => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'vault-folder-group';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'vault-folder-name';
            folderHeader.innerHTML = `📁 <strong>${folder.topic}</strong>`;
            
            const filesList = document.createElement('div');
            filesList.className = 'vault-files-sublist';
            filesList.style.display = 'block'; // Expanded by default
            
            folderHeader.addEventListener('click', () => {
                filesList.style.display = filesList.style.display === 'none' ? 'block' : 'none';
            });
            
            folder.files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'vault-file-item';
                fileItem.innerHTML = `📄 ${file}`;
                fileItem.addEventListener('click', () => {
                    document.querySelectorAll('.vault-file-item').forEach(el => el.classList.remove('active'));
                    fileItem.classList.add('active');
                    viewVaultNode(folder.topic, file);
                });
                filesList.appendChild(fileItem);
            });
            
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(filesList);
            treeList.appendChild(folderDiv);
        });
    } catch (e) {
        console.error('[Vault] Error:', e);
        treeList.innerHTML = '<div class="empty-state" style="color:#ef4444;">Error al cargar la bóveda.</div>';
    }
}

async function viewVaultNode(topic, file) {
    const filenameEl = document.getElementById('preview-filename');
    const contentEl = document.getElementById('preview-content');
    const sumBtn = document.getElementById('summarize-node-btn');
    
    if (!filenameEl || !contentEl) return;
    
    filenameEl.textContent = file;
    contentEl.innerHTML = '<p class="empty-state">Cargando nota...</p>';
    if (sumBtn) sumBtn.style.display = 'none';
    
    try {
        const res = await fetch(`/api/node/content?topic=${encodeURIComponent(topic)}&fileName=${encodeURIComponent(file)}`);
        const data = await res.json();
        
        if (data.content) {
            // Render basic markdown to HTML simply (replacing headings and line breaks)
            let html = data.content
                .replace(/^# (.*$)/gim, '<h2>$1</h2>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/^---([\s\S]*?)---/g, '') // remove frontmatter
                .replace(/\n/g, '<br>');
            
            contentEl.innerHTML = `<div class="note-markdown">${html}</div>`;
            
            if (sumBtn) {
                sumBtn.style.display = 'inline-block';
                // replace onClick with new handler
                const newBtn = sumBtn.cloneNode(true);
                sumBtn.replaceWith(newBtn);
                newBtn.addEventListener('click', () => summarizeVaultNode(topic, file));
            }
        } else {
            contentEl.innerHTML = `<p class="empty-state" style="color:#ef4444;">No se pudo leer el archivo.</p>`;
        }
    } catch (e) {
        console.error('[Node Content]', e);
        contentEl.innerHTML = `<p class="empty-state" style="color:#ef4444;">Error de carga.</p>`;
    }
}

async function summarizeVaultNode(topic, file) {
    const contentEl = document.getElementById('preview-content');
    if (!contentEl) return;
    
    contentEl.innerHTML = '<p class="empty-state">🧠 Generando resumen IA...</p>';
    
    try {
        const res = await fetch('/api/node/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, fileName: file })
        });
        const data = await res.json();
        contentEl.innerHTML = `<div class="ai-summary-box" style="padding:15px; border-left:4px solid #2563eb; background:#eff6ff; border-radius:4px; font-size:0.85rem; line-height:1.5;">
            <strong>Resumen del Cerebro IA:</strong><br><br>${data.summary.replace(/\n/g, '<br>')}
        </div>`;
    } catch(e) {
        contentEl.innerHTML = `<p class="empty-state" style="color:#ef4444;">Error al generar el resumen de Inteligencia Artificial.</p>`;
    }
}

// ─── 3D FORCE GRAPH ───────────────────────────────────────────────────────────
let Graph;
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

function initGraph() {
    const elem = document.getElementById('graph-container');
    if (!elem) return;

    fetch('/api/graph')
        .then(r => r.json())
        .then(gData => {
            const w = elem.clientWidth  || 600;
            const h = elem.clientHeight || 450;

            if (!Graph) {
                Graph = ForceGraph3D()(elem)
                    .width(w)
                    .height(h)
                    .backgroundColor('#0d1117')
                    .graphData(gData)
                    .nodeLabel('label')
                    .nodeColor(node => GROUP_COLORS[node.group] || '#8b949e')
                    .nodeRelSize(5.5)
                    .nodeVal(node => node.size || 4)
                    .linkColor(() => '#30363d')
                    .linkOpacity(0.55)
                    .onNodeClick(node => {
                        updateChatFocus(node.label);

                        const dist = 70;
                        const ratio = 1 + dist / Math.hypot(node.x, node.y, node.z);
                        Graph.cameraPosition(
                            { x: node.x * ratio, y: node.y * ratio, z: node.z * ratio },
                            node,
                            800
                        );
                    });

                // Keep graph sized to its container on resize
                const ro = new ResizeObserver(() => {
                    if (Graph && elem.clientWidth > 0) {
                        Graph.width(elem.clientWidth).height(elem.clientHeight);
                    }
                });
                ro.observe(elem);
            } else {
                Graph.graphData(gData);
            }
        })
        .catch(err => console.error('[Graph] Error:', err));
}

// ─── CHAT IA (CEREBRO SOFT 3) ────────────────────────────────────────────────
function addMessage(html, isUser, isSystemNote = false) {
    const wrapper = document.createElement('div');
    
    if (isSystemNote) {
        wrapper.className = 'chat-system-note';
        wrapper.style.alignSelf = 'center';
        wrapper.style.fontSize = '0.7rem';
        wrapper.style.color = '#475569';
        wrapper.style.background = '#f1f5f9';
        wrapper.style.padding = '4px 10px';
        wrapper.style.borderRadius = '12px';
        wrapper.style.margin = '4px 0';
        wrapper.style.textAlign = 'center';
        wrapper.style.maxWidth = '90%';
        wrapper.innerHTML = html;
        chatHistory.appendChild(wrapper);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return;
    }
    
    wrapper.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-content';

    if (!isUser) {
        bubble.innerHTML = `<strong style="color:#2563eb">[${knownBotName}]</strong> ${html}`;
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
    sidebarUser.textContent = vendedor_id;
    avatarBtn.textContent = vendedor_id.substring(0, 2).toUpperCase();
    
    addMessage(`¡Hola <strong>${vendedor_id}</strong>! Soy el asistente cognitivo de <strong>${knownBotName}</strong>. 
    Estoy sincronizado con los últimos commits del día y las bases de datos de Supabase. 
    Puedes elegir cualquier módulo en la barra lateral o hacer preguntas. ¿En qué te puedo ayudar hoy?`, false);
}

// Change username profile name via prompt
avatarBtn.addEventListener('click', () => {
    const newName = prompt('¿Cuál es tu nombre de vendedor?', vendedor_id);
    if (newName && newName.trim()) {
        vendedor_id = newName.trim();
        localStorage.setItem('soft3_username', vendedor_id);
        sidebarUser.textContent = vendedor_id;
        avatarBtn.textContent = vendedor_id.substring(0, 2).toUpperCase();
        addMessage(`Excelente, te registraré como <strong>${vendedor_id}</strong> para los reportes de ventas.`, false);
    }
});

// Clear/Reset chat button
newChatBtn.addEventListener('click', () => {
    sessionId = 'sesion-' + Date.now();
    currentTopic = 'General';
    chatTopicSpan.textContent = 'General';
    startChat();
});

// Submit prompt to backend AI
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    addMessage(text, true);

    // Typing dot animation
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = typingId;
    typingDiv.innerHTML = '<div class="message-content"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const context = `El usuario es "${vendedor_id}". Tu nombre es "${knownBotName}". Módulo/Enfoque activo: "${currentTopic}".`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                message: text + '\n[Context: ' + context + ']',
                topic: currentTopic,
                vendedor_id,
                session_id: sessionId,
                persona: 'soft3'
            })
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        document.getElementById(typingId)?.remove();

        if (data.response) {
            // Auto-detect dynamic bot name changes (e.g. "me llamaré X")
            const nameMatch = data.response.match(/me llamaré (\S+)/i);
            if (nameMatch) {
                knownBotName = nameMatch[1];
                localStorage.setItem('soft3_botname', knownBotName);
            }
            addMessage(data.response.replace(/\n/g, '<br>'), false);
        } else {
            addMessage('El servidor no devolvió una respuesta válida.', false);
        }

        if (data.shouldCreateNode) {
            // If new node was added to vault, reload structures
            loadVaultStructure();
        }
    } catch (err) {
        document.getElementById(typingId)?.remove();
        if (err.name === 'AbortError') {
            addMessage('⏱️ Tiempo de espera agotado. El servidor está procesando otras tareas, intenta de nuevo.', false);
        } else {
            addMessage('❌ Error de enlace con el servidor de IA.', false);
        }
        console.error('[Chat Error]', err);
    }
});

// Textarea auto-resize listener
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
});

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
initCharts();
startChat();
