require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const ObsidianManager = require('./obsidian_manager');
const AIRouter = require('./ai_router');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sirve el frontend para que los asesores entren desde la web (Celular/PC)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/editor', express.static(path.join(__dirname, '../frontend/image-editor/dist')));
app.use('/prices', express.static(path.join(__dirname, '../frontend/prices')));

// Forzar la ruta explícita por si express.static falla
app.get('/soft3.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/soft3.html'));
});

app.get('/soft3_v2.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/soft3_v2.html'));
});

const PORT = process.env.PORT || 3050;

// API KEY fallback (can be overridden by .env)
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const obsidian = new ObsidianManager(process.env.OBSIDIAN_VAULT_PATH);
const ai = new AIRouter(GEMINI_KEY);

console.log(`[SERVER] GEMINI_API_KEY loaded: ${GEMINI_KEY ? GEMINI_KEY.substring(0,10) + '...' : 'NOT SET'}`);

// Setup Multer for file uploads
const upload = multer({ dest: path.join(__dirname, 'temp_uploads/') });

// Setup Telegram (Optional, will just warn if token is missing)
let bot;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here') {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('[TELEGRAM] Bot is polling for messages.');
    
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        bot.sendMessage(chatId, "Procesando enlace neuronal...");
        const result = await ai.processMessage(text, "Telegram Sync");
        
        if (result.shouldCreateNode && result.nodeData) {
            obsidian.createNode("Telegram Sync", result.nodeData.title, result.nodeData.content);
            bot.sendMessage(chatId, `✅ Nodo creado en la bóveda: ${result.nodeData.title}\n\n${result.response}`);
        } else {
            bot.sendMessage(chatId, result.response);
        }
    });
} else {
    console.log('[TELEGRAM] Token not configured. Telegram sync disabled.');
}

const sql = require('postgres')('postgresql://postgres.kkvujjyohspdynxltwqo:Jp2024013gg002@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true');

app.post('/api/chat', async (req, res) => {
    const { message, topic, vendedor_id, persona, role } = req.body;
    console.log(`[CHAT] Recibido: ${message} (Tema: ${topic}, Vendedor: ${vendedor_id}, Persona: ${persona}, Rol: ${role})`);
    
    // Log user message
    if (vendedor_id) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'user', ${message})`.catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, [], obsidian, vendedor_id, sql, persona, role);
    
    // Log AI response
    if (vendedor_id && result.response) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'ai', ${result.response})`.catch(e => console.error(e));
    }
    
    if (result.shouldCreateNode && result.nodeData) {
        const folder = result.nodeFolder || topic;
        const filepath = obsidian.createNode(folder, result.nodeData.title, result.nodeData.content);
        console.log(`[OBSIDIAN] Nodo creado en ${filepath}`);
    }

    res.json(result);
});

app.post('/api/chat-upload', upload.array('files'), async (req, res) => {
    const { message, topic, vendedor_id, persona, role } = req.body;
    const files = req.files || [];
    console.log(`[CHAT UPLOAD] Recibido: ${message} (Tema: ${topic}, Vendedor: ${vendedor_id}, Persona: ${persona}, Rol: ${role}) - ${files.length} archivos.`);
    
    // Log user message
    if (vendedor_id) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'user', ${message + ' [Archivos Adjuntos]'})`.catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, files, obsidian, vendedor_id, sql, persona, role);
    
    // Log AI response
    if (vendedor_id && result.response) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'ai', ${result.response})`.catch(e => console.error(e));
    }
    
    if (result.shouldCreateNode && result.nodeData) {
        const folder = result.nodeFolder || topic;
        const filepath = obsidian.createNode(folder, result.nodeData.title, result.nodeData.content);
        console.log(`[OBSIDIAN] Nodo creado en ${filepath}`);
    }

    res.json(result);
});

app.get('/api/vault', (req, res) => {
    res.json(obsidian.getVaultStructure());
});

