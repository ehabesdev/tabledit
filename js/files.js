import { auth } from './firebase-config.js';
import { 
    getUserFiles, 
    loadUserFile, 
    deleteUserFile, 
    updateUserFile,
    saveUserTable,
    serializeTableData,
    deserializeTableData,
    setupAutoSave,
    stopAutoSave,
    getUserFileStats,
    searchUserFiles
} from './user-manager.js';

let currentFiles = [];
let currentViewMode = 'grid';
let selectedFileId = null;
let searchTimeout = null;
let authModule = null;

async function loadAuthModule() {
    if (!authModule) {
        try {
            authModule = await import('./auth.js');
            return true;
        } catch (error) {
            console.error('Auth modülü yüklenemedi:', error);
            return false;
        }
    }
    return true;
}

function initializeFilesPage() {
    console.log('Dosyalar sayfası başlatılıyor...');
    
    setupEventListeners();
    initializeAuth();
    loadFiles();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
}

function setupEventListeners() {
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.user-profile')) {
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    });

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        uploadArea.addEventListener('click', () => fileInput?.click());
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAllModals();
        }
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
    });
}

async function initializeAuth() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.initializeAuth();
        
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = './index.html';
                return;
            }
            
            await loadUserProfile(user);
            const verificationStatus = await checkUserVerificationStatus(user.uid);
            
            if (!verificationStatus.verified) {
                showEmailVerificationWarning();
            } else {
                hideEmailVerificationWarning();
            }
        });
    }
}

async function loadUserProfile(user) {
    try {
        const userAvatar = document.querySelector('.user-avatar');
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        const displayName = user.displayName || user.email.split('@')[0];
        const initials = displayName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
        
        if (userAvatar) {
            userAvatar.textContent = initials;
        }
        
        userNameElements.forEach(element => {
            element.textContent = displayName;
        });
        
        userEmailElements.forEach(element => {
            element.textContent = user.email;
        });
        
    } catch (error) {
        console.error('Kullanıcı profili yüklenemedi:', error);
    }
}

async function checkUserVerificationStatus(userId) {
    try {
        const { checkUserVerificationStatus } = await import('./email-verification.js');
        return await checkUserVerificationStatus(userId);
    } catch (error) {
        console.error('Doğrulama durumu kontrol edilemedi:', error);
        return { verified: false };
    }
}

function showEmailVerificationWarning() {
    const warning = document.getElementById('emailVerificationWarning');
    if (warning) {
        warning.style.display = 'block';
    }
}

function hideEmailVerificationWarning() {
    const warning = document.getElementById('emailVerificationWarning');
    if (warning) {
        warning.style.display = 'none';
    }
}

async function loadFiles() {
    try {
        showLoadingState();
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const files = await getUserFiles();
        const stats = await getUserFileStats();
        
        currentFiles = files;
        updateFileStats(stats);
        displayFiles(files);
        
    } catch (error) {
        console.error('Dosyalar yüklenemedi:', error);
        showError('Dosyalar yüklenirken hata oluştu: ' + error.message);
    }
}

function showLoadingState() {
    const loadingEl = document.getElementById('loadingFiles');
    const emptyEl = document.getElementById('emptyState');
    const gridEl = document.getElementById('filesGrid');
    const listEl = document.getElementById('filesList');
    
    if (loadingEl) loadingEl.style.display = 'flex';
    if (emptyEl) emptyEl.style.display = 'none';
    if (gridEl) gridEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';
}

