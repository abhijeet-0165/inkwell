// ===== STATE =====
let books = [];
let currentBook = null;
let selectedText = '';
let selectedPDFRects = null;
let pdfDoc = null;
let pdfPage = 1;
let pdfScale = 1.5;
let pdfTextLayerTask = null;
let pdfHighlights = [];
let epubBook = null;
let epubRendition = null;
let isDark = true;
let isReaderDark = false;
let fontSize = 18;
let savePositionTimer = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadBooks();
  setupDragDrop();
  setupContextMenu();
  setupKeyboard();
});

// ===== LOAD BOOKS =====
async function loadBooks() {
  books = await window.api.getBooks();
  renderSidebar();
  renderGrid();
  // Generate missing PDF thumbnails in background
  for (const b of books) {
    if (b.fileType === 'pdf' && !b.thumbnailPath) {
      generatePDFThumbnail(b).catch(() => {});
    }
  }
}

function thumbSrc(book) {
  if (!book.thumbnailPath) return null;
  return 'file:///' + book.thumbnailPath.replace(/\\/g, '/');
}

function coverContent(book, large = false) {
  const src = thumbSrc(book);
  if (src) return `<img class="book-thumb${large ? ' book-thumb-lg' : ''}" src="${src}" alt="" loading="lazy"/>`;
  return large
    ? `<span style="font-size:3rem">${bookEmoji(book.fileType)}</span>`
    : `<span class="sb-spine-text">${book.fileType.toUpperCase()}</span>`;
}

// ===== RENDER SIDEBAR =====
function renderSidebar(filter = '') {
  const list = document.getElementById('bookList');
  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(filter.toLowerCase()) ||
    (b.author && b.author.toLowerCase().includes(filter.toLowerCase()))
  );
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i>No books yet.<br/>Click + to add one.</div>`;
    return;
  }
  list.innerHTML = filtered.map(b => `
    <div class="sb-item ${currentBook?.id === b.id ? 'active' : ''}" onclick="openBook(${b.id})">
      <div class="sb-spine ${b.thumbnailPath ? 'has-thumb' : ''}" style="background:${b.coverColor}">
        ${coverContent(b)}
      </div>
      <div class="sb-meta">
        <div class="sb-name">${escHtml(b.title)}</div>
        <div class="sb-type">${b.fileType}</div>
        <div class="sb-prog"><div class="sb-prog-fill" style="width:${b.progress||0}%"></div></div>
      </div>
      <button class="icon-btn" onclick="event.stopPropagation(); showBookMenu(event, ${b.id})" style="opacity:0.5">
        <i class="fas fa-ellipsis-v"></i>
      </button>
    </div>
  `).join('');
}

// ===== RENDER GRID =====
function renderGrid(filter = '') {
  const grid = document.getElementById('booksGrid');
  const hero = document.getElementById('libHero');
  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(filter.toLowerCase()) ||
    (b.author && b.author.toLowerCase().includes(filter.toLowerCase()))
  );
  if (hero) hero.style.display = books.length === 0 ? 'block' : 'none';
  if (filtered.length === 0 && books.length > 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i>No matches found.</div>`;
    return;
  }
  grid.innerHTML = filtered.map(b => `
    <div class="book-card" onclick="openBook(${b.id})">
      <div class="book-cover ${b.thumbnailPath ? 'has-thumb' : ''}" style="background:${b.coverColor}20; border-bottom: 2px solid ${b.coverColor}40">
        ${coverContent(b, true)}
        <span class="book-ext-badge" style="background:${b.coverColor}">${b.fileType}</span>
      </div>
      <div class="book-card-actions">
        <button class="bc-action" onclick="event.stopPropagation(); openEditModal(${b.id})" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="bc-action" onclick="event.stopPropagation(); deleteBook(${b.id})" title="Delete" style="color:var(--red)"><i class="fas fa-trash"></i></button>
      </div>
      <div class="book-card-body">
        <div class="bc-title">${escHtml(b.title)}</div>
        <div class="bc-author">${escHtml(b.author || 'Unknown')}</div>
        <div class="bc-prog"><div class="bc-prog-fill" style="width:${b.progress||0}%"></div></div>
      </div>
    </div>
  `).join('');
}

// ===== FILTER =====
function filterBooks() {
  const q = document.getElementById('searchInput').value;
  renderSidebar(q);
  renderGrid(q);
}

