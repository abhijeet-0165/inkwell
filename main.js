const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let mainWindow;
let db;

function initDB() {
  const userDataPath = app.getPath('userData');
  db = new Database(path.join(userDataPath, 'inkwell.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT 'Unknown',
      filePath TEXT UNIQUE NOT NULL,
      fileType TEXT NOT NULL,
      coverColor TEXT DEFAULT '#7c3aed',
      addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastOpened DATETIME,
      progress REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reading_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookId INTEGER NOT NULL,
      position TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bookId) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookId INTEGER NOT NULL,
      text TEXT NOT NULL,
      color TEXT DEFAULT '#fbbf24',
      note TEXT DEFAULT '',
      location TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bookId) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookId INTEGER NOT NULL,
      content TEXT NOT NULL,
      location TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bookId) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  // Migration: thumbnail column
  const cols = db.prepare("PRAGMA table_info(books)").all().map(c => c.name);
  if (!cols.includes('thumbnailPath')) {
    db.exec('ALTER TABLE books ADD COLUMN thumbnailPath TEXT');
  }
}

function getThumbnailsDir() {
  const dir = path.join(app.getPath('userData'), 'thumbnails');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function deleteBookThumbnail(bookId) {
  const book = db.prepare('SELECT thumbnailPath FROM books WHERE id = ?').get(bookId);
  if (book?.thumbnailPath && fs.existsSync(book.thumbnailPath)) {
    try { fs.unlinkSync(book.thumbnailPath); } catch (_) {}
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('renderer/index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  initDB();
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ===== IPC HANDLERS =====

// Window controls
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
ipcMain.on('window-close', () => app.quit());

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Books', extensions: ['pdf', 'epub', 'mobi', 'azw', 'azw3', 'txt', 'fb2', 'cbz', 'cbr'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'EPUB', extensions: ['epub'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

// Add book
ipcMain.handle('add-book', (_, filePath) => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const title = path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, ' ');
  const colors = ['#7c3aed','#2563eb','#059669','#dc2626','#d97706','#db2777','#0891b2'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  try {
    const existing = db.prepare('SELECT id FROM books WHERE filePath = ?').get(filePath);
    if (existing) return { success: true, id: existing.id, isNew: false };
    const stmt = db.prepare('INSERT INTO books (title, filePath, fileType, coverColor) VALUES (?, ?, ?, ?)');
    const result = stmt.run(title, filePath, ext, color);
    return { success: true, id: result.lastInsertRowid, isNew: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get all books
ipcMain.handle('get-books', () => {
  return db.prepare('SELECT * FROM books ORDER BY lastOpened DESC, addedAt DESC').all();
});

// Delete book
ipcMain.handle('delete-book', (_, id) => {
  const book = db.prepare('SELECT thumbnailPath FROM books WHERE id = ?').get(id);
  if (book?.thumbnailPath && fs.existsSync(book.thumbnailPath)) {
    try { fs.unlinkSync(book.thumbnailPath); } catch (_) {}
  }
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return { success: true };
});

// Update book title/author
ipcMain.handle('update-book', (_, { id, title, author }) => {
  db.prepare('UPDATE books SET title = ?, author = ? WHERE id = ?').run(title, author, id);
  return { success: true };
});

// Get file as base64
ipcMain.handle('get-file-data', (_, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { success: true, data: data.toString('base64'), size: data.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get file path for webview
ipcMain.handle('get-file-path', (_, filePath) => {
  return `file://${filePath.replace(/\\/g, '/')}`;
});

// Save reading position
ipcMain.handle('save-position', (_, { bookId, position }) => {
  const existing = db.prepare('SELECT id FROM reading_positions WHERE bookId = ?').get(bookId);
  if (existing) {
    db.prepare('UPDATE reading_positions SET position = ?, updatedAt = CURRENT_TIMESTAMP WHERE bookId = ?').run(position, bookId);
  } else {
    db.prepare('INSERT INTO reading_positions (bookId, position) VALUES (?, ?)').run(bookId, position);
  }
  db.prepare('UPDATE books SET lastOpened = CURRENT_TIMESTAMP, progress = ? WHERE id = ?').run(parseFloat(position) || 0, bookId);
  return { success: true };
});

// Get reading position
ipcMain.handle('get-position', (_, bookId) => {
  return db.prepare('SELECT position FROM reading_positions WHERE bookId = ?').get(bookId);
});

// Save highlight
ipcMain.handle('save-highlight', (_, { bookId, text, color, note, location }) => {
  const stmt = db.prepare('INSERT INTO highlights (bookId, text, color, note, location) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(bookId, text, color || '#fbbf24', note || '', location || '');
  return { success: true, id: result.lastInsertRowid };
});

// Get highlights for book
ipcMain.handle('get-highlights', (_, bookId) => {
  return db.prepare('SELECT * FROM highlights WHERE bookId = ? ORDER BY createdAt DESC').all(bookId);
});

// Delete highlight
ipcMain.handle('delete-highlight', (_, id) => {
  db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
  return { success: true };
});

// Save note
ipcMain.handle('save-note', (_, { bookId, content, location }) => {
  const stmt = db.prepare('INSERT INTO notes (bookId, content, location) VALUES (?, ?, ?)');
  const result = stmt.run(bookId, content, location || '');
  return { success: true, id: result.lastInsertRowid };
});

// Get notes
ipcMain.handle('get-notes', (_, bookId) => {
  return db.prepare('SELECT * FROM notes WHERE bookId = ? ORDER BY createdAt DESC').all(bookId);
});

// Delete note
ipcMain.handle('delete-note', (_, id) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return { success: true };
});

// Open ChatGPT with selected text
ipcMain.handle('open-chatgpt', (_, text) => {
  const query = encodeURIComponent(`Explain this text to me:\n\n"${text}"`);
  shell.openExternal(`https://chatgpt.com/?q=${query}`);
  return { success: true };
});

// Open external URL in default browser
ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
  return { success: true };
});

// Save book thumbnail (base64 PNG)
ipcMain.handle('save-thumbnail', (_, { bookId, base64 }) => {
  try {
    deleteBookThumbnail(bookId);
    const thumbPath = path.join(getThumbnailsDir(), `${bookId}.png`);
    fs.writeFileSync(thumbPath, Buffer.from(base64, 'base64'));
    db.prepare('UPDATE books SET thumbnailPath = ? WHERE id = ?').run(thumbPath, bookId);
    return { success: true, path: thumbPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Pick custom thumbnail image
ipcMain.handle('pick-thumbnail', async (_, bookId) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { success: false };
  try {
    const src = result.filePaths[0];
    const ext = path.extname(src).toLowerCase() || '.png';
    deleteBookThumbnail(bookId);
    const thumbPath = path.join(getThumbnailsDir(), `${bookId}${ext}`);
    fs.copyFileSync(src, thumbPath);
    db.prepare('UPDATE books SET thumbnailPath = ? WHERE id = ?').run(thumbPath, bookId);
    return { success: true, path: thumbPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Check if file exists
ipcMain.handle('file-exists', (_, filePath) => {
  return fs.existsSync(filePath);
});

// Convert unsupported format to EPUB using Calibre
ipcMain.handle('convert-book', async (_, filePath) => {
  const { exec } = require('child_process');
  const os = require('os');
  const outDir = path.join(os.tmpdir(), 'inkwell-converted');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const baseName = path.basename(filePath, path.extname(filePath));
  const outFile = path.join(outDir, baseName + '.epub');

  // Reuse cached conversion if source hasn't changed
  if (fs.existsSync(outFile)) {
    try {
      const srcStat = fs.statSync(filePath);
      const outStat = fs.statSync(outFile);
      if (outStat.mtimeMs >= srcStat.mtimeMs) {
        return { success: true, outFile, converted: false };
      }
    } catch (_) { /* re-convert */ }
  }

  // Common Calibre paths on Windows
  const calibrePaths = [
    'ebook-convert',
    'C:\\Program Files\\Calibre\\ebook-convert.exe',
    'C:\\Program Files\\Calibre2\\ebook-convert.exe',
    'C:\\Program Files (x86)\\Calibre2\\ebook-convert.exe',
  ];

  for (const bin of calibrePaths) {
    try {
      await new Promise((resolve, reject) => {
        exec(`"${bin}" "${filePath}" "${outFile}"`, { timeout: 120000 }, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      if (fs.existsSync(outFile)) {
        return { success: true, outFile, converted: true };
      }
    } catch(e) { continue; }
  }
  return { success: false, error: 'Calibre not found. Install it free from calibre-ebook.com' };
});