function displayFiles(files) {
    const loadingEl = document.getElementById('loadingFiles');
    const emptyEl = document.getElementById('emptyState');
    const gridEl = document.getElementById('filesGrid');
    const listEl = document.getElementById('filesList');
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (files.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (gridEl) gridEl.style.display = 'none';
        if (listEl) listEl.style.display = 'none';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    if (currentViewMode === 'grid') {
        displayFilesGrid(files);
        if (gridEl) gridEl.style.display = 'grid';
        if (listEl) listEl.style.display = 'none';
    } else {
        displayFilesList(files);
        if (listEl) listEl.style.display = 'block';
        if (gridEl) gridEl.style.display = 'none';
    }
}

function displayFilesGrid(files) {
    const gridEl = document.getElementById('filesGrid');
    if (!gridEl) return;
    
    gridEl.innerHTML = files.map(file => `
        <div class="file-card" onclick="openFileById('${file.id}')">
            <div class="file-header">
                <div class="file-icon">📊</div>
                <button class="file-menu" onclick="event.stopPropagation(); showFileActions('${file.id}')" title="Dosya menüsü">⋮</button>
            </div>
            <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-details">
                <span class="file-size">${formatFileSize(file.fileSize)}</span>
                <span class="file-date">${formatDate(file.updatedAt)}</span>
            </div>
            <div class="file-meta">
                <div class="file-stats">
                    <span>${file.rowCount || 0} satır</span>
                    <span>${file.columnCount || 0} sütun</span>
                </div>
                <span class="file-version">v${file.version || 1}</span>
            </div>
        </div>
    `).join('');
}

function displayFilesList(files) {
    const tableBody = document.getElementById('filesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = files.map(file => `
        <tr onclick="openFileById('${file.id}')">
            <td>
                <div class="file-name-cell">
                    <div class="file-icon">📊</div>
                    <div>
                        <div class="file-name">${escapeHtml(file.name)}</div>
                        <small class="text-muted">${file.rowCount || 0} satır, ${file.columnCount || 0} sütun</small>
                    </div>
                </div>
            </td>
            <td>${formatFileSize(file.fileSize)}</td>
            <td>${formatDate(file.updatedAt)}</td>
            <td>${formatDate(file.createdAt)}</td>
            <td>
                <div class="file-actions">
                    <button class="action-btn primary" onclick="event.stopPropagation(); openFileById('${file.id}')" title="Aç">📊</button>
                    <button class="action-btn" onclick="event.stopPropagation(); showFileActions('${file.id}')" title="Düzenle">⋮</button>
                    <button class="action-btn danger" onclick="event.stopPropagation(); confirmDeleteFile('${file.id}')" title="Sil">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateFileStats(stats) {
    const filesCountEl = document.getElementById('filesCount');
    const storageUsedEl = document.getElementById('storageUsed');
    
    if (filesCountEl) {
        filesCountEl.textContent = stats.totalFiles || 0;
    }
    
    if (storageUsedEl) {
        storageUsedEl.textContent = formatFileSize(stats.totalSize || 0);
    }
}

function handleSearchInput(event) {
    clearTimeout(searchTimeout);
    const query = event.target.value.trim();
    
    if (query.length === 0) {
        displayFiles(currentFiles);
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            if (query.length >= 2) {
                const results = await searchUserFiles(query);
                displayFiles(results);
            } else {
                displayFiles(currentFiles);
            }
        } catch (error) {
            console.error('Arama hatası:', error);
            showError('Arama sırasında hata oluştu: ' + error.message);
        }
    }, 300);
}

function setViewMode(mode) {
    currentViewMode = mode;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-view="${mode}"]`)?.classList.add('active');
    
    displayFiles(currentFiles);
    localStorage.setItem('filesViewMode', mode);
}

function sortFiles(sortBy) {
    const [field, direction] = sortBy.split('-');
    
    const sortedFiles = [...currentFiles].sort((a, b) => {
        let aVal, bVal;
        
        switch (field) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'size':
                aVal = a.fileSize || 0;
                bVal = b.fileSize || 0;
                break;
            case 'updated':
                aVal = new Date(a.updatedAt);
                bVal = new Date(b.updatedAt);
                break;
            case 'created':
                aVal = new Date(a.createdAt);
                bVal = new Date(b.createdAt);
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    displayFiles(sortedFiles);
}

function showFileActions(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;
    
    selectedFileId = fileId;
    
    document.getElementById('actionModalTitle').textContent = 'Dosya İşlemleri';
    document.getElementById('actionFileName').textContent = file.name;
    document.getElementById('actionFileSize').textContent = formatFileSize(file.fileSize);
    document.getElementById('actionFileDate').textContent = formatDate(file.updatedAt);
    
    const modal = document.getElementById('fileActionsModal');
    if (modal) {
        modal.classList.add('show');
    }
}

async function openFileById(fileId) {
    try {
        showLoadingMessage('Dosya açılıyor...');
        
        const fileData = await loadUserFile(fileId);
        
        localStorage.setItem('currentFileId', fileId);
        localStorage.setItem('currentFileName', fileData.name);
        
        sessionStorage.setItem('loadFileData', JSON.stringify(fileData));
        
        window.location.href = './index.html?file=' + encodeURIComponent(fileId);
        
    } catch (error) {
        console.error('Dosya açılırken hata:', error);
        showError('Dosya açılırken hata oluştu: ' + error.message);
        hideLoadingMessage();
    }
}

async function downloadFile() {
    try {
        if (!selectedFileId) return;
        
        const fileData = await loadUserFile(selectedFileId);
        const fileName = fileData.name.endsWith('.json') ? fileData.name : fileData.name + '.json';
        
        const blob = new Blob([JSON.stringify(fileData.data, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        closeFileActionsModal();
        
    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        showError('Dosya indirilirken hata oluştu: ' + error.message);
    }
}

function renameFile() {
    const file = currentFiles.find(f => f.id === selectedFileId);
    if (!file) return;
    
    document.getElementById('newFileName').value = file.name;
    
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.classList.add('show');
    }
    
    closeFileActionsModal();
}

async function confirmRename() {
    try {
        const newName = document.getElementById('newFileName').value.trim();
        
        if (!newName) {
            showError('Dosya adı boş olamaz');
            return;
        }
        
        if (newName.length > 100) {
            showError('Dosya adı 100 karakterden uzun olamaz');
            return;
        }
        
        const file = currentFiles.find(f => f.id === selectedFileId);
        if (!file) return;
        
        const fileData = await loadUserFile(selectedFileId);
        await updateUserFile(selectedFileId, newName, fileData.data);
        
        closeRenameModal();
        await loadFiles();
        showSuccess('Dosya adı başarıyla değiştirildi');
        
    } catch (error) {
        console.error('Dosya adı değiştirme hatası:', error);
        showError('Dosya adı değiştirilirken hata oluştu: ' + error.message);
    }
}

async function confirmDeleteFile(fileId) {
    if (!fileId) fileId = selectedFileId;
    if (!fileId) return;
    
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;
    
    if (confirm(`"${file.name}" dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
        try {
            await deleteUserFile(fileId);
            await loadFiles();
            showSuccess('Dosya başarıyla silindi');
            
            if (selectedFileId === fileId) {
                closeFileActionsModal();
            }
            
        } catch (error) {
            console.error('Dosya silme hatası:', error);
            showError('Dosya silinirken hata oluştu: ' + error.message);
        }
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    const excelFiles = files.filter(file => 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
    );
    
    if (excelFiles.length === 0) {
        showError('Lütfen sadece Excel dosyaları (.xlsx, .xls) yükleyin');
        return;
    }
    
    if (excelFiles.length > 1) {
        showError('Tek seferde sadece bir dosya yükleyebilirsiniz');
        return;
    }
    
    processUploadedFile(excelFiles[0]);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processUploadedFile(file);
    }
}