// ===== ADD BOOKS =====
async function addBooks() {
  const paths = await window.api.openFileDialog();
  for (const p of paths) {
    const result = await window.api.addBook(p);
    if (result.success && result.isNew) {
      const ext = p.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        const book = { id: result.id, filePath: p, fileType: 'pdf' };
        await generatePDFThumbnail(book);
      }
    }
  }
  await loadBooks();
}

// ===== DELETE BOOK =====
async function deleteBook(id) {
  if (!confirm('Remove this book from your library?')) return;
  await window.api.deleteBook(id);
  if (currentBook?.id === id) closeReader();
  await loadBooks();
}

// ===== BOOK EMOJI =====
function bookEmoji(type) {
  const map = { pdf: '📄', epub: '📚', mobi: '📖', txt: '📝', azw: '📗', azw3: '📗', fb2: '📘', cbz: '🖼️', cbr: '🖼️' };
  return map[type] || '📄';
}

// ===== ESCAPE HTML =====
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== SHOW BOOK MENU =====
function showBookMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById('contextMenu');
  menu.innerHTML = `
    <button onclick="openBook(${id}); hideContextMenu()"><i class="fas fa-book-open"></i> Open</button>
    <button onclick="openEditModal(${id}); hideContextMenu()"><i class="fas fa-pen"></i> Edit Info</button>
    <div class="ctx-sep"></div>
    <button onclick="deleteBook(${id}); hideContextMenu()" style="color:var(--red)"><i class="fas fa-trash"></i> Remove</button>
  `;
  positionMenu(e.clientX, e.clientY);
}

// ===== DRAG AND DROP =====
function setupDragDrop() {
  const overlay = document.getElementById('dropOverlay');
  document.addEventListener('dragover', e => { e.preventDefault(); overlay.classList.remove('hidden'); });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) overlay.classList.add('hidden'); });
  document.addEventListener('drop', async e => {
    e.preventDefault();
    overlay.classList.add('hidden');
    const files = [...e.dataTransfer.files];
    for (const f of files) {
      const result = await window.api.addBook(f.path);
      if (result.success && result.isNew && f.path.toLowerCase().endsWith('.pdf')) {
        await generatePDFThumbnail({ id: result.id, filePath: f.path, fileType: 'pdf' });
      }
    }
    await loadBooks();
  });
}

// Formats that need Calibre conversion before reading
const CONVERT_FORMATS = ['mobi', 'azw', 'azw3', 'fb2', 'cbz', 'cbr'];

// ===== OPEN BOOK =====
async function openBook(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  const exists = await window.api.fileExists(book.filePath);
  if (!exists) {
    alert(`File not found:\n${book.filePath}\n\nThe book may have been moved or deleted.`);
    return;
  }

  currentBook = book;
  document.getElementById('libraryView').classList.add('hidden');
  document.getElementById('readerView').classList.remove('hidden');
  document.getElementById('readerTitle').textContent = book.title;
  document.getElementById('readerAuthor').textContent = book.author || 'Unknown';

  renderSidebar(document.getElementById('searchInput').value);
  await loadPDFHighlights();
  await loadNotes();

  const type = book.fileType.toLowerCase();
  if (type === 'pdf') await openPDF(book);
  else if (type === 'epub') await openEPUB(book);
  else if (type === 'txt') await openTXT(book);
  else if (CONVERT_FORMATS.includes(type)) await openConvertible(book);
  else showUnsupported(book);
}

// ===== CLOSE READER =====
function closeReader() {
  currentBook = null;
  if (pdfTextLayerTask) { pdfTextLayerTask.cancel(); pdfTextLayerTask = null; }
  if (epubRendition) { epubRendition.destroy(); epubRendition = null; }
  if (epubBook) { epubBook.destroy(); epubBook = null; }
  pdfDoc = null;

  document.getElementById('readerView').classList.add('hidden');
  document.getElementById('libraryView').classList.remove('hidden');
  document.getElementById('notesPanel').classList.add('hidden');
  document.getElementById('pomodoroPanel').classList.add('hidden');
  pdfHighlights = [];
  document.getElementById('pdfReader').classList.add('hidden');
  document.getElementById('epubReader').classList.add('hidden');
  document.getElementById('txtReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');

  renderSidebar(document.getElementById('searchInput').value);
}

// ===== PDF READER =====
async function openPDF(book) {
  document.getElementById('pdfReader').classList.remove('hidden');
  document.getElementById('epubReader').classList.add('hidden');
  document.getElementById('txtReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');

  const fileUrl = await window.api.getFilePath(book.filePath);
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

  pdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
  const pos = await window.api.getPosition(book.id);
  pdfPage = pos ? parseInt(pos.position) || 1 : 1;
  await renderPDFPage();
}

