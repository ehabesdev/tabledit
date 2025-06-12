import { auth, db, securityConfig } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    deleteDoc, 
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const rateLimitTracker = new Map();
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(action, maxAttempts = 10) {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }
    
    const userId = auth.currentUser.uid;
    const now = Date.now();
    const key = `${userId}_${action}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;
    
    if (!rateLimitTracker.has(key)) {
        rateLimitTracker.set(key, 0);
    }
    
    const attempts = rateLimitTracker.get(key);
    const limit = securityConfig.RATE_LIMIT[action.toUpperCase()] || maxAttempts;
    
    if (attempts >= limit) {
        throw new Error(`Çok fazla ${action} denemesi. Lütfen 1 dakika bekleyin.`);
    }
    
    rateLimitTracker.set(key, attempts + 1);
    
    setTimeout(() => {
        rateLimitTracker.delete(key);
    }, RATE_LIMIT_WINDOW);
}

function validateFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        return { valid: false, error: 'Dosya adı gereklidir.' };
    }
    
    const trimmedName = fileName.trim();
    
    if (trimmedName.length === 0) {
        return { valid: false, error: 'Dosya adı boş olamaz.' };
    }
    
    if (trimmedName.length > 100) {
        return { valid: false, error: 'Dosya adı en fazla 100 karakter olabilir.' };
    }
    
    if (!securityConfig.ALLOWED_FILENAME_REGEX.test(trimmedName)) {
        return { valid: false, error: 'Dosya adında geçersiz karakterler var. Sadece harf, rakam, boşluk, tire, nokta ve parantez kullanılabilir.' };
    }
    
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(trimmedName.toUpperCase())) {
        return { valid: false, error: 'Bu dosya adı sistem tarafından rezerve edilmiştir.' };
    }
    
    return { valid: true };
}

function calculateFileSize(tableData) {
    try {
        const jsonString = JSON.stringify(tableData);
        const sizeInBytes = new Blob([jsonString]).size;
        const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;
        
        if (sizeInBytes > securityConfig.MAX_FILE_SIZE) {
            throw new Error(`Dosya boyutu çok büyük. Maksimum ${Math.round(securityConfig.MAX_FILE_SIZE / 1024)} KB olabilir.`);
        }
        
        return sizeInKB;
    } catch (error) {
        console.error('❌ Dosya boyutu hesaplama hatası:', error);
        throw new Error('Dosya boyutu hesaplanamadı.');
    }
}

function generateFileId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const additionalRandom = Math.random().toString(36).substring(2, 8);
    
    return `file_${randomPart}_${timestamp}_${additionalRandom}`;
}

function sanitizeTableData(tableData) {
    if (!tableData || typeof tableData !== 'object') {
        throw new Error('Geçersiz tablo verisi');
    }
    
    const sanitized = {
        headers: [],
        rows: [],
        metadata: {
            createdAt: new Date().toISOString(),
            rowCount: 0,
            columnCount: 0
        }
    };
    
    if (Array.isArray(tableData.headers)) {
        sanitized.headers = tableData.headers.slice(0, 50).map(header => {
            if (typeof header === 'object' && header.text) {
                return {
                    text: String(header.text).substring(0, 100),
                    backgroundColor: String(header.backgroundColor || '').substring(0, 20),
                    color: String(header.color || '').substring(0, 20)
                };
            }
            return { text: String(header).substring(0, 100) };
        });
    }
    
    if (Array.isArray(tableData.rows)) {
        sanitized.rows = tableData.rows.slice(0, 1000).map(row => {
            if (typeof row === 'object' && Array.isArray(row.cells)) {
                return {
                    cells: row.cells.slice(0, 50).map(cell => ({
                        value: String(cell.value || '').substring(0, 1000),
                        readonly: Boolean(cell.readonly),
                        backgroundColor: String(cell.backgroundColor || '').substring(0, 20),
                        color: String(cell.color || '').substring(0, 20)
                    })),
                    styles: {
                        backgroundColor: String(row.styles?.backgroundColor || '').substring(0, 20),
                        color: String(row.styles?.color || '').substring(0, 20)
                    }
                };
            }
            return { cells: [], styles: {} };
        });
    }
    
    sanitized.metadata.rowCount = sanitized.rows.length;
    sanitized.metadata.columnCount = sanitized.headers.length;
    
    return sanitized;
}

export async function saveUserTable(tableName, tableData) {
    try {
        console.log('💾 Kullanıcı tablosu kaydediliyor:', tableName);
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        checkRateLimit('SAVE_FILE');
        
        const nameValidation = validateFileName(tableName);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }
        
        const sanitizedData = sanitizeTableData(tableData);
        const fileSize = calculateFileSize(sanitizedData);
        
        const userFilesQuery = query(
            collection(db, 'userFiles'),
            where('userId', '==', auth.currentUser.uid)
        );
        const userFiles = await getDocs(userFilesQuery);
        
        if (userFiles.size >= securityConfig.MAX_FILES_PER_USER) {
            throw new Error(`Maksimum ${securityConfig.MAX_FILES_PER_USER} dosya kaydedebilirsiniz.`);
        }
        
        const fileId = generateFileId();
        const userId = auth.currentUser.uid;
        
        const fileData = {
            id: fileId,
            name: tableName.trim(),
            userId: userId,
            data: sanitizedData,
            fileSize: fileSize,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1,
            isActive: true,
            tags: [],
            description: '',
            lastAccessedAt: serverTimestamp(),
            metadata: {
                userAgent: navigator.userAgent.substring(0, 500),
                ip: null,
                source: 'tabledit-web'
            }
        };

        await setDoc(doc(db, 'userFiles', fileId), fileData);
        
        console.log('✅ Tablo başarıyla kaydedildi:', tableName, `(${fileSize} KB)`);
        return fileId;
        
    } catch (error) {
        console.error('❌ Tablo kaydetme hatası:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosya kaydetme izni yok. Lütfen tekrar giriş yapın.');
        } else if (error.code === 'quota-exceeded') {
            throw new Error('Depolama kotanız dolmuş. Lütfen bazı dosyaları silin.');
        } else if (error.code === 'unavailable') {
            throw new Error('Veritabanı geçici olarak kullanılamıyor. Lütfen tekrar deneyin.');
        }
        
        throw error;
    }
}

export async function getUserFiles() {
    try {
        console.log('📁 Kullanıcı dosyaları yükleniyor...');
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        const userId = auth.currentUser.uid;
        
        const q = query(
            collection(db, 'userFiles'),
            where('userId', '==', userId),
            where('isActive', '==', true),
            orderBy('updatedAt', 'desc'),
            limit(100)
        );
        
        const querySnapshot = await getDocs(q);
        const files = [];
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            files.push({
                id: docSnapshot.id,
                name: data.name,
                fileSize: data.fileSize || 0,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
                version: data.version || 1,
                rowCount: data.data?.metadata?.rowCount || 0,
                columnCount: data.data?.metadata?.columnCount || 0,
                description: data.description || '',
                tags: data.tags || []
            });
        });
        
        console.log('✅ Kullanıcı dosyaları yüklendi:', files.length, 'dosya');
        return files;
        
    } catch (error) {
        console.error('❌ Dosyalar yüklenirken hata:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosyalara erişim izni yok. Lütfen tekrar giriş yapın.');
        } else if (error.code === 'unavailable') {
            throw new Error('Veritabanı geçici olarak kullanılamıyor. Lütfen tekrar deneyin.');
        }
        
        throw error;
    }
}

export async function loadUserFile(fileId) {
    try {
        console.log('📂 Dosya yükleniyor:', fileId);
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        checkRateLimit('LOAD_FILE');

        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Dosya bulunamadı');
        }
        
        const fileData = docSnap.data();
        
        if (fileData.userId !== auth.currentUser.uid) {
            throw new Error('Bu dosyaya erişim yetkiniz yok');
        }
        
        if (!fileData.isActive) {
            throw new Error('Bu dosya silinmiş veya devre dışı');
        }
        
        await updateDoc(docRef, {
            lastAccessedAt: serverTimestamp()
        }).catch(updateError => {
            console.warn('⚠️ Son erişim zamanı güncellenemedi:', updateError);
        });
        
        console.log('✅ Dosya yüklendi:', fileData.name);
        return {
            id: docSnap.id,
            name: fileData.name,
            data: fileData.data,
            createdAt: fileData.createdAt?.toDate?.() || new Date(fileData.createdAt),
            updatedAt: fileData.updatedAt?.toDate?.() || new Date(fileData.updatedAt),
            version: fileData.version || 1,
            fileSize: fileData.fileSize || 0,
            description: fileData.description || '',
            tags: fileData.tags || []
        };
        
    } catch (error) {
        console.error('❌ Dosya yüklenirken hata:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosyaya erişim izni yok. Lütfen tekrar giriş yapın.');
        }
        
        throw error;
    }
}

export async function updateUserFile(fileId, tableName, tableData) {
    try {
        console.log('🔄 Dosya güncelleniyor:', fileId);
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        checkRateLimit('SAVE_FILE');
        
        const nameValidation = validateFileName(tableName);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }

        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Dosya bulunamadı');
        }
        
        const currentData = docSnap.data();
        
        if (currentData.userId !== auth.currentUser.uid) {
            throw new Error('Bu dosyayı güncelleme yetkiniz yok');
        }
        
        if (!currentData.isActive) {
            throw new Error('Bu dosya silinmiş veya devre dışı');
        }
        
        const sanitizedData = sanitizeTableData(tableData);
        const fileSize = calculateFileSize(sanitizedData);
        
        const updateData = {
            name: tableName.trim(),
            data: sanitizedData,
            fileSize: fileSize,
            updatedAt: serverTimestamp(),
            version: (currentData.version || 1) + 1,
            lastAccessedAt: serverTimestamp()
        };
        
        await updateDoc(docRef, updateData);
        console.log('✅ Dosya başarıyla güncellendi:', tableName, `(${fileSize} KB)`);
        
    } catch (error) {
        console.error('❌ Dosya güncellenirken hata:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosya güncelleme izni yok. Lütfen tekrar giriş yapın.');
        }
        
        throw error;
    }
}

export async function deleteUserFile(fileId) {
    try {
        console.log('🗑️ Dosya siliniyor:', fileId);
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        checkRateLimit('DELETE_FILE');

        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Dosya bulunamadı');
        }
        
        const fileData = docSnap.data();
        
        if (fileData.userId !== auth.currentUser.uid) {
            throw new Error('Bu dosyayı silme yetkiniz yok');
        }
        
        await updateDoc(docRef, {
            isActive: false,
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        console.log('✅ Dosya başarıyla silindi (soft delete):', fileData.name);
        
    } catch (error) {
        console.error('❌ Dosya silinirken hata:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosya silme izni yok. Lütfen tekrar giriş yapın.');
        }
        
        throw error;
    }
}

export async function permanentDeleteUserFile(fileId) {
    try {
        console.log('💥 Dosya kalıcı olarak siliniyor:', fileId);
        
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        checkRateLimit('DELETE_FILE');

        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Dosya bulunamadı');
        }
        
        const fileData = docSnap.data();
        
        if (fileData.userId !== auth.currentUser.uid) {
            throw new Error('Bu dosyayı silme yetkiniz yok');
        }
        
        await deleteDoc(docRef);
        console.log('✅ Dosya kalıcı olarak silindi:', fileData.name);
        
    } catch (error) {
        console.error('❌ Dosya kalıcı silme hatası:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Dosya silme izni yok. Lütfen tekrar giriş yapın.');
        }
        
        throw error;
    }
}

export function serializeTableData() {
    try {
        console.log('📊 Tablo verisi serialize ediliyor...');
        
        const table = document.getElementById('dynamicTable');
        if (!table) {
            throw new Error('Tablo bulunamadı');
        }

        const headers = [];
        const headerRow = table.querySelector('thead tr');
        
        if (headerRow) {
            Array.from(headerRow.cells).forEach(th => {
                if (th.classList.contains('row-checkbox-cell')) return;
                
                headers.push({
                    text: th.textContent.trim() || '',
                    backgroundColor: th.style.backgroundColor || '',
                    color: th.style.color || ''
                });
            });
        }

        const rows = [];
        const tbody = table.querySelector('tbody');
        
        if (tbody) {
            Array.from(tbody.rows).forEach(tr => {
                const rowData = {
                    cells: [],
                    styles: {
                        backgroundColor: tr.style.backgroundColor || '',
                        color: tr.style.color || ''
                    }
                };

                Array.from(tr.cells).forEach(td => {
                    if (td.classList.contains('row-checkbox-cell')) return;
                    
                    const input = td.querySelector('.editable');
                    const cellData = {
                        value: input ? input.value.trim() : td.textContent.trim(),
                        readonly: input ? input.readOnly : false,
                        backgroundColor: td.style.backgroundColor || '',
                        color: td.style.color || ''
                    };
                    
                    rowData.cells.push(cellData);
                });

                if (rowData.cells.length > 0) {
                    rows.push(rowData);
                }
            });
        }

        const tableData = {
            headers,
            rows,
            metadata: {
                createdAt: new Date().toISOString(),
                rowCount: rows.length,
                columnCount: headers.length,
                lastModified: new Date().toISOString(),
                version: '1.0',
                source: 'tabledit-web'
            }
        };
        
        console.log('✅ Tablo verisi serialize edildi:', tableData.metadata);
        return tableData;
        
    } catch (error) {
        console.error('❌ Tablo serialize hatası:', error);
        throw error;
    }
}

export function deserializeTableData(tableData) {
    try {
        console.log('📊 Tablo verisi deserialize ediliyor...');
        
        if (!tableData || !tableData.headers || !tableData.rows) {
            throw new Error('Geçersiz tablo verisi');
        }

        const table = document.getElementById('dynamicTable');
        if (!table) {
            throw new Error('Tablo elementi bulunamadı');
        }

        if (window.isMultiDeleteModeActive) {
            window.toggleMultiDeleteMode();
        }

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        if (thead) thead.innerHTML = '';
        if (tbody) tbody.innerHTML = '';

        if (thead && tableData.headers.length > 0) {
            const headerRow = thead.insertRow();
            tableData.headers.forEach((header, index) => {
                const th = document.createElement('th');
                th.textContent = header.text || `Sütun ${index + 1}`;
                th.style.backgroundColor = header.backgroundColor || '#2c3e50';
                th.style.color = header.color || 'white';
                th.style.cursor = 'pointer';
                
                th.onclick = function(event) { 
                    if (window.selectColumn) window.selectColumn(this, event, index); 
                };
                th.ondblclick = function() { 
                    if (window.makeHeaderEditable) window.makeHeaderEditable(this); 
                };
                
                headerRow.appendChild(th);
            });
        }

        if (tbody && tableData.rows.length > 0) {
            tableData.rows.forEach((rowData, rowIndex) => {
                const tr = tbody.insertRow();
                tr.onclick = function() { 
                    if (window.selectRow) window.selectRow(this); 
                };
                tr.style.cursor = 'pointer';
                tr.style.backgroundColor = rowData.styles?.backgroundColor || '';
                tr.style.color = rowData.styles?.color || '';

                rowData.cells.forEach((cellData, cellIndex) => {
                    const td = tr.insertCell();
                    td.onclick = function(event) { 
                        if (window.selectCell) window.selectCell(this, event); 
                    };
                    td.style.cursor = 'pointer';
                    td.style.backgroundColor = cellData.backgroundColor || '';
                    td.style.color = cellData.color || '';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'editable';
                    input.value = cellData.value || '';
                    input.readOnly = cellData.readonly || false;
                    
                    if (cellData.color) {
                        input.style.color = cellData.color;
                    }

                    td.appendChild(input);
                });
            });
        }

        if (window.updateStats) window.updateStats();
        if (window.updateColumnClickEvents) window.updateColumnClickEvents();
        if (window.updateRowNumbers) window.updateRowNumbers();
        if (window.clearSelection) window.clearSelection();

        console.log('✅ Tablo verisi başarıyla yüklendi');
        
    } catch (error) {
        console.error('❌ Tablo deserialize hatası:', error);
        throw error;
    }
}

let autoSaveInterval;
let autoSaveEnabled = false;

export function setupAutoSave(interval = 30000) {
    try {
        if (!auth.currentUser) {
            console.warn('⚠️ Kullanıcı giriş yapmamış, otomatik kayıt başlatılamıyor');
            return false;
        }
        
        if (autoSaveEnabled) {
            console.log('⚠️ Otomatik kayıt zaten aktif');
            return true;
        }

        function performAutoSave() {
            try {
                const tableData = serializeTableData();
                if (tableData && tableData.rows.length > 0) {
                    const autoSaveName = `Otomatik Kayıt - ${new Date().toLocaleString('tr-TR')}`;
                    saveUserTable(autoSaveName, tableData).catch(error => {
                        console.error('❌ Otomatik kayıt hatası:', error);
                        if (error.message.includes('Çok fazla')) {
                            console.log('⚠️ Rate limit nedeniyle otomatik kayıt atlandı');
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Otomatik kayıt serialize hatası:', error);
            }
        }

        autoSaveInterval = setInterval(performAutoSave, interval);
        autoSaveEnabled = true;
        
        console.log('✅ Otomatik kayıt başlatıldı (30 saniye aralıklarla)');
        return true;
        
    } catch (error) {
        console.error('❌ Otomatik kayıt başlatma hatası:', error);
        return false;
    }
}

export function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        autoSaveEnabled = false;
        console.log('🛑 Otomatik kayıt durduruldu');
        return true;
    }
    return false;
}

export function isAutoSaveEnabled() {
    return autoSaveEnabled;
}

export async function getUserFileStats() {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        const files = await getUserFiles();
        
        const stats = {
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + (file.fileSize || 0), 0),
            averageSize: 0,
            oldestFile: null,
            newestFile: null,
            totalRows: files.reduce((sum, file) => sum + (file.rowCount || 0), 0),
            totalColumns: files.reduce((sum, file) => sum + (file.columnCount || 0), 0)
        };
        
        if (stats.totalFiles > 0) {
            stats.averageSize = Math.round(stats.totalSize / stats.totalFiles * 100) / 100;
            
            const sortedByDate = [...files].sort((a, b) => a.createdAt - b.createdAt);
            stats.oldestFile = sortedByDate[0];
            stats.newestFile = sortedByDate[sortedByDate.length - 1];
        }
        
        return stats;
        
    } catch (error) {
        console.error('❌ Kullanıcı dosya istatistikleri hatası:', error);
        throw error;
    }
}

export async function searchUserFiles(searchTerm) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        if (!searchTerm || searchTerm.trim().length < 2) {
            throw new Error('Arama terimi en az 2 karakter olmalıdır');
        }
        
        const allFiles = await getUserFiles();
        const searchTermLower = searchTerm.toLowerCase().trim();
        
        const matchedFiles = allFiles.filter(file => {
            return file.name.toLowerCase().includes(searchTermLower) ||
                   (file.description && file.description.toLowerCase().includes(searchTermLower)) ||
                   (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTermLower)));
        });
        
        console.log(`🔍 Arama sonucu: ${matchedFiles.length} dosya bulundu`);
        return matchedFiles;
        
    } catch (error) {
        console.error('❌ Dosya arama hatası:', error);
        throw error;
    }
}

export async function quickSaveCurrentTable(fileName = null) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const tableData = serializeTableData();
        const autoFileName = fileName || `Hızlı_Kayıt_${new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')}`;
        
        const fileId = await saveUserTable(autoFileName, tableData);
        console.log('✅ Hızlı kayıt tamamlandı:', autoFileName);
        
        return { fileId, fileName: autoFileName };
        
    } catch (error) {
        console.error('❌ Hızlı kayıt hatası:', error);
        throw error;
    }
}

