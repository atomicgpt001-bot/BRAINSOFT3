const sql = require('postgres')('postgresql://postgres.kkvujjyohspdynxltwqo:Jp2024013gg002@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true');

async function setup() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS conversaciones (
                id SERIAL PRIMARY KEY,
                vendedor_id TEXT,
                emisor TEXT, -- 'user' o 'ai'
                mensaje TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await sql`
            CREATE TABLE IF NOT EXISTS reportes_ventas (
                id SERIAL PRIMARY KEY,
                vendedor_id TEXT,
                datos JSONB,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        console.log("Tables created successfully");
        process.exit(0);
    } catch (e) {
        console.error("Error creating tables", e);
        process.exit(1);
    }
}

setup();