async function renderPDFPage() {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pdfPage);
  const canvas = document.getElementById('pdfCanvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('pdfPageWrap');
  const scrollArea = wrap.parentElement;
  const availW = scrollArea.clientWidth - 40;
  const unscaledVp = page.getViewport({ scale: 1 });
  const scale = Math.min(pdfScale, availW / unscaledVp.width);
  const vp = page.getViewport({ scale });
  canvas.width = vp.width;
  canvas.height = vp.height;
  wrap.style.width = vp.width + 'px';
  wrap.style.height = vp.height + 'px';
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  const textLayer = document.getElementById('pdfTextLayer');
  textLayer.innerHTML = '';
  textLayer.style.width = vp.width + 'px';
  textLayer.style.height = vp.height + 'px';
  textLayer.style.setProperty('--scale-factor', scale);

  const hlLayer = document.getElementById('pdfHighlightLayer');
  hlLayer.style.width = vp.width + 'px';
  hlLayer.style.height = vp.height + 'px';

  if (pdfTextLayerTask) {
    pdfTextLayerTask.cancel();
    pdfTextLayerTask = null;
  }

  try {
    pdfTextLayerTask = pdfjsLib.renderTextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayer,
      viewport: vp,
    });
    await pdfTextLayerTask.promise;
  } catch (e) {
    if (e?.name !== 'AbortException') console.log('Text layer error:', e);
  }

  renderPDFHighlightOverlays();

  document.getElementById('pdfPageInfo').textContent = `Page ${pdfPage} / ${pdfDoc.numPages}`;
  const progress = Math.round((pdfPage / pdfDoc.numPages) * 100);
  updateProgress(progress);
  savePosition(String(pdfPage));
}

async function pdfNextPage() {
  if (!pdfDoc || pdfPage >= pdfDoc.numPages) return;
  pdfPage++;
  await renderPDFPage();
}

async function pdfPrevPage() {
  if (!pdfDoc || pdfPage <= 1) return;
  pdfPage--;
  await renderPDFPage();
}

// ===== PDF THUMBNAILS =====
async function generatePDFThumbnail(book) {
  try {
    const fileUrl = await window.api.getFilePath(book.filePath);
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument(fileUrl).promise;
    const page = await doc.getPage(1);
    const baseVp = page.getViewport({ scale: 1 });
    const thumbW = 240;
    const scale = thumbW / baseVp.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    const result = await window.api.saveThumbnail({ bookId: book.id, base64 });
    if (result.success) {
      const b = books.find(x => x.id === book.id);
      if (b) b.thumbnailPath = result.path;
      renderSidebar(document.getElementById('searchInput').value);
      renderGrid(document.getElementById('searchInput').value);
    }
    doc.destroy();
  } catch (e) {
    console.log('Thumbnail generation failed:', e);
  }
}

// ===== PDF INLINE HIGHLIGHTS =====
async function loadPDFHighlights() {
  if (!currentBook) return;
  pdfHighlights = await window.api.getHighlights(currentBook.id);
}

function parseHighlightLocation(loc) {
  if (!loc) return null;
  try { return JSON.parse(loc); } catch { return { page: parseInt(loc) || 1, rects: [] }; }
}

function getPDFSelectionRects() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];
  const wrap = document.getElementById('pdfPageWrap');
  if (!wrap) return [];
  const wrapRect = wrap.getBoundingClientRect();
  const w = wrap.offsetWidth, h = wrap.offsetHeight;
  if (!w || !h) return [];
  const rects = [];
  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      rects.push({
        left: (r.left - wrapRect.left) / w,
        top: (r.top - wrapRect.top) / h,
        width: r.width / w,
        height: r.height / h,
      });
    }
  }
  return rects;
}

function rectsOverlap(a, b) {
  return !(a.left + a.width < b.left || b.left + b.width < a.left ||
           a.top + a.height < b.top || b.top + b.height < a.top);
}

function findOverlappingHighlights() {
  if (currentBook?.fileType !== 'pdf') return [];
  const rects = selectedPDFRects || getPDFSelectionRects();
  const text = selectedText?.toLowerCase() || '';
  return pdfHighlights.filter(hl => {
    const loc = parseHighlightLocation(hl.location);
    if (!loc || loc.page !== pdfPage) return false;
    if (text && hl.text.toLowerCase().includes(text)) return true;
    if (!rects.length || !loc.rects?.length) return false;
    return rects.some(sr => loc.rects.some(hr => rectsOverlap(sr, hr)));
  });
}

