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

const PORT = process.env.PORT || 3050;

const obsidian = new ObsidianManager(process.env.OBSIDIAN_VAULT_PATH);
const ai = new AIRouter(process.env.GEMINI_API_KEY);

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
    const { message, topic, vendedor_id, persona } = req.body;
    console.log(`[CHAT] Recibido: ${message} (Tema: ${topic}, Vendedor: ${vendedor_id}, Persona: ${persona})`);
    
    // Log user message
    if (vendedor_id) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'user', ${message})`.catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, [], obsidian, vendedor_id, sql, persona);
    
    // Log AI response
    if (vendedor_id && result.response) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'ai', ${result.response})`.catch(e => console.error(e));
    }
    
    if (result.shouldCreateNode && result.nodeData) {
        const filepath = obsidian.createNode(topic, result.nodeData.title, result.nodeData.content);
        console.log(`[OBSIDIAN] Nodo creado en ${filepath}`);
    }

    res.json(result);
});

app.post('/api/chat-upload', upload.array('files'), async (req, res) => {
    const { message, topic, vendedor_id, persona } = req.body;
    const files = req.files || [];
    console.log(`[CHAT UPLOAD] Recibido: ${message} (Tema: ${topic}, Vendedor: ${vendedor_id}, Persona: ${persona}) - ${files.length} archivos.`);
    
    // Log user message
    if (vendedor_id) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'user', ${message + ' [Archivos Adjuntos]'})`.catch(e => console.error(e));
    }
    
    const result = await ai.processMessage(message, topic, files, obsidian, vendedor_id, sql, persona);
    
    // Log AI response
    if (vendedor_id && result.response) {
        await sql`INSERT INTO conversaciones (vendedor_id, emisor, mensaje) VALUES (${vendedor_id}, 'ai', ${result.response})`.catch(e => console.error(e));
    }
    
    if (result.shouldCreateNode && result.nodeData) {
        const filepath = obsidian.createNode(topic, result.nodeData.title, result.nodeData.content);
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
    
    // Core node
    nodes.push({ id: 'Soft 3', group: 0, label: 'Núcleo Principal Soft 3' });

    structure.forEach((folder, idx) => {
        // Folder node
        const folderId = folder.topic;
        nodes.push({ id: folderId, group: 1, label: folder.topic });
        // Link core to folder
        links.push({ source: 'Soft 3', target: folderId, value: 2 });
        
        // Files in folder
        folder.files.forEach(file => {
            const fileId = `${folder.topic}/${file}`;
            nodes.push({ id: fileId, group: 2, label: file });
            // Link folder to file
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

app.listen(PORT, () => {
    console.log(`[NEURAL CORE] Backend running on port ${PORT}`);
});