export async function getRecentFiles(limit = 10) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        const q = query(
            collection(db, 'userFiles'),
            where('userId', '==', auth.currentUser.uid),
            where('isActive', '==', true),
            orderBy('lastAccessedAt', 'desc'),
            limit(limit)
        );
        
        const querySnapshot = await getDocs(q);
        const files = [];
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            files.push({
                id: docSnapshot.id,
                name: data.name,
                updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
                lastAccessedAt: data.lastAccessedAt?.toDate?.() || new Date(data.lastAccessedAt)
            });
        });
        
        return files;
        
    } catch (error) {
        console.error('❌ Son dosyalar yüklenirken hata:', error);
        throw error;
    }
}

export async function duplicateUserFile(fileId, newName = null) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const originalFile = await loadUserFile(fileId);
        const duplicateName = newName || `${originalFile.name}_Kopya`;
        
        const newFileId = await saveUserTable(duplicateName, originalFile.data);
        console.log('✅ Dosya başarıyla kopyalandı:', duplicateName);
        
        return newFileId;
        
    } catch (error) {
        console.error('❌ Dosya kopyalama hatası:', error);
        throw error;
    }
}

export async function exportUserFileAsJSON(fileId) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const fileData = await loadUserFile(fileId);
        const exportData = {
            name: fileData.name,
            data: fileData.data,
            exportedAt: new Date().toISOString(),
            version: fileData.version,
            exportFormat: 'tabledit-json-v1'
        };
        
        return JSON.stringify(exportData, null, 2);
        
    } catch (error) {
        console.error('❌ JSON export hatası:', error);
        throw error;
    }
}

