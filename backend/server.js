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
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const obsidian = new ObsidianManager(process.env.OBSIDIAN_VAULT_PATH);
const ai = new AIRouter(OPENAI_KEY);

console.log(`[SERVER] OPENAI_API_KEY loaded: ${OPENAI_KEY ? OPENAI_KEY.substring(0,10) + '...' : 'NOT SET'}`);

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

const mysql = require('mysql2/promise');
const pool = mysql.createPool(process.env.MYSQL_URL || 'mysql://root:@127.0.0.1:3306/softres');

// Auto-crear tablas al iniciar el servidor (útil para Railway)
async function inicializarBaseDatos() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendedor_id VARCHAR(255),
                emisor VARCHAR(50),
                mensaje TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reportes_ventas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendedor_id VARCHAR(255),
                datos JSON,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[MYSQL] Tablas validadas correctamente.');
    } catch (e) {
        console.error('[MYSQL] Error validando tablas:', e.message);
    }
}
inicializarBaseDatos();
app.post('/api/chat', async (req, res) => {
    const { message, topic, vendedor_id, persona, role } = req.body;
    console.log(`[CHAT] Recibido: ${message} (Tema: ${topic}, Vendedor: ${vendedor_id}, Persona: ${persona}, Rol: ${role})`);
    
    // Log user message
    if (vendedor_id) {
        pool.query('INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (?, ?, ?)', [vendedor_id, 'user', message]).catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, [], obsidian, vendedor_id, pool, persona, role);
    
    // Log AI response
    if (vendedor_id && result.response) {
        pool.query('INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (?, ?, ?)', [vendedor_id, 'ai', result.response]).catch(e => console.error(e));
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
        pool.query('INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (?, ?, ?)', [vendedor_id, 'user', message + ' [Archivos Adjuntos]']).catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, files, obsidian, vendedor_id, pool, persona, role);
    
    // Log AI response
    if (vendedor_id && result.response) {
        pool.query('INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (?, ?, ?)', [vendedor_id, 'ai', result.response]).catch(e => console.error(e));
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

// --- CONTROL ACTIONS ENDPOINTS ---
app.post('/api/admin/restart', (req, res) => {
    try {
        const fs = require('fs');
        const envPath = path.join(__dirname, '..', '.env');
        const now = new Date();
        // Touch .env to trigger nodemon hot reload
        if (fs.existsSync(envPath)) {
            fs.utimesSync(envPath, now, now);
        } else {
            fs.writeFileSync(envPath, '# Touched by ACCIONES\n');
        }
        res.json({ success: true, message: 'Reinicio en caliente disparado exitosamente.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/git/push', (req, res) => {
    try {
        const { message } = req.body;
        const commitMsg = message ? message.replace(/"/g, '\\"') : 'Manual upload from Acciones Panel';
        const { exec } = require('child_process');
        
        const cmd = `git add . && git commit -m "${commitMsg}" && git push`;
        
        exec(cmd, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
            if (error) {
                // If there's nothing to commit, git returns an error code, which is fine
                if (stdout.includes('nothing to commit') || stderr.includes('nothing to commit')) {
                    return res.json({ success: true, message: 'No hay cambios nuevos para subir.' });
                }
                return res.status(500).json({ error: error.message, details: stderr || stdout });
            }
            res.json({ success: true, message: 'Cambios subidos a GitHub exitosamente.', output: stdout });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/db/add', (req, res) => {
    try {
        const { dbUrl } = req.body;
        if (!dbUrl) return res.status(400).json({ error: 'Falta la URL de conexión.' });
        
        const fs = require('fs');
        const envPath = path.join(__dirname, '..', '.env');
        
        // Append to .env safely
        fs.appendFileSync(envPath, `\n# Nueva DB añadida vía Panel de Acciones\nNEW_DB_URL=${dbUrl}\n`);
        
        // Trigger hot reload automatically
        const now = new Date();
        fs.utimesSync(envPath, now, now);
        
        res.json({ success: true, message: 'Base de datos guardada en .env y servidor reiniciando...' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/conversaciones', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM conversaciones ORDER BY fecha DESC LIMIT 100');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/reportes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reportes_ventas ORDER BY fecha DESC LIMIT 50');
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

// --- GIT STATS ENDPOINTS ---
app.get('/api/git/stats', async (req, res) => {
    try {
        const { execSync } = require('child_process');
        try {
            // Attempt 1: Local Git
            const stdout = execSync('git log --format="%an|%ad" --date=short').toString();
            const lines = stdout.split('\n').filter(l => l.trim() !== '');
            const authorStats = {};
            
            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const author = parts[0].trim();
                    const date = parts[1].trim();
                    if (!authorStats[author]) authorStats[author] = { name: author, commits: 0, lastCommit: date };
                    authorStats[author].commits += 1;
                    if (!authorStats[author].lastCommit) authorStats[author].lastCommit = date;
                }
            });
            const statsArray = Object.values(authorStats).sort((a, b) => b.commits - a.commits);
            return res.json(statsArray);
        } catch (localGitError) {
            // Attempt 2: Fallback to GitHub API (useful for Railway/Production)
            console.log('Local git log failed, falling back to GitHub API...', localGitError.message);
            const response = await fetch('https://api.github.com/repos/atomicgpt001-bot/BRAINSOFT3/commits?per_page=100');
            if (!response.ok) throw new Error('GitHub API error: ' + response.statusText);
            const commits = await response.json();
            
            const authorStats = {};
            commits.forEach(c => {
                if (!c.commit || !c.commit.author) return;
                const author = c.commit.author.name;
                const date = c.commit.author.date.split('T')[0];
                if (!authorStats[author]) authorStats[author] = { name: author, commits: 0, lastCommit: date };
                authorStats[author].commits += 1;
                if (!authorStats[author].lastCommit || new Date(date) > new Date(authorStats[author].lastCommit)) {
                    authorStats[author].lastCommit = date;
                }
            });
            const statsArray = Object.values(authorStats).sort((a, b) => b.commits - a.commits);
            return res.json(statsArray);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- PRICE LIST ENDPOINTS ---
app.get('/api/prices', async (req, res) => {
    try {
        // Adaptado para consultar la base de datos MySQL de Soft 3.
        // Si las tablas no existen (en caso de que sea una DB vacía en Railway), devolverá error.
        const [result] = await pool.query(`
          SELECT a.id, a.nombre as name, a.codigo as sku, a.precio1 as price, 'Sin Categoría' as category_name, '' as description, a.stock
          FROM articulos a 
          WHERE a.estado = 'A' LIMIT 50
        `).catch(e => [[], null]);
        
        const formattedProducts = result.map(p => {
          return {
            id: p.id,
            name: p.name,
            code: p.sku || 'N/A',
            price: Number(p.price) || 0,
            image: 'https://via.placeholder.com/400',
            category: p.category_name,
            description: p.description,
            stock: p.stock
          };
        });
        
        res.json({ success: true, count: formattedProducts.length, products: formattedProducts });
    } catch (error) {
        console.error('MySQL error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