async function processUploadedFile(file) {
    try {
        if (file.size > 1048576) {
            showError('Dosya boyutu 1 MB\'dan büyük olamaz');
            return;
        }
        
        showLoadingMessage('Dosya işleniyor...');
        
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        if (typeof ExcelJS === 'undefined') {
            await loadExcelJS();
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error('Excel dosyasında sayfa bulunamadı');
        }
        
        const tableData = convertWorksheetToTableData(worksheet);
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        await saveUserTable(fileName, tableData);
        
        closeUploadModal();
        await loadFiles();
        showSuccess('Dosya başarıyla yüklendi ve kaydedildi');
        hideLoadingMessage();
        
    } catch (error) {
        console.error('Dosya yükleme hatası:', error);
        showError('Dosya yüklenirken hata oluştu: ' + error.message);
        hideLoadingMessage();
    }
}

function convertWorksheetToTableData(worksheet) {
    const headers = [];
    const rows = [];
    
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        headers.push({
            text: cell.value?.toString() || `Sütun ${colNumber}`,
            backgroundColor: cell.fill?.fgColor ? argbToHex(cell.fill.fgColor.argb) : '#2c3e50',
            color: cell.font?.color ? argbToHex(cell.font.color.argb) : '#ffffff'
        });
    });
    
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        if (row.hasValues) {
            const rowData = {
                cells: [],
                styles: {
                    backgroundColor: '',
                    color: ''
                }
            };
            
            row.eachCell((cell, colNumber) => {
                rowData.cells.push({
                    value: cell.value?.toString() || '',
                    readonly: colNumber === 1,
                    backgroundColor: cell.fill?.fgColor ? argbToHex(cell.fill.fgColor.argb) : '',
                    color: cell.font?.color ? argbToHex(cell.font.color.argb) : ''
                });
            });
            
            if (rowData.cells.length > 0) {
                rows.push(rowData);
            }
        }
    }
    
    return {
        headers,
        rows,
        metadata: {
            rowCount: rows.length,
            columnCount: headers.length,
            createdAt: new Date().toISOString()
        }
    };
}