export async function importUserFileFromJSON(jsonString, fileName = null) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const importData = JSON.parse(jsonString);
        
        if (!importData.data || !importData.exportFormat?.includes('tabledit')) {
            throw new Error('Geçersiz Tabledit dosya formatı');
        }
        
        const importFileName = fileName || importData.name || 'İçe_Aktarılan_Dosya';
        const fileId = await saveUserTable(importFileName, importData.data);
        
        console.log('✅ JSON dosyası başarıyla içe aktarıldı:', importFileName);
        return fileId;
        
    } catch (error) {
        console.error('❌ JSON import hatası:', error);
        throw error;
    }
}

export function validateTableData(tableData) {
    const errors = [];
    
    if (!tableData || typeof tableData !== 'object') {
        errors.push('Tablo verisi geçersiz');
        return { isValid: false, errors };
    }
    
    if (!Array.isArray(tableData.headers)) {
        errors.push('Başlık verisi eksik veya geçersiz');
    }
    
    if (!Array.isArray(tableData.rows)) {
        errors.push('Satır verisi eksik veya geçersiz');
    }
    
    if (tableData.headers && tableData.headers.length > 50) {
        errors.push('Maksimum 50 sütun destekleniyor');
    }
    
    if (tableData.rows && tableData.rows.length > 1000) {
        errors.push('Maksimum 1000 satır destekleniyor');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings: []
    };
}

