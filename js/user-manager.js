// Kullanıcı Dosya Yönetimi

import { auth, db } from './firebase-config.js';
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
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function saveUserTable(tableName, tableData) {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }

    const userId = auth.currentUser.uid;
    const fileId = generateFileId();
    
    const fileData = {
        id: fileId,
        name: tableName,
        userId: userId,
        data: tableData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
    };

    try {
        await setDoc(doc(db, 'userFiles', fileId), fileData);
        console.log('✅ Tablo başarıyla kaydedildi:', tableName);
        return fileId;
    } catch (error) {
        console.error('❌ Tablo kaydedilirken hata:', error);
        throw error;
    }
}

export async function getUserFiles() {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }

    const userId = auth.currentUser.uid;
    
    try {
        const q = query(
            collection(db, 'userFiles'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const files = [];
        
        querySnapshot.forEach((doc) => {
            files.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('📁 Kullanıcı dosyaları yüklendi:', files.length);
        return files;
    } catch (error) {
        console.error('❌ Dosyalar yüklenirken hata:', error);
        throw error;
    }
}

export async function loadUserFile(fileId) {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }

    try {
        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const fileData = docSnap.data();
            
            if (fileData.userId !== auth.currentUser.uid) {
                throw new Error('Bu dosyaya erişim yetkiniz yok');
            }
            
            console.log('📂 Dosya yüklendi:', fileData.name);
            return fileData;
        } else {
            throw new Error('Dosya bulunamadı');
        }
    } catch (error) {
        console.error('❌ Dosya yüklenirken hata:', error);
        throw error;
    }
}

export async function updateUserFile(fileId, tableName, tableData) {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }

    try {
        const docRef = doc(db, 'userFiles', fileId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Dosya bulunamadı');
        }
        
        const currentData = docSnap.data();
        
        if (currentData.userId !== auth.currentUser.uid) {
            throw new Error('Bu dosyayı güncelleme yetkiniz yok');
        }
        
        const updateData = {
            name: tableName,
            data: tableData,
            updatedAt: new Date().toISOString(),
            version: (currentData.version || 1) + 1
        };
        
        await updateDoc(docRef, updateData);
        console.log('✅ Dosya başarıyla güncellendi:', tableName);
        
    } catch (error) {
        console.error('❌ Dosya güncellenirken hata:', error);
        throw error;
    }
}

export async function deleteUserFile(fileId) {
    if (!auth.currentUser) {
        throw new Error('Kullanıcı giriş yapmamış');
    }

    try {
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
        console.log('🗑️ Dosya başarıyla silindi:', fileData.name);
        
    } catch (error) {
        console.error('❌ Dosya silinirken hata:', error);
        throw error;
    }
}

export function serializeTableData() {
    const table = document.getElementById('dynamicTable');
    if (!table) return null;

    const headers = [];
    const headerStyles = [];
    table.querySelectorAll('thead th').forEach(th => {
        if (th.classList.contains('row-checkbox-cell')) return;
        
        headers.push({
            text: th.textContent.trim(),
            backgroundColor: th.style.backgroundColor || '',
            color: th.style.color || '',
            onclick: th.onclick ? th.onclick.toString() : ''
        });
    });

    const rows = [];
    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = {
            cells: [],
            styles: {
                backgroundColor: tr.style.backgroundColor || '',
                color: tr.style.color || ''
            }
        };

        tr.querySelectorAll('td').forEach(td => {
            if (td.classList.contains('row-checkbox-cell')) return;
            
            const input = td.querySelector('.editable');
            const cellData = {
                value: input ? input.value : td.textContent.trim(),
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

    return {
        headers,
        rows,
        metadata: {
            createdAt: new Date().toISOString(),
            rowCount: rows.length,
            columnCount: headers.length
        }
    };
}

export function deserializeTableData(tableData) {
    if (!tableData || !tableData.headers || !tableData.rows) {
        console.error('❌ Geçersiz tablo verisi');
        return;
    }

    const table = document.getElementById('dynamicTable');
    if (!table) {
        console.error('❌ Tablo elementi bulunamadı');
        return;
    }

    if (window.isMultiDeleteModeActive) {
        window.toggleMultiDeleteMode();
    }

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = thead.insertRow();
    tableData.headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header.text;
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

    if (window.updateStats) window.updateStats();
    if (window.updateColumnClickEvents) window.updateColumnClickEvents();
    if (window.updateRowNumbers) window.updateRowNumbers();
    if (window.clearSelection) window.clearSelection();

    console.log('✅ Tablo verisi başarıyla yüklendi');
}

let autoSaveTimeout;
export function setupAutoSave(interval = 30000) {
    if (!auth.currentUser) return;

    function performAutoSave() {
        const tableData = serializeTableData();
        if (tableData && tableData.rows.length > 0) {
            const autoSaveName = `Otomatik Kayıt - ${new Date().toLocaleString('tr-TR')}`;
            saveUserTable(autoSaveName, tableData).catch(error => {
                console.error('Otomatik kayıt hatası:', error);
            });
        }
    }

    if (autoSaveTimeout) {
        clearInterval(autoSaveTimeout);
    }

    autoSaveTimeout = setInterval(performAutoSave, interval);
    console.log('Otomatik kayıt başlatıldı (30 saniye aralıklarla)');
}

export function stopAutoSave() {
    if (autoSaveTimeout) {
        clearInterval(autoSaveTimeout);
        autoSaveTimeout = null;
        console.log('Otomatik kayıt durduruldu');
    }
}

function generateFileId() {
    return 'file_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export function calculateFileSize(tableData) {
    const jsonString = JSON.stringify(tableData);
    const sizeInBytes = new Blob([jsonString]).size;
    return Math.round(sizeInBytes / 1024 * 100) / 100;
}

export function validateFileName(fileName) {
    if (!fileName || fileName.trim().length === 0) {
        return { valid: false, error: 'Dosya adı boş olamaz.' };
    }
    
    if (fileName.length > 100) {
        return { valid: false, error: 'Dosya adı çok uzun (max 100 karakter).' };
    }
    
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(fileName)) {
        return { valid: false, error: 'Dosya adında geçersiz karakterler var.' };
    }
    
    return { valid: true };
}