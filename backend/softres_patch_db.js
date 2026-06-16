#!/usr/bin/env node
/**
 * 🔧 SKILL: SOFTRES_PATCH_DB
 * 
 * Habilidad para ÍCARO (Soft 3 Bot). Permite aplicar parches masivos de base de datos
 * a las 1400+ empresas en el servidor de producción sin necesidad de SSH.
 * 
 * Se conecta al endpoint oficial: /comercio/ejecutar-parche-entregas
 */

const https = require('https');
const http = require('http');

const CONFIG = {
    domain: process.env.SOFTRES_APP_DOMAIN || 'softres.abingenieros.com', // Dominio oficial del cliente
    protocol: process.env.SOFTRES_APP_PROTOCOL || 'https',
    endpoint: '/comercio/ejecutar-parche-entregas'
};

/**
 * Función principal para activar el parche remoto en todas las BD.
 */
function softresPatchDB() {
    return new Promise((resolve, reject) => {
        console.log(`🚀 [SOFTRES_PATCH] Solicitando parche en la base de datos a: ${CONFIG.domain}...`);
        console.log(`⏳ Esto puede tardar varios minutos (recorriendo inquilinos)...`);

        const url = `${CONFIG.protocol}://${CONFIG.domain}${CONFIG.endpoint}`;
        const lib = url.startsWith('https') ? https : http;

        const req = lib.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ [SOFTRES_PATCH] ¡Parche finalizado con éxito!');
                    // Parsear el HTML y extraer los resultados o retornarlo puro
                    resolve({ success: true, statusCode: res.statusCode, output: data });
                } else {
                    console.error(`❌ [SOFTRES_PATCH] Falló con status: ${res.statusCode}`);
                    resolve({ success: false, statusCode: res.statusCode, output: data });
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ [SOFTRES_PATCH] Error de red:', err.message);
            reject(err);
        });
        
        // Timeout alto por si hay muchas DB
        req.setTimeout(600000, () => {
            console.error('❌ [SOFTRES_PATCH] Timeout: El proceso tardó más de 10 minutos.');
            req.abort();
            reject(new Error('Timeout en la petición del parche'));
        });
    });
}

module.exports = { softresPatchDB };

// Si se ejecuta directamente desde la terminal:
if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
    softresPatchDB().then(r => {
        console.log('\n--- RESULTADO OBTENIDO ---');
        // Extraemos solo el contenido del <pre> si existe para evitar loggear todo el HTML
        const preMatch = r.output.match(/<pre>([\s\S]*?)<\/pre>/i);
        if (preMatch && preMatch[1]) {
            console.log(preMatch[1]);
        } else {
            console.log(r.output.substring(0, 1000) + '... (truncado)');
        }
        process.exit(r.success ? 0 : 1);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