function renderPDFHighlightOverlays() {
  const layer = document.getElementById('pdfHighlightLayer');
  if (!layer) return;
  layer.innerHTML = '';
  const wrap = document.getElementById('pdfPageWrap');
  const w = wrap.offsetWidth, h = wrap.offsetHeight;
  if (!w || !h) return;

  for (const hl of pdfHighlights) {
    const loc = parseHighlightLocation(hl.location);
    if (!loc || loc.page !== pdfPage || !loc.rects?.length) continue;
    for (const r of loc.rects) {
      const mark = document.createElement('div');
      mark.className = 'pdf-hl-mark';
      mark.style.left = (r.left * w) + 'px';
      mark.style.top = (r.top * h) + 'px';
      mark.style.width = (r.width * w) + 'px';
      mark.style.height = (r.height * h) + 'px';
      mark.style.background = hl.color;
      mark.title = 'Click to remove highlight';
      mark.innerHTML = '<span class="pdf-hl-remove">×</span>';
      mark.onmousedown = (e) => e.preventDefault();
      mark.onclick = (e) => {
        e.stopPropagation();
        removePDFHighlight(hl.id);
      };
      layer.appendChild(mark);
    }
  }
}

async function removePDFHighlight(id) {
  await window.api.deleteHighlight(id);
  pdfHighlights = pdfHighlights.filter(h => h.id !== id);
  renderPDFHighlightOverlays();
}

async function removeOverlappingHighlights() {
  const matches = findOverlappingHighlights();
  if (!matches.length) return;
  hideContextMenu();
  for (const hl of matches) {
    await window.api.deleteHighlight(hl.id);
  }
  const removedIds = new Set(matches.map(h => h.id));
  pdfHighlights = pdfHighlights.filter(h => !removedIds.has(h.id));
  renderPDFHighlightOverlays();
  selectedText = '';
  selectedPDFRects = null;
  window.getSelection()?.removeAllRanges();
}

// ===== PDF FONT SIZE (zoom) =====
function increaseFontSize() {
  if (currentBook?.fileType === 'pdf') { pdfScale = Math.min(pdfScale + 0.25, 4); renderPDFPage(); return; }
  fontSize = Math.min(fontSize + 2, 32);
  document.documentElement.style.setProperty('--font-size', fontSize + 'px');
}
function decreaseFontSize() {
  if (currentBook?.fileType === 'pdf') { pdfScale = Math.max(pdfScale - 0.25, 0.5); renderPDFPage(); return; }
  fontSize = Math.max(fontSize - 2, 12);
  document.documentElement.style.setProperty('--font-size', fontSize + 'px');
}

// ===== EPUB READER =====
async function openEPUB(book) {
  document.getElementById('epubReader').classList.remove('hidden');
  document.getElementById('pdfReader').classList.add('hidden');
  document.getElementById('txtReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');

  if (epubRendition) { epubRendition.destroy(); epubRendition = null; }
  if (epubBook) { epubBook.destroy(); epubBook = null; }

  try {
    const fileUrl = await window.api.getFilePath(book.filePath);
    epubBook = ePub(fileUrl);
    const viewer = document.getElementById('epubViewer');
    viewer.innerHTML = '';

  epubRendition = epubBook.renderTo(viewer, {
    width: '100%',
    height: '100%',
    flow: 'paginated',
    manager: 'default'
  });

  const pos = await window.api.getPosition(book.id);
  if (pos && pos.position && !pos.position.match(/^\d+$/)) {
    await epubRendition.display(pos.position);
  } else {
    await epubRendition.display();
  }

  epubRendition.on('relocated', (location) => {
    const progress = epubBook.locations.percentageFromCfi(location.start.cfi);
    if (progress) updateProgress(Math.round(progress * 100));
    savePosition(location.start.cfi);
  });

  epubBook.ready.then(() => epubBook.locations.generate(1024));

  // Enable text selection inside epub
  epubRendition.on('rendered', () => {
    const iframes = viewer.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument;
        iDoc.addEventListener('mouseup', handleIframeSelection);
      } catch(e) {}
    });
  });
  } catch (error) {
    console.error('Format error:', error);
    document.getElementById('epubViewer').innerHTML = `
      <div class="unsup-body">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Cannot open .${book.fileType.toUpperCase()}</h3>
        <p>This format couldn't be loaded. Try opening with Calibre.</p>
      </div>
    `;
  }
}

