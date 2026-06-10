const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for fetching synced products from local storage
ipcMain.handle('get-local-products', async () => {
  const userDataPath = app.getPath('userData');
  const productsFile = path.join(userDataPath, 'products.json');
  try {
    if (fs.existsSync(productsFile)) {
      const data = fs.readFileSync(productsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading local products.json:', error);
  }
  return null; // Return null if file doesn't exist, so frontend can fallback to static bundle
});

// IPC handler for syncing products from Supabase
ipcMain.handle('sync-products', async () => {
  const DATABASE_URL = "postgresql://postgres.kkvujjyohspdynxltwqo:Jp2024013gg002@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Fetch active products with their categories
    const query = `
      SELECT p.*, c.name as category_name 
      FROM "Product" p 
      LEFT JOIN "Category" c ON p."categoryId" = c.id 
      WHERE p."isActive" = true
    `;
    const res = await client.query(query);
    
    // Format products
    const formattedProducts = res.rows.map(p => {
      let imgUrl = 'https://via.placeholder.com/400';
      if (p.images) {
        if (p.images.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(p.images);
            if (arr && arr.length > 0) imgUrl = arr[0];
          } catch(e) {
            imgUrl = p.images.split(',')[0].replace(/\[|\]|"/g, '');
          }
        } else {
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

    // Save to local file
    const userDataPath = app.getPath('userData');
    const productsFile = path.join(userDataPath, 'products.json');
    fs.writeFileSync(productsFile, JSON.stringify(formattedProducts, null, 2), 'utf8');

    await client.end();
    return { success: true, count: formattedProducts.length, products: formattedProducts };
  } catch (error) {
    console.error('Sync error:', error);
    try { await client.end(); } catch(e) {}
    return { success: false, error: error.message };
  }
});