app.get('/api/graph', (req, res) => {
    const structure = obsidian.getVaultStructure();
    const nodes = [];
    const links = [];

    // ── NÚCLEO ──────────────────────────────────────────────────────────────
    nodes.push({ id: 'Soft3Core', group: 0, label: '🧠 Núcleo Soft 3', size: 12 });

    // ── MÓDULOS SOFTRES (sesión de hoy) ──────────────────────────────────────
    const softresModules = [
        'Administración', 'Empleados', 'Inventario', 'Proveedores',
        'Compras', 'Bodegas', 'Ventas', 'Hotelería',
        'Clientes', 'Consultas', 'Reportes', 'Contabilidad',
        'Gestión de Bancos', 'Utilerías', 'Ayudas'
    ];
    nodes.push({ id: 'SoftresRoot', group: 1, label: '📦 Softres Sistemas', size: 9 });
    links.push({ source: 'Soft3Core', target: 'SoftresRoot', value: 3 });
    softresModules.forEach(mod => {
        const id = 'softres_' + mod;
        nodes.push({ id, group: 2, label: mod, size: 5 });
        links.push({ source: 'SoftresRoot', target: id, value: 1 });
    });

    // ── MÓDULOS INTERNOS SOFT 3 ───────────────────────────────────────────────
    const soft3Modules = [
        { id: 'mod_chat', label: '💬 Chat IA', group: 3 },
        { id: 'mod_graph', label: '🌐 Grafo 3D', group: 3 },
        { id: 'mod_obsidian', label: '📓 Bóveda Obsidian', group: 3 },
        { id: 'mod_telegram', label: '📱 Telegram Bot', group: 3 },
        { id: 'mod_imageeditor', label: '🖼️ Editor de Imágenes', group: 3 },
        { id: 'mod_precios', label: '💰 Lista de Precios', group: 3 },
        { id: 'mod_supabase', label: '🗄️ Base Datos Supabase', group: 3 },
        { id: 'mod_admin', label: '⚙️ Panel Admin', group: 3 },
    ];
    soft3Modules.forEach(mod => {
        nodes.push({ ...mod, size: 6 });
        links.push({ source: 'Soft3Core', target: mod.id, value: 2 });
    });

    // ── COMMITS DE HOY (11 Jun 2026) ─────────────────────────────────────────
    nodes.push({ id: 'commits', group: 4, label: '📝 Commits Hoy', size: 8 });
    links.push({ source: 'Soft3Core', target: 'commits', value: 2 });
    const todayCommits = [
        { id: 'c1', label: 'Impl. personalización de perfil Soft3' },
        { id: 'c2', label: 'Fix: vaultStructure forEach undefined' },
        { id: 'c3', label: 'Fix: global brain graph loop' },
        { id: 'c4', label: 'Reemplazar index.html con interfaz Soft3' },
        { id: 'c5', label: 'Restaurar index.html original (REVERT)' },
        { id: 'c6', label: 'Fix: layout responsivo pantallas angostas' },
        { id: 'c7', label: 'Ocultar grafo 3D en pantallas estrechas' },
        { id: 'c8', label: 'Bust caché CSS/JS v2' },
        { id: 'c9', label: 'Eliminar modal de perfil (causa bug)' },
        { id: 'c10', label: 'Crear soft3_v2.html sin caché' },
    ];
    todayCommits.forEach(commit => {
        nodes.push({ id: commit.id, group: 4, label: commit.label, size: 4 });
        links.push({ source: 'commits', target: commit.id, value: 1 });
    });

    // ── ERRORES DEL DÍA ───────────────────────────────────────────────────────
    nodes.push({ id: 'errors', group: 5, label: '🚨 Errores Sesión', size: 8 });
    links.push({ source: 'Soft3Core', target: 'errors', value: 2 });
    const todayErrors = [
        { id: 'e1', label: 'Bug: INT vs VARCHAR en foreign keys Softres' },
        { id: 'e2', label: 'Bug: profileModal cubría toda la pantalla' },
        { id: 'e3', label: 'Bug: ForceGraph3D empujaba el chat' },
        { id: 'e4', label: 'Bug: Caché impidió aplicar CSS nuevo' },
        { id: 'e5', label: 'Bug: fuser -k 3050 no encontró el proceso' },
        { id: 'e6', label: 'Bug: PATCH servicios fallaba por tipo INT' },
        { id: 'e7', label: 'Bug: soft3_v2 mezclada con lista precios' },
    ];
    todayErrors.forEach(err => {
        nodes.push({ id: err.id, group: 5, label: err.label, size: 4 });
        links.push({ source: 'errors', target: err.id, value: 1 });
        // Link errors to related commits
    });
    // cross-links errors <-> commits
    links.push({ source: 'e3', target: 'c6', value: 1 });
    links.push({ source: 'e2', target: 'c9', value: 1 });
    links.push({ source: 'e4', target: 'c8', value: 1 });

    // ── BÓVEDA DINÁMICA (Obsidian) ────────────────────────────────────────────
    nodes.push({ id: 'vault', group: 6, label: '📂 Bóveda Dinámica', size: 7 });
    links.push({ source: 'Soft3Core', target: 'vault', value: 2 });
    structure.forEach(folder => {
        const folderId = 'vault_' + folder.topic;
        nodes.push({ id: folderId, group: 6, label: folder.topic, size: 5 });
        links.push({ source: 'vault', target: folderId, value: 1 });
        folder.files.forEach(file => {
            const fileId = folderId + '/' + file;
            nodes.push({ id: fileId, group: 7, label: file, size: 3 });
            links.push({ source: folderId, target: fileId, value: 1 });
        });
    });

    res.json({ nodes, links });
});