function argbToHex(argb) {
    if (!argb) return '#ffffff';
    if (argb.length === 8) {
        return '#' + argb.substring(2).toLowerCase();
    }
    return argb;
}

async function loadExcelJS() {
    return new Promise((resolve, reject) => {
        if (typeof ExcelJS !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('ExcelJS yüklenemedi'));
        document.head.appendChild(script);
    });
}

function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

function closeFileActionsModal() {
    const modal = document.getElementById('fileActionsModal');
    if (modal) {
        modal.classList.remove('show');
    }
    selectedFileId = null;
}

function closeRenameModal() {
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    const input = document.getElementById('newFileName');
    if (input) {
        input.value = '';
    }
}

function closeAllModals() {
    closeUploadModal();
    closeFileActionsModal();
    closeRenameModal();
}

function selectFile() {
    document.getElementById('fileInput')?.click();
}

function refreshFiles() {
    loadFiles();
}

function createNewFile() {
    window.location.href = './index.html';
}

function goToMainPage() {
    window.location.href = './index.html';
}

async function openProfile() {
    showError('Profil sayfası yakında gelecek!');
}

async function logoutUser() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.logoutUser();
    }
}

async function toggleUserDropdown() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.toggleUserDropdown();
    }
}

async function checkEmailVerificationStatus() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.checkEmailVerification();
    }
}

async function resendVerificationEmail() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.resendEmailVerification();
    }
}

function showError(message) {
    const toast = createToast(message, 'error');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showSuccess(message) {
    const toast = createToast(message, 'success');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoadingMessage(message) {
    const toast = createToast(message, 'loading');
    toast.id = 'loadingToast';
    document.body.appendChild(toast);
}

function hideLoadingMessage() {
    const toast = document.getElementById('loadingToast');
    if (toast) {
        toast.remove();
    }
}

function createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? 'linear-gradient(45deg, #e74c3c, #c0392b)' : 
                     type === 'success' ? 'linear-gradient(45deg, #27ae60, #229954)' : 
                     'linear-gradient(45deg, #3498db, #2980b9)'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        word-break: break-word;
    `;
    
    if (type === 'loading') {
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                ${message}
            </div>
        `;
    } else {
        toast.textContent = message;
    }
    
    return toast;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date) {
    if (!date) return 'Bilinmiyor';
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays - 1} gün önce`;
    
    return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

window.setViewMode = setViewMode;
window.sortFiles = sortFiles;
window.showFileActions = showFileActions;
window.openFileById = openFileById;
window.openFile = () => openFileById(selectedFileId);
window.downloadFile = downloadFile;
window.renameFile = renameFile;
window.deleteFile = () => confirmDeleteFile(selectedFileId);
window.confirmRename = confirmRename;
window.confirmDeleteFile = confirmDeleteFile;
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.closeFileActionsModal = closeFileActionsModal;
window.closeRenameModal = closeRenameModal;
window.selectFile = selectFile;
window.refreshFiles = refreshFiles;
window.createNewFile = createNewFile;
window.goToMainPage = goToMainPage;
window.openProfile = openProfile;
window.logoutUser = logoutUser;
window.toggleUserDropdown = toggleUserDropdown;
window.checkEmailVerificationStatus = checkEmailVerificationStatus;
window.resendVerificationEmail = resendVerificationEmail;
window.searchFiles = () => handleSearchInput({ target: document.getElementById('searchInput') });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFilesPage);
} else {
    initializeFilesPage();
}