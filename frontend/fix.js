const fs = require('fs');
let html = fs.readFileSync('soft3_v2.html', 'utf8');

// Find the first chat panel
const chatIndex = html.indexOf('<!-- RIGHT PANEL: CHAT IA (Cerebro Soft 3) -->');
if (chatIndex !== -1) {
    html = html.substring(0, chatIndex);
}

// Find the end of main
const endMainIndex = html.lastIndexOf('</main>');
if (endMainIndex !== -1) {
    html = html.substring(0, endMainIndex);
}

html += `
            <!-- 6. PROGRAMADORES DEL SISTEMA -->
            <section id="page-devs" class="content-page">
                <div class="page-header">
                    <div class="header-left">
                        <h1>Programadores del Sistema</h1>
                        <p>Estadísticas reales en vivo del historial de aportes (Git Log)</p>
                    </div>
                    <div class="header-right">
                        <button class="btn-secondary" onclick="loadDeveloperStats()">🔄 Actualizar Ahora</button>
                    </div>
                </div>
                
                <div id="devs-loading" class="loading-spinner">Analizando repositorio Git...</div>
                
                <div class="devs-grid" id="devs-grid-container" style="display:none; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding-top: 15px;">
                    <!-- Inyectado por JS -->
                </div>
            </section>
        </main>
        
        <!-- RIGHT PANEL: CHAT IA (Cerebro Soft 3) -->
        <section id="chat-panel">
            <div class="chat-header-panel">
                <div class="chat-header-info">
                    <h3>💬 Cerebro Soft 3</h3>
                    <div class="chat-header-status">
                        <span class="status-dot"></span>
                        <p>Enfoque: <span id="chat-topic">General</span></p>
                    </div>
                </div>
                <button id="new-chat-btn">＋ Limpiar</button>
            </div>
            
            <div id="chat-history"></div>
            
            <div id="chat-suggestions" class="chat-suggestions"></div>

            <div id="chat-input-area">
                <form id="chat-form">
                    <textarea id="message-input" placeholder="Pregunta sobre la base de datos, commits o módulos..." rows="1"></textarea>
                    <button type="submit" id="send-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </form>
            </div>
        </section>
    </div>

    <style>
        .chat-suggestions {
            display: flex;
            gap: 8px;
            padding: 10px 15px;
            overflow-x: auto;
            scrollbar-width: none;
            background: #fff;
            border-top: 1px solid #e1e4e8;
            min-height: 45px;
            flex-shrink: 0;
        }
        .chat-suggestions::-webkit-scrollbar {
            display: none;
        }
        .suggestion-chip {
            background: #f0f6fc;
            border: 1px solid #c8e1ff;
            color: #0366d6;
            padding: 5px 12px;
            border-radius: 16px;
            font-size: 0.75rem;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s;
        }
        .suggestion-chip:hover {
            background: #0366d6;
            color: #fff;
        }
    </style>

    <script src="soft3_v2.js"></script>
</body>
</html>`;

fs.writeFileSync('soft3_v2.html', html);
console.log('Fixed HTML');