app.get('/api/admin/conversaciones', async (req, res) => {
    try {
        const rows = await sql`SELECT * FROM conversaciones ORDER BY fecha DESC LIMIT 100`;
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/reportes', async (req, res) => {
    try {
        const rows = await sql`SELECT * FROM reportes_ventas ORDER BY fecha DESC LIMIT 50`;
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/node/summary', async (req, res) => {
    const { topic, fileName } = req.body;
    const content = obsidian.readNodeContent(topic, fileName);
    if (!content) {
        return res.json({ summary: "No se pudo leer el núcleo de memoria." });
    }
    const summary = await ai.summarizeNode(topic, fileName, content);
    res.json({ summary });
});

app.get('/api/node/content', (req, res) => {
    const { topic, fileName } = req.query;
    const content = obsidian.readNodeContent(topic, fileName);
    if (content) {
        res.json({ content });
    } else {
        res.status(404).json({ error: "Node not found" });
    }
});

app.listen(PORT, () => {
    console.log(`[NEURAL CORE] Backend running on port ${PORT}`);
});

// --- PRICE LIST ENDPOINTS ---
app.get('/api/prices', async (req, res) => {
    try {
        const result = await sql`
          SELECT p.*, c.name as category_name 
          FROM "Product" p 
          LEFT JOIN "Category" c ON p."categoryId" = c.id 
          WHERE p."isActive" = true
        `;
        
        const formattedProducts = result.map(p => {
          let imgUrl = 'https://via.placeholder.com/400';
          if (p.images) {
            try {
                const arr = JSON.parse(p.images);
                if (arr && arr.length > 0) imgUrl = arr[0];
            } catch(e) {
                imgUrl = p.images.split(',')[0].replace(/\[|\]|"/g, '');
            }
          }
          return {
            id: p.id,
            name: p.name,
            code: p.sku || 'N/A',
            price: Number(p.price) || 0,
            image: imgUrl,
            category: p.category_name || 'Sin Categoría',
            description: p.description,
            stock: p.stock
          };
        });
        
        res.json({ success: true, count: formattedProducts.length, products: formattedProducts });
    } catch (error) {
        console.error('Supabase error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
