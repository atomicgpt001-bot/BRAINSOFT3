#!/usr/bin/env node
/**
 * 🔧 SKILL: SOFTRES_SERVER_RESTART
 * 
 * Habilidad para reiniciar el servidor de Softres de forma SEGURA desde el bot ICARO o Soft3.
 * 
 * CONFIGURACIÓN REQUERIDA EN .env:
 *   SOFTRES_SERVER_HOST=tu-ip-o-dominio
 *   SOFTRES_SERVER_USER=ubuntu
 *   SOFTRES_SSH_KEY_PATH=/ruta/a/tu/clave/id_rsa
 *   SOFTRES_APP_PATH=/var/www/softres
 * 
 * USO MANUAL DESDE TERMINAL:
 *   node softres_restart.js
 */

const { exec } = require('child_process');
const path = require('path');

const SERVER_CONFIG = {
    host: process.env.SOFTRES_SERVER_HOST || null,
    user: process.env.SOFTRES_SERVER_USER || 'ubuntu',
    sshKey: process.env.SOFTRES_SSH_KEY_PATH || path.join(process.env.HOME || 'C:\\Users\\SANTIAGO', '.ssh', 'id_rsa'),
    appPath: process.env.SOFTRES_APP_PATH || '/var/www/softres',
    branch: 'main'
};

function sshCommand(command) {
    return new Promise((resolve, reject) => {
        if (!SERVER_CONFIG.host) {
            reject(new Error('SOFTRES_SERVER_HOST no configurado en .env'));
            return;
        }
        const sshCmd = `ssh -i "${SERVER_CONFIG.sshKey}" -o StrictHostKeyChecking=no ${SERVER_CONFIG.user}@${SERVER_CONFIG.host} "${command}"`;
        console.log(`[SOFTRES] Ejecutando: ${command}`);
        exec(sshCmd, (error, stdout, stderr) => {
            if (error) reject({ error, stderr });
            else resolve(stdout);
        });
    });
}

/**
 * Reinicio seguro completo de Softres (Laravel).
 * Orden de ejecución:
 *   1. git pull origin main
 *   2. php artisan cache:clear
 *   3. php artisan config:clear
 *   4. php artisan view:clear
 *   5. php artisan route:clear
 *   6. php artisan optimize (opcional)
 */
async function softresServerRestart(options = {}) {
    const { skipPull = false, skipOptimize = false, restartPhpFpm = false } = options;
    const results = [];
    console.log('🚀 [SOFTRES] Iniciando reinicio seguro...');

    try {
        if (!skipPull) {
            const out = await sshCommand(`cd ${SERVER_CONFIG.appPath} && git pull origin ${SERVER_CONFIG.branch}`);
            results.push({ step: 'git pull', success: true, output: out });
        }

        const cacheCommands = [
            'php artisan cache:clear',
            'php artisan config:clear',
            'php artisan view:clear',
            'php artisan route:clear',
        ];
        for (const cmd of cacheCommands) {
            const out = await sshCommand(`cd ${SERVER_CONFIG.appPath} && ${cmd}`);
            results.push({ step: cmd, success: true, output: out });
        }

        if (!skipOptimize) {
            const out = await sshCommand(`cd ${SERVER_CONFIG.appPath} && php artisan optimize`);
            results.push({ step: 'php artisan optimize', success: true, output: out });
        }

        if (restartPhpFpm) {
            const out = await sshCommand('sudo systemctl restart php7.4-fpm');
            results.push({ step: 'restart php-fpm', success: true, output: out });
        }

        console.log('✅ [SOFTRES] Reinicio completado!');
        return { success: true, steps: results };

    } catch (err) {
        console.error('❌ [SOFTRES] Error:', err);
        return { success: false, error: err, steps: results };
    }
}

module.exports = { softresServerRestart, sshCommand, SERVER_CONFIG };

// Ejecutar directo si se llama como script
if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
    softresServerRestart().then(r => {
        console.log('Resultado:', JSON.stringify(r, null, 2));
        process.exit(r.success ? 0 : 1);
    });
}