function epubNext() { if (epubRendition) epubRendition.next(); }
function epubPrev() { if (epubRendition) epubRendition.prev(); }

// ===== TXT / FALLBACK READER =====
async function openTXT(book) {
  document.getElementById('txtReader').classList.remove('hidden');
  document.getElementById('pdfReader').classList.add('hidden');
  document.getElementById('epubReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');

  const result = await window.api.getFileData(book.filePath);
  if (!result.success) { showUnsupported(book); return; }

  const bytes = atob(result.data);
  let text = '';
  try { text = new TextDecoder('utf-8').decode(Uint8Array.from(bytes, c => c.charCodeAt(0))); }
  catch(e) { text = bytes; }

  const content = document.getElementById('txtContent');
  content.textContent = text;

  const pos = await window.api.getPosition(book.id);
  const txtWrap = document.getElementById('txtReader');
  if (pos && pos.position) txtWrap.scrollTop = parseFloat(pos.position) || 0;

  txtWrap.addEventListener('scroll', () => {
    clearTimeout(savePositionTimer);
    savePositionTimer = setTimeout(() => {
      const pct = (txtWrap.scrollTop / (txtWrap.scrollHeight - txtWrap.clientHeight)) * 100;
      updateProgress(Math.round(pct));
      savePosition(String(txtWrap.scrollTop));
    }, 500);
  });
}

// ===== CONVERTIBLE FORMATS (MOBI, AZW, etc.) =====
async function openConvertible(book) {
  hideAllReaders();
  document.getElementById('unsupReader').classList.remove('hidden');
  document.getElementById('unsupContent').innerHTML = `
    <div class="unsup-body converting">
      <i class="fas fa-sync-alt fa-spin"></i>
      <h3>Preparing ${book.fileType.toUpperCase()}…</h3>
      <p>Converting to EPUB for reading. This may take a moment.</p>
    </div>
  `;

  const result = await window.api.convertBook(book.filePath);
  if (result.success) {
    document.getElementById('unsupReader').classList.add('hidden');
    await openEPUB({ ...book, filePath: result.outFile, fileType: 'epub' });
  } else {
    showConversionFailed(book, result.error);
  }
}

function hideAllReaders() {
  document.getElementById('pdfReader').classList.add('hidden');
  document.getElementById('epubReader').classList.add('hidden');
  document.getElementById('txtReader').classList.add('hidden');
  document.getElementById('unsupReader').classList.add('hidden');
}

function showConversionFailed(book, error) {
  document.getElementById('unsupReader').classList.remove('hidden');
  document.getElementById('unsupContent').innerHTML = `
    <div class="unsup-body">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Cannot open .${book.fileType.toUpperCase()}</h3>
      <p>${escHtml(error)}</p>
      <button class="btn-primary" style="margin:16px auto;max-width:220px" onclick="convertAndOpen(${book.id})">
        <i class="fas fa-redo"></i> Try Again
      </button>
      <p style="font-size:0.75rem;color:var(--text2);margin-top:8px">
        <a href="#" style="color:var(--accent2)" onclick="event.preventDefault();window.api.openExternal('https://calibre-ebook.com/download')">Download Calibre free →</a>
      </p>
    </div>
  `;
}

// ===== UNSUPPORTED =====
function showUnsupported(book) {
  hideAllReaders();
  document.getElementById('unsupReader').classList.remove('hidden');
  document.getElementById('unsupContent').innerHTML = `
    <div class="unsup-body">
      <i class="fas fa-file-circle-question"></i>
      <h3>.${book.fileType.toUpperCase()} Format</h3>
      <p>This format needs conversion to EPUB for reading.<br/>Click below to convert using Calibre (if installed).</p>
      <button class="btn-primary" style="margin:16px auto;max-width:220px" onclick="convertAndOpen(${book.id})">
        <i class="fas fa-sync-alt"></i> Convert to EPUB
      </button>
      <p style="font-size:0.75rem;color:var(--text2);margin-top:8px">
        <a href="#" style="color:var(--accent2)" onclick="event.preventDefault();window.api.openExternal('https://calibre-ebook.com/download')">Download Calibre free →</a>
      </p>
      <p style="margin-top:6px;font-size:0.68rem;color:var(--border)">${escHtml(book.filePath)}</p>
    </div>
  `;
}