export async function getUserStorageInfo() {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const stats = await getUserFileStats();
        const maxStorage = securityConfig.MAX_FILE_SIZE * securityConfig.MAX_FILES_PER_USER;
        
        return {
            used: stats.totalSize || 0,
            max: maxStorage,
            percentage: Math.round(((stats.totalSize || 0) / maxStorage) * 100),
            filesCount: stats.totalFiles || 0,
            maxFiles: securityConfig.MAX_FILES_PER_USER,
            filesPercentage: Math.round(((stats.totalFiles || 0) / securityConfig.MAX_FILES_PER_USER) * 100)
        };
        
    } catch (error) {
        console.error('❌ Depolama bilgisi hatası:', error);
        throw error;
    }
}

export async function cleanupOldAutoSaves(keepCount = 5) {
    try {
        if (!auth.currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const autoSaveQuery = query(
            collection(db, 'userFiles'),
            where('userId', '==', auth.currentUser.uid),
            where('isActive', '==', true),
            where('name', '>=', 'Otomatik'),
            where('name', '<=', 'Otomatik\uf8ff'),
            orderBy('name'),
            orderBy('createdAt', 'desc')
        );
        
        const autoSaves = await getDocs(autoSaveQuery);
        const autoSaveFiles = [];
        
        autoSaves.forEach(doc => {
            const data = doc.data();
            if (data.name.startsWith('Otomatik') || data.name.includes('Auto_Save')) {
                autoSaveFiles.push({
                    id: doc.id,
                    name: data.name,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
                });
            }
        });
        
        if (autoSaveFiles.length > keepCount) {
            const filesToDelete = autoSaveFiles
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(keepCount);
            
            for (const file of filesToDelete) {
                await deleteUserFile(file.id);
            }
            
            console.log(`✅ ${filesToDelete.length} eski otomatik kayıt temizlendi`);
            return filesToDelete.length;
        }
        
        return 0;
        
    } catch (error) {
        console.error('❌ Otomatik kayıt temizleme hatası:', error);
        throw error;
    }
}

if (typeof window !== 'undefined') {
    window.userManager = {
        saveUserTable,
        getUserFiles,
        loadUserFile,
        updateUserFile,
        deleteUserFile,
        permanentDeleteUserFile,
        serializeTableData,
        deserializeTableData,
        setupAutoSave,
        stopAutoSave,
        isAutoSaveEnabled,
        getUserFileStats,
        searchUserFiles,
        calculateFileSize,
        validateFileName,
        quickSaveCurrentTable,
        getRecentFiles,
        duplicateUserFile,
        exportUserFileAsJSON,
        importUserFileFromJSON,
        validateTableData,
        getUserStorageInfo,
        cleanupOldAutoSaves
    };
    
    window.addEventListener('beforeunload', () => {
        stopAutoSave();
    });
}