const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Files
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  addBook: (filePath) => ipcRenderer.invoke('add-book', filePath),
  getBooks: () => ipcRenderer.invoke('get-books'),
  deleteBook: (id) => ipcRenderer.invoke('delete-book', id),
  updateBook: (data) => ipcRenderer.invoke('update-book', data),
  getFileData: (filePath) => ipcRenderer.invoke('get-file-data', filePath),
  getFilePath: (filePath) => ipcRenderer.invoke('get-file-path', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  // Reading
  savePosition: (data) => ipcRenderer.invoke('save-position', data),
  getPosition: (bookId) => ipcRenderer.invoke('get-position', bookId),

  // Highlights
  saveHighlight: (data) => ipcRenderer.invoke('save-highlight', data),
  getHighlights: (bookId) => ipcRenderer.invoke('get-highlights', bookId),
  deleteHighlight: (id) => ipcRenderer.invoke('delete-highlight', id),

  // Notes
  saveNote: (data) => ipcRenderer.invoke('save-note', data),
  getNotes: (bookId) => ipcRenderer.invoke('get-notes', bookId),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  // ChatGPT
  openChatGPT: (text) => ipcRenderer.invoke('open-chatgpt', text),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Calibre conversion
  convertBook: (filePath) => ipcRenderer.invoke('convert-book', filePath),

  // Thumbnails
  saveThumbnail: (data) => ipcRenderer.invoke('save-thumbnail', data),
  pickThumbnail: (bookId) => ipcRenderer.invoke('pick-thumbnail', bookId),
});
