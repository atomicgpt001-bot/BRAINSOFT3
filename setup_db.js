const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
    try {
        const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:@127.0.0.1:3306/softres');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS conversaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendedor_id VARCHAR(255),
                emisor VARCHAR(50), -- 'user' o 'ai'
                mensaje TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reportes_ventas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendedor_id VARCHAR(255),
                datos JSON,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Tablas creadas exitosamente en MySQL");
        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error("Error creando tablas", e);
        process.exit(1);
    }
}

setup();