async function convertAndOpen(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  await openConvertible(book);
}

// ===== PROGRESS =====
function updateProgress(pct) {
  pct = Math.min(100, Math.max(0, pct));
  document.getElementById('progressBar').style.setProperty('--progress', pct + '%');
  document.getElementById('progressLabel').textContent = pct + '%';
  if (currentBook) { currentBook.progress = pct; const b = books.find(x => x.id === currentBook.id); if(b) b.progress = pct; }
}

// ===== SAVE POSITION =====
async function savePosition(pos) {
  if (!currentBook) return;
  await window.api.savePosition({ bookId: currentBook.id, position: pos });
}


// ===== CONTEXT MENU =====
function setupContextMenu() {
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#contextMenu')) hideContextMenu();
  });
}

function handleTextSelection(e) {
  if (e?.target?.closest('#contextMenu')) return;
  // Small delay so browser finishes updating selection (especially PDF text layer)
  setTimeout(() => {
    const text = getSelectedText();
    if (text.length > 2) {
      selectedText = text;
      const x = e?.clientX ?? window.innerWidth / 2;
      const y = e?.clientY ?? window.innerHeight / 2;
      showTextMenu(x, y);
    } else {
      hideContextMenu();
    }
  }, 10);
}

function getSelectedText() {
  const sel = window.getSelection();
  return sel ? sel.toString().trim() : '';
}

function handleIframeSelection(e) {
  const sel = e.target.ownerDocument.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (text.length > 2) {
    selectedText = text;
    showTextMenu(e.screenX - window.screenX, e.screenY - window.screenY - 38);
  }
}

function showTextMenu(x, y) {
  if (!currentBook) return;
  selectedPDFRects = currentBook.fileType === 'pdf' ? getPDFSelectionRects() : null;
  const overlapping = findOverlappingHighlights();
  const menu = document.getElementById('contextMenu');
  const removeBtn = overlapping.length ? `
    <button onmousedown="event.preventDefault()" onclick="removeOverlappingHighlights()" style="color:var(--red)">
      <i class="fas fa-eraser"></i> Remove Highlight
    </button>
    <div class="ctx-sep"></div>
  ` : '';
  menu.innerHTML = `
    ${removeBtn}
    <button onmousedown="event.preventDefault()" onclick="highlightSelection('yellow')"><span class="dot" style="background:#fbbf24"></span>Highlight Yellow</button>
    <button onmousedown="event.preventDefault()" onclick="highlightSelection('green')"><span class="dot" style="background:#34d399"></span>Highlight Green</button>
    <button onmousedown="event.preventDefault()" onclick="highlightSelection('pink')"><span class="dot" style="background:#f472b6"></span>Highlight Pink</button>
    <div class="ctx-sep"></div>
    <button onmousedown="event.preventDefault()" onclick="askChatGPT()"><i class="fas fa-robot"></i> Ask ChatGPT</button>
    <button onmousedown="event.preventDefault()" onclick="copySelection()"><i class="fas fa-copy"></i> Copy</button>
  `;
  positionMenu(x, y);
}

function positionMenu(x, y) {
  const menu = document.getElementById('contextMenu');
  menu.classList.remove('hidden');
  const mw = 190, mh = 180;
  const left = x + mw > window.innerWidth ? x - mw : x;
  const top = y + mh > window.innerHeight ? y - mh : y + 6;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function hideContextMenu() {
  document.getElementById('contextMenu').classList.add('hidden');
}

// ===== HIGHLIGHT =====
async function highlightSelection(colorName) {
  if (!selectedText || !currentBook) return;
  hideContextMenu();
  const colorMap = { yellow: '#fbbf24', green: '#34d399', pink: '#f472b6' };
  const color = colorMap[colorName];

  let location = '';
  if (currentBook.fileType === 'pdf') {
    const rects = selectedPDFRects || getPDFSelectionRects();
    if (!rects.length) return;
    location = JSON.stringify({ page: pdfPage, rects });
  }
  selectedPDFRects = null;

  const result = await window.api.saveHighlight({
    bookId: currentBook.id,
    text: selectedText,
    color,
    note: '',
    location,
  });

  if (currentBook.fileType === 'pdf' && result.id) {
    pdfHighlights.unshift({
      id: result.id,
      text: selectedText,
      color,
      location,
      createdAt: new Date().toISOString(),
    });
    renderPDFHighlightOverlays();
  }

  selectedText = '';
  window.getSelection()?.removeAllRanges();
}

// ===== ASK CHATGPT =====
async function askChatGPT() {
  if (!selectedText) return;
  hideContextMenu();
  await window.api.openChatGPT(selectedText);
}

// ===== COPY =====
function copySelection() {
  if (!selectedText) return;
  navigator.clipboard.writeText(selectedText).catch(() => {});
  hideContextMenu();
}

// ===== NOTES =====
async function loadNotes() {
  if (!currentBook) return;
  const notes = await window.api.getNotes(currentBook.id);
  const list = document.getElementById('notesList');
  if (notes.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-sticky-note"></i>No notes yet.</div>`;
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="note-item">
      <div>${escHtml(n.content)}</div>
      <div class="note-date">${new Date(n.createdAt).toLocaleDateString()}</div>
      <button class="note-delete" onclick="deleteNote(${n.id})"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

async function addNote() {
  const input = document.getElementById('newNoteInput');
  const content = input.value.trim();
  if (!content || !currentBook) return;
  await window.api.saveNote({ bookId: currentBook.id, content, location: '' });
  input.value = '';
  await loadNotes();
}

async function deleteNote(id) {
  await window.api.deleteNote(id);
  await loadNotes();
}

function toggleNotesPanel() {
  const panel = document.getElementById('notesPanel');
  const pomoPanel = document.getElementById('pomodoroPanel');
  pomoPanel.classList.add('hidden');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) loadNotes();
}

// ===== DARK MODE (app) =====
function toggleDarkMode() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.getElementById('darkModeIcon').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== READER DARK MODE (invert page) =====
function toggleReaderDark() {
  isReaderDark = !isReaderDark;
  document.getElementById('readerContent').classList.toggle('reader-dark', isReaderDark);
  document.getElementById('readerDarkBtn').style.color = isReaderDark ? 'var(--accent2)' : '';
}

// ===== PAGE MODE =====
function togglePageMode() {
  if (epubRendition) {
    const current = epubRendition.settings.flow;
    epubRendition.flow(current === 'paginated' ? 'scrolled' : 'paginated');
  }
}

// ===== EDIT MODAL =====
let editingBookId = null;
function openEditModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  editingBookId = id;
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  const preview = document.getElementById('editCoverPreview');
  const src = thumbSrc(book);
  preview.innerHTML = src
    ? `<img src="${src}" alt=""/>`
    : `<span style="font-size:2rem">${bookEmoji(book.fileType)}</span>`;
  document.getElementById('editCoverRow').style.display = book.fileType === 'pdf' ? 'flex' : 'none';
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  editingBookId = null;
}
async function saveEditModal() {
  if (!editingBookId) return;
  const title = document.getElementById('editTitle').value.trim();
  const author = document.getElementById('editAuthor').value.trim();
  if (!title) return;
  await window.api.updateBook({ id: editingBookId, title, author });
  closeEditModal();
  await loadBooks();
}

async function pickCustomThumbnail() {
  if (!editingBookId) return;
  const result = await window.api.pickThumbnail(editingBookId);
  if (result.success) {
    const book = books.find(b => b.id === editingBookId);
    if (book) book.thumbnailPath = result.path;
    const src = thumbSrc({ thumbnailPath: result.path });
    document.getElementById('editCoverPreview').innerHTML = `<img src="${src}" alt=""/>`;
    renderSidebar(document.getElementById('searchInput').value);
    renderGrid(document.getElementById('searchInput').value);
  }
}
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('editModal')) closeEditModal();
});

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch(e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ':
        if (e.key === ' ' && getSelectedText()) return;
        e.preventDefault();
        if (currentBook?.fileType === 'pdf') pdfNextPage();
        else if (epubRendition) epubNext();
        break;
      case 'ArrowLeft': case 'ArrowUp':
        e.preventDefault();
        if (currentBook?.fileType === 'pdf') pdfPrevPage();
        else if (epubRendition) epubPrev();
        break;
      case 'Escape':
        hideContextMenu();
        closeEditModal();
        break;
      case '+': case '=': increaseFontSize(); break;
      case '-': decreaseFontSize(); break;
      case 'd': toggleReaderDark(); break;
    }
  });
}


// ===== POMODORO TIMER =====
const POMO_CIRCUMFERENCE = 2 * Math.PI * 52; // 326.7
let pomoMode = 'focus';
let pomoRunning = false;
let pomoInterval = null;
let pomoSecondsLeft = 25 * 60;
let pomoTotalSeconds = 25 * 60;
let pomoSessions = 0;
let pomoSettings = { focus: 25, break: 5, long: 15 };

function togglePomodoroPanel() {
  const p = document.getElementById('pomodoroPanel');
  const nt = document.getElementById('notesPanel');
  nt.classList.add('hidden');
  p.classList.toggle('hidden');
}

function setPomoMode(mode) {
  if (pomoRunning) resetPomodoro();
  pomoMode = mode;
  document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
  const tabMap = { focus: 'pomoTabFocus', break: 'pomoTabBreak', long: 'pomoTabLong' };
  document.getElementById(tabMap[mode]).classList.add('active');
  const mins = pomoSettings[mode];
  pomoSecondsLeft = mins * 60;
  pomoTotalSeconds = mins * 60;
  const labels = { focus: 'Focus time 🎯', break: 'Short break ☕', long: 'Long break 🛋️' };
  document.getElementById('pomoLabel').textContent = labels[mode];
  updatePomoDisplay();
}

function updatePomoSettings() {
  pomoSettings.focus = parseInt(document.getElementById('pomoFocusMins').value) || 25;
  pomoSettings.break = parseInt(document.getElementById('pomoBreakMins').value) || 5;
  pomoSettings.long = parseInt(document.getElementById('pomoLongMins').value) || 15;
  setPomoMode(pomoMode);
}

function togglePomodoro() {
  if (pomoRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  pomoRunning = true;
  const btn = document.getElementById('pomoPlayBtn');
  btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  btn.classList.add('running');
  pomoInterval = setInterval(() => {
    pomoSecondsLeft--;
    updatePomoDisplay();
    if (pomoSecondsLeft <= 0) {
      clearInterval(pomoInterval);
      pomoRunning = false;
      onPomoFinished();
    }
  }, 1000);
}

function pausePomodoro() {
  pomoRunning = false;
  clearInterval(pomoInterval);
  const btn = document.getElementById('pomoPlayBtn');
  btn.innerHTML = '<i class="fas fa-play"></i> Resume';
  btn.classList.remove('running');
}

function resetPomodoro() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  const btn = document.getElementById('pomoPlayBtn');
  btn.innerHTML = '<i class="fas fa-play"></i> Start';
  btn.classList.remove('running');
  const mins = pomoSettings[pomoMode];
  pomoSecondsLeft = mins * 60;
  pomoTotalSeconds = mins * 60;
  updatePomoDisplay();
}

function updatePomoDisplay() {
  const m = String(Math.floor(pomoSecondsLeft / 60)).padStart(2, '0');
  const s = String(pomoSecondsLeft % 60).padStart(2, '0');
  document.getElementById('pomoTime').textContent = `${m}:${s}`;
  const progress = pomoSecondsLeft / pomoTotalSeconds;
  const offset = POMO_CIRCUMFERENCE * (1 - progress);
  document.getElementById('pomoRingFill').style.strokeDashoffset = offset;
}

function onPomoFinished() {
  const btn = document.getElementById('pomoPlayBtn');
  btn.innerHTML = '<i class="fas fa-play"></i> Start';
  btn.classList.remove('running');
  if (pomoMode === 'focus') {
    pomoSessions++;
    document.getElementById('pomoCount').textContent = pomoSessions;
  }
  playRelaxingSound();
  // auto switch mode
  if (pomoMode === 'focus') {
    const nextMode = pomoSessions % 4 === 0 ? 'long' : 'break';
    setTimeout(() => setPomoMode(nextMode), 1500);
  } else {
    setTimeout(() => setPomoMode('focus'), 1500);
  }
}

// ===== RELAXING SOUND (Web Audio API - no files needed) =====
function playRelaxingSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Bowl-like bell sound using oscillators + reverb
  function playBell(freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const osc2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, startTime); // harmonic

    gainNode.gain.setValueAtTime(0.4, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    gainNode2.gain.setValueAtTime(0.15, startTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7);

    osc.connect(gainNode);
    osc2.connect(gainNode2);
    gainNode.connect(ctx.destination);
    gainNode2.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.7);
  }

  const now = ctx.currentTime;
  // Three calming tones (like Tibetan singing bowl)
  playBell(220, now, 4.0);
  playBell(329.6, now + 0.8, 3.5);
  playBell(440, now + 1.6, 3.0);

  // Soft close after
  setTimeout(() => ctx.close(), 6000);
}

