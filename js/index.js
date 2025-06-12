let selectedCell = null;
let selectedRow = null;
let selectedColumn = null;
let colorTargetType = '';
let isMultiDeleteModeActive = false;
let authModuleLoaded = false;
let currentFileId = null;
let currentFileName = null;
let autoSaveInterval = null;
let autoSaveEnabled = false;
let hasUnsavedChanges = false;
let lastSaveTime = null;
const CHECKBOX_COLUMN_CLASS = 'row-checkbox-cell';
const AUTO_SAVE_INTERVAL = 30000;

const turkeyLocationData = {
    'İstanbul': ['Kadıköy', 'Beşiktaş', 'Şişli', 'Bakırköy', 'Üsküdar', 'Fatih', 'Beyoğlu', 'Kartal', 'Maltepe', 'Pendik', 'Ümraniye', 'Zeytinburnu'],
    'Ankara': ['Çankaya', 'Keçiören', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Yenimahalle', 'Gölbaşı', 'Pursaklar'],
    'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Gaziemir', 'Balçova', 'Narlıdere', 'Bayraklı', 'Çiğli'],
    'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Körfez', 'Gölcük', 'Başiskele', 'Çayırova', 'Derince'],
    'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Aksu', 'Döşemealtı', 'Serik', 'Manavgat', 'Alanya'],
    'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Gemlik', 'İnegöl', 'Mudanya', 'Orhangazi', 'Mustafakemalpaşa']
};

async function loadAuthModule() {
    if (authModuleLoaded) return true;
    
    try {
        const authModule = await import('./auth.js');
        window.authModule = authModule;
        authModuleLoaded = true;
        console.log('✅ Auth modülü yüklendi');
        return true;
    } catch (error) {
        console.error('❌ Auth modülü yüklenemedi:', error);
        return false;
    }
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    const allMenus = document.querySelectorAll('.dropdown-menu');
    const allButtons = document.querySelectorAll('.nav-button');

    allMenus.forEach(m => {
        if (m.id !== menuId) {
            m.classList.remove('show');
        }
    });

    if (menu) {
        menu.classList.toggle('show');
    }

    const button = document.querySelector(`[onclick="toggleMenu('${menuId}')"]`);
    allButtons.forEach(b => b.classList.remove('active'));
    if (button && menu && menu.classList.contains('show')) {
        button.classList.add('active');
    }
}

function toggleStatsPanel() {
    const statsPanel = document.getElementById('statsPanel');
    if (statsPanel) {
        const isVisible = statsPanel.style.display !== 'none';
        statsPanel.style.display = isVisible ? 'none' : 'grid';
    }
}

async function saveTableAsExcel() {
    try {
        const authLoaded = await loadAuthModule();
        if (!authLoaded || !window.authModule || !window.authModule.isUserLoggedIn()) {
            await saveAsExcelFile();
            return;
        }

        const userManager = await import('./user-manager.js');
        const tableData = userManager.serializeTableData();
        
        let fileName = currentFileName || `Tabledit_${new Date().toISOString().slice(0, 10)}`;
        
        if (currentFileId) {
            await userManager.updateUserFile(currentFileId, fileName, tableData);
            showNotification('Dosya başarıyla güncellendi', 'success');
        } else {
            fileName = prompt('Dosya adını girin:', fileName);
            if (!fileName) return;
            
            const fileId = await userManager.saveUserTable(fileName, tableData);
            currentFileId = fileId;
            currentFileName = fileName;
            showNotification('Dosya başarıyla kaydedildi', 'success');
        }
        
        hasUnsavedChanges = false;
        lastSaveTime = new Date();
        updateSaveStatus();
        
    } catch (error) {
        console.error('❌ Dosya kaydetme hatası:', error);
        showNotification('Dosya kaydedilirken hata oluştu: ' + error.message, 'error');
        
        await saveAsExcelFile();
    }
}

async function saveAsExcelFile() {
    try {
        if (typeof ExcelJS === 'undefined') {
            throw new Error('ExcelJS kütüphanesi yüklenmemiş');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tablo Verileri');
        const table = document.getElementById('dynamicTable');

        if (!table) {
            throw new Error('Tablo bulunamadı');
        }

        const headers = [];
        const headerStyles = [];
        
        table.querySelectorAll('thead th').forEach(th => {
            if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            headers.push(th.textContent.trim());
            headerStyles.push({
                bg: th.style.backgroundColor || '#2c3e50',
                text: th.style.color || '#ffffff'
            });
        });

        if (headers.length === 0) {
            alert("Kaydedilecek veri bulunamadı.");
            return;
        }

        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
            const style = headerStyles[colNumber - 1];
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colorToARGB(style.bg) }
            };
            cell.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: colorToARGB(style.text) }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF000000' } },
                left: { style: 'medium', color: { argb: 'FF000000' } },
                bottom: { style: 'medium', color: { argb: 'FF000000' } },
                right: { style: 'medium', color: { argb: 'FF000000' } }
            };
        });

        worksheet.columns = headers.map(() => ({ width: 25 }));

        table.querySelectorAll('tbody tr').forEach(trNode => {
            const rowData = [];
            const cellStyles = [];
            const cellMeta = [];

            Array.from(trNode.cells).forEach((td, idx) => {
                if (td.classList.contains(CHECKBOX_COLUMN_CLASS)) return;

                const input = td.querySelector('.editable');
                rowData.push(input ? input.value.trim() : td.textContent.trim());
                cellStyles.push({
                    bg: td.style.backgroundColor || '#ffffff',
                    text: td.style.color || '#000000'
                });
                cellMeta.push({
                    readonly: input ? input.readOnly : false
                });
            });

            if (rowData.length > 0) {
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, colNumber) => {
                    const style = cellStyles[colNumber - 1];
                    const meta = cellMeta[colNumber - 1];

                    cell.font = {
                        name: 'Calibri',
                        size: 11,
                        color: { argb: colorToARGB(style.text) }
                    };

                    if (style.bg && style.bg !== 'rgb(255, 255, 255)' && style.bg !== '#ffffff' && style.bg !== 'transparent' && style.bg !== '') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colorToARGB(style.bg) }
                        };
                    }

                    cell.alignment = { vertical: 'middle', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                        right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
                    };

                    if (meta.readonly) {
                        cell.note = "readonly:true";
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentFileName || 'Tabledit'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Excel dosyası başarıyla indirildi');

    } catch (error) {
        console.error('❌ Excel indirme hatası:', error);
        alert('Dosya indirilirken bir hata oluştu: ' + error.message);
    }
}

function loadTableFromExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    if (typeof ExcelJS === 'undefined') {
                        throw new Error('ExcelJS kütüphanesi yüklenmemiş');
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(data);

                    const worksheet = workbook.worksheets[0];
                    if (!worksheet) {
                        alert('Excel dosyasında sayfa bulunamadı.');
                        return;
                    }

                    if (isMultiDeleteModeActive) {
                        toggleMultiDeleteMode();
                    }

                    loadExcelData(worksheet);
                    
                    const fileName = file.name.replace(/\.[^/.]+$/, "");
                    const authLoaded = await loadAuthModule();
                    
                    if (authLoaded && window.authModule && window.authModule.isUserLoggedIn()) {
                        try {
                            const userManager = await import('./user-manager.js');
                            const tableData = userManager.serializeTableData();
                            
                            const fileId = await userManager.saveUserTable(fileName, tableData);
                            currentFileId = fileId;
                            currentFileName = fileName;
                            
                            showNotification(`"${fileName}" dosyası başarıyla yüklendi ve kaydedildi`, 'success');
                            hasUnsavedChanges = false;
                            lastSaveTime = new Date();
                            updateSaveStatus();
                            
                        } catch (saveError) {
                            console.warn('Dosya otomatik kaydedilemedi:', saveError);
                            showNotification(`Dosya yüklendi ancak kaydedilemedi: ${saveError.message}`, 'warning');
                        }
                    } else {
                        showNotification('Dosya yüklendi. Kaydedilmesi için giriş yapmanız gerekir.', 'info');
                    }
                    
                    console.log('✅ Excel dosyası başarıyla yüklendi');

                } catch (error) {
                    console.error('❌ Excel yükleme hatası:', error);
                    alert('Dosya yüklenirken hata oluştu: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };
    input.click();
}

function loadExcelData(worksheet) {
    const table = document.getElementById('dynamicTable');
    const theadTr = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    theadTr.innerHTML = '';
    tbody.innerHTML = '';
    clearSelection();

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        const th = document.createElement('th');
        let headerText = cell.value || `Sütun ${colNumber}`;

        if (colNumber === 1) {
            headerText = 'ID';
        }

        th.textContent = headerText;

        if (cell.fill && cell.fill.fgColor) {
            th.style.backgroundColor = argbToHex(cell.fill.fgColor.argb);
        } else {
            th.style.backgroundColor = '#2c3e50';
        }

        if (cell.font && cell.font.color) {
            th.style.color = argbToHex(cell.font.color.argb);
        } else {
            th.style.color = 'white';
        }

        theadTr.appendChild(th);
    });

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        if (row.hasValues) {
            const tr = tbody.insertRow();
            tr.onclick = function () { selectRow(this); };
            tr.style.cursor = 'pointer';

            row.eachCell((cell, colNumber) => {
                const td = tr.insertCell();
                td.onclick = function (event) { selectCell(this, event); };
                td.style.cursor = 'pointer';

                const value = cell.value || '';

                let isReadonly = false;
                if (colNumber === 1) {
                    isReadonly = true;
                } else {
                    isReadonly = cell.note && cell.note.includes('readonly:true');
                }

                td.innerHTML = `<input type="text" class="editable" value="${value}" ${isReadonly ? 'readonly' : ''}>`;

                if (cell.fill && cell.fill.fgColor) {
                    td.style.backgroundColor = argbToHex(cell.fill.fgColor.argb);
                }

                if (cell.font && cell.font.color) {
                    td.style.color = argbToHex(cell.font.color.argb);
                    const input = td.querySelector('.editable');
                    if (input) {
                        input.style.color = argbToHex(cell.font.color.argb);
                    }
                }
            });
        }
    }

    updateStats();
    updateColumnClickEvents();
    updateRowNumbers();
    markAsChanged();
}

function argbToHex(argb) {
    if (!argb) return '#ffffff';
    if (argb.length === 8) {
        const hex = argb.substring(2);
        return '#' + hex.toLowerCase();
    }
    return argb;
}

function updateSelectionInfo(message) {
    const selectionInfoEl = document.getElementById('selectionInfo');
    const selectionTextEl = document.getElementById('selectionText');
    if (message) {
        if (selectionTextEl) selectionTextEl.textContent = message;
        if (selectionInfoEl) selectionInfoEl.classList.add('show');
    } else {
        if (selectionTextEl) selectionTextEl.textContent = 'Seçim yapılmadı';
        if (selectionInfoEl) selectionInfoEl.classList.remove('show');
    }
}

function printTableOnly() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();
    
    const printWindow = window.open('', '_blank');
    const tableContainer = document.querySelector('.table-container');
    
    if (!tableContainer) {
        alert('Yazdırılacak tablo bulunamadı.');
        return;
    }
    
    const tableHtml = tableContainer.innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tablo Yazdırma</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 12px;
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 8px; 
                    text-align: left;
                }
                th { 
                    background-color: #f0f0f0; 
                    font-weight: bold;
                }
                .editable {
                    border: none;
                    background: transparent;
                    width: 100%;
                    font-size: inherit;
                    font-family: inherit;
                }
            </style>
        </head>
        <body>
            <h2>Tabledit - Tablo Raporu</h2>
            <p>Yazdırma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
            <div>${tableHtml}</div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
    if (wasMultiDeleteActive) showRowCheckboxes();
}

function selectCell(cell, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (isMultiDeleteModeActive) {
        if (cell.parentNode && cell.parentNode.tagName === 'TR') {
            selectRow(cell.parentNode);
        }
        return;
    }

    clearSelection(false);

    selectedCell = cell;
    cell.classList.add('selected-cell');

    const rowIndex = cell.parentNode.rowIndex;
    const visualCellIndex = cell.cellIndex;

    let dataCellIndex = 0;
    let counter = 0;
    const headerCells = document.getElementById('dynamicTable').rows[0].cells;
    for (let i = 0; i < headerCells.length; i++) {
        if (headerCells[i].classList.contains(CHECKBOX_COLUMN_CLASS)) {
            if (i < visualCellIndex) counter++;
        } else {
            if (i === visualCellIndex) break;
        }
    }
    dataCellIndex = visualCellIndex - counter;

    const headerText = headerCells[visualCellIndex]?.textContent || (dataCellIndex + 1);
    const rowNumber = cell.parentNode.parentNode.tagName === 'TBODY' ? Array.from(cell.parentNode.parentNode.children).indexOf(cell.parentNode) + 1 : 'Başlık';
    
    updateSelectionInfo(`Hücre seçildi: Satır ${rowNumber}, Sütun "${headerText}"`);

    if (event && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
        return;
    }
}

function selectRow(row) {
    if (isMultiDeleteModeActive) {
        const checkboxCell = row.cells[0];
        if (checkboxCell && checkboxCell.classList.contains(CHECKBOX_COLUMN_CLASS)) {
            const checkbox = checkboxCell.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
            }
        }
        return;
    }
    
    clearSelection(false);
    selectedRow = row;
    row.classList.add('selected-row');
    const rowIndex = Array.from(row.parentNode.children).indexOf(row) + 1;
    updateSelectionInfo(`Satır ${rowIndex} seçildi.`);
}

function selectColumn(headerCell, event, visualIndex) {
    if (isMultiDeleteModeActive || (headerCell && headerCell.classList.contains(CHECKBOX_COLUMN_CLASS))) {
        return;
    }
    
    clearSelection(false);

    if (event && event.shiftKey) {
        selectedColumn = visualIndex;
        const table = document.getElementById('dynamicTable');
        const rows = table.querySelectorAll('tr');
        let headerText = "";

        rows.forEach(rowNode => {
            const cell = rowNode.cells[visualIndex];
            if (cell) {
                cell.classList.add('selected-column');
                if (rowNode.parentNode.tagName === 'THEAD') {
                    headerText = cell.textContent;
                }
            }
        });
        updateSelectionInfo(`Sütun "${headerText || visualIndex + 1}" seçildi.`);
    } else {
        selectedCell = headerCell;
        headerCell.classList.add('selected-cell');
        updateSelectionInfo(`Başlık hücresi seçildi: Sütun "${headerCell.textContent}"`);
    }
}

function showColorPalette(target) {
    colorTargetType = target;
    const palette = document.getElementById('colorPalette');
    if (palette) {
        palette.classList.add('show');
        palette.style.top = '20px';
        palette.style.left = '20px';

        setTimeout(() => {
            document.addEventListener('click', hidePaletteOnClickOutside, { once: true });
        }, 0);
    }
}

function hidePaletteOnClickOutside(event) {
    const palette = document.getElementById('colorPalette');
    if (palette && !palette.contains(event.target) && !event.target.closest('[onclick^="showColorPalette"]')) {
        palette.classList.remove('show');
    } else {
        document.addEventListener('click', hidePaletteOnClickOutside, { once: true });
    }
}

function applyColor(color) {
    const palette = document.getElementById('colorPalette');

    if (selectedCell) {
        if (colorTargetType === 'bg') {
            selectedCell.style.backgroundColor = color;
        } else if (colorTargetType === 'text') {
            selectedCell.style.color = color;
            const input = selectedCell.querySelector('.editable');
            if (input) input.style.color = color;
        }
    } else if (selectedRow) {
        Array.from(selectedRow.cells).forEach(cell => {
            if (cell.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            if (colorTargetType === 'bg') {
                cell.style.backgroundColor = color;
            } else if (colorTargetType === 'text') {
                cell.style.color = color;
                const input = cell.querySelector('.editable');
                if (input) input.style.color = color;
            }
        });
    } else if (selectedColumn !== null) {
        const table = document.getElementById('dynamicTable');
        table.querySelectorAll('tr').forEach(row => {
            const cell = row.cells[selectedColumn];
            if (cell && !cell.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                if (colorTargetType === 'bg') {
                    cell.style.backgroundColor = color;
                } else if (colorTargetType === 'text') {
                    cell.style.color = color;
                    const input = cell.querySelector('.editable');
                    if (input) input.style.color = color;
                }
            }
        });
    } else {
        alert('Lütfen önce bir hücre, satır veya sütun seçin.');
    }
    
    if (palette) {
        palette.classList.remove('show');
    }

    markAsChanged();
}

function clearCellFormat() {
    if (selectedCell) {
        selectedCell.style.backgroundColor = '';
        selectedCell.style.color = '';
        const input = selectedCell.querySelector('.editable');
        if (input) {
            input.style.color = '';
        }
    } else if (selectedRow) {
        Array.from(selectedRow.cells).forEach(cell => {
            if (cell.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            cell.style.backgroundColor = '';
            cell.style.color = '';
            const input = cell.querySelector('.editable');
            if (input) input.style.color = '';
        });
    } else if (selectedColumn !== null) {
        const table = document.getElementById('dynamicTable');
        table.querySelectorAll('tr').forEach(row => {
            const cell = row.cells[selectedColumn];
            if (cell && !cell.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                cell.style.backgroundColor = '';
                cell.style.color = '';
                const input = cell.querySelector('.editable');
                if (input) input.style.color = '';
            }
        });
    } else {
        alert('Lütfen önce formatını temizlemek istediğiniz bir hücre, satır veya sütun seçin.');
    }

    markAsChanged();
}

function clearSelection(updateInfo = true) {
    if (selectedCell) {
        selectedCell.classList.remove('selected-cell');
        selectedCell = null;
    }
    if (selectedRow) {
        selectedRow.classList.remove('selected-row');
        selectedRow = null;
    }
    if (selectedColumn !== null) {
        const table = document.getElementById('dynamicTable');
        table.querySelectorAll('tr').forEach(row => {
            const cell = row.cells[selectedColumn];
            if (cell) {
                cell.classList.remove('selected-column');
            }
        });
        selectedColumn = null;
    }
    if (updateInfo && !isMultiDeleteModeActive) {
        updateSelectionInfo(null);
    } else if (updateInfo && isMultiDeleteModeActive) {
        updateSelectionInfo('Çoklu satır silme modu aktif. Silmek istediğiniz satırları seçin ve onaylayın.');
    }
}

function addRow() {
    const table = document.getElementById('dynamicTable');
    const tbody = table.getElementsByTagName('tbody')[0];
    const newRow = tbody.insertRow();
    const headerRow = table.querySelector('thead tr');

    if (!headerRow) {
        console.error("Başlık satırı bulunamadı, satır eklenemiyor.");
        const tempTh = document.createElement('th');
        tempTh.textContent = "ID";
        tempTh.style.background = '#2c3e50';
        tempTh.style.color = 'white';
        const tempHeaderRow = table.querySelector('thead').insertRow();
        tempHeaderRow.appendChild(tempTh);
        updateColumnClickEvents();
        addRow();
        return;
    }

    const headerCells = Array.from(headerRow.cells);
    let dataColumnCount = headerCells.filter(th => !th.classList.contains(CHECKBOX_COLUMN_CLASS)).length;

    if (dataColumnCount === 0 && headerCells.length > 0) {
        dataColumnCount = 1;
    } else if (dataColumnCount === 0 && headerCells.length === 0) {
        const idTh = document.createElement('th');
        idTh.textContent = 'ID';
        idTh.style.background = '#2c3e50';
        idTh.style.color = 'white';
        headerRow.appendChild(idTh);
        updateColumnClickEvents();
        dataColumnCount = 1;
    }

    if (isMultiDeleteModeActive) {
        const cbCell = newRow.insertCell(0);
        cbCell.classList.add(CHECKBOX_COLUMN_CLASS);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.cursor = 'pointer';
        checkbox.onclick = function (event) { event.stopPropagation(); };
        cbCell.appendChild(checkbox);
        cbCell.style.textAlign = 'center';
        cbCell.style.verticalAlign = 'middle';
        cbCell.onclick = function (event) { event.stopPropagation(); checkbox.click(); };
    }

    const currentRowCount = tbody.rows.length;

    for (let i = 0; i < dataColumnCount; i++) {
        const cell = newRow.insertCell();
        cell.onclick = function (event) { selectCell(this, event); };
        cell.style.cursor = 'pointer';

        if (i === 0) {
            cell.innerHTML = `<input type="text" class="editable" value="${currentRowCount}" readonly>`;
        } else {
            cell.innerHTML = `<input type="text" class="editable" value="">`;
        }
    }

    newRow.onclick = function () { selectRow(this); };
    updateStats();
    updateRowNumbers();
    markAsChanged();
}

function addColumn() {
    const modal = document.getElementById('columnModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function confirmAddColumn() {
    const columnNameInput = document.getElementById('columnName');
    const columnPositionSelect = document.getElementById('columnPosition');
    
    const columnName = columnNameInput ? columnNameInput.value || 'Yeni Sütun' : 'Yeni Sütun';
    const position = columnPositionSelect ? columnPositionSelect.value : 'end';
    
    const table = document.getElementById('dynamicTable');
    const headerRow = table.querySelector('thead tr');

    if (!headerRow) {
        const newHeaderRow = table.querySelector('thead').insertRow();
        const newHeader = document.createElement('th');
        newHeader.textContent = columnName;
        newHeader.style.background = '#2c3e50';
        newHeader.style.color = 'white';
        newHeaderRow.appendChild(newHeader);

        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
            const newCell = row.insertCell(0);
            newCell.onclick = function (event) { selectCell(this, event); };
            newCell.style.cursor = 'pointer';
            newCell.innerHTML = `<input type="text" class="editable" value="">`;
        });

    } else {
        const newHeader = document.createElement('th');
        newHeader.textContent = columnName;
        newHeader.style.background = '#2c3e50';
        newHeader.style.color = 'white';

        const bodyRows = table.querySelectorAll('tbody tr');
        let insertAtIndex;
        
        if (position === 'start') {
            insertAtIndex = headerRow.cells[0]?.classList.contains(CHECKBOX_COLUMN_CLASS) ? 1 : 0;
        } else {
            insertAtIndex = headerRow.cells.length;
        }

        headerRow.insertBefore(newHeader, headerRow.cells[insertAtIndex] || null);
        bodyRows.forEach(row => {
            const newCell = row.insertCell(insertAtIndex);
            newCell.onclick = function (event) { selectCell(this, event); };
            newCell.style.cursor = 'pointer';
            newCell.innerHTML = `<input type="text" class="editable" value="">`;
        });
    }

    closeModal('columnModal');
    updateStats();
    updateColumnClickEvents();
    markAsChanged();
}

function deleteSelectedRow() {
    if (selectedRow && selectedRow.parentNode && selectedRow.parentNode.tagName === 'TBODY') {
        selectedRow.remove();
        selectedRow = null;
        updateStats();
        updateRowNumbers();
        clearSelection();
        markAsChanged();
    } else {
        alert('Lütfen silmek istediğiniz satırı seçin.');
    }
}

function deleteSelectedColumn() {
    if (selectedColumn === null) {
        alert('Lütfen silmek istediğiniz sütunu seçin.');
        return;
    }
    
    const table = document.getElementById('dynamicTable');
    const headerCellToDelete = table.querySelector('thead tr').cells[selectedColumn];

    if (headerCellToDelete && headerCellToDelete.classList.contains(CHECKBOX_COLUMN_CLASS)) {
        alert('Kontrol kutusu sütunu bu şekilde silinemez.');
        return;
    }

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.cells[selectedColumn]) {
            row.deleteCell(selectedColumn);
        }
    });

    selectedColumn = null;
    updateStats();
    updateColumnClickEvents();
    clearSelection();
    updateRowNumbers();
    markAsChanged();
}

function makeHeaderEditable(thElement) {
    const originalText = thElement.textContent;
    const visualIndexOfTh = Array.from(thElement.parentNode.children).indexOf(thElement);

    const originalOnClick = thElement.onclick;
    const originalOnDblClick = thElement.ondblclick;
    thElement.onclick = null;
    thElement.ondblclick = null;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.classList.add('editable-header');
    input.style.width = '90%';
    input.style.border = '1px solid #3498db';
    input.style.padding = '5px';
    input.style.fontFamily = 'inherit';
    input.style.fontSize = 'inherit';
    input.style.fontWeight = 'normal';

    thElement.innerHTML = '';
    thElement.appendChild(input);
    input.focus();
    input.select();

    const saveHeader = () => {
        let newText = input.value.trim();
        if (newText === '') {
            newText = originalText;
        }

        thElement.innerHTML = '';
        thElement.textContent = newText;

        thElement.onclick = (event) => selectColumn(thElement, event, visualIndexOfTh);
        thElement.ondblclick = () => makeHeaderEditable(thElement);
        markAsChanged();
    };

    const cancelEdit = () => {
        thElement.innerHTML = '';
        thElement.textContent = originalText;
        thElement.onclick = originalOnClick;
        thElement.ondblclick = originalOnDblClick;
    };

    function handleBlur() {
        saveHeader();
        input.removeEventListener('blur', handleBlur);
    }

    input.addEventListener('blur', handleBlur);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveHeader();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

function updateColumnClickEvents() {
    const headers = document.querySelectorAll('#dynamicTable thead th');
    headers.forEach((header, visualIndex) => {
        const newHeader = header.cloneNode(true);
        if (header.parentNode) {
            header.parentNode.replaceChild(newHeader, header);
        }

        if (!newHeader.classList.contains(CHECKBOX_COLUMN_CLASS)) {
            newHeader.onclick = function (event) { selectColumn(this, event, visualIndex); };
            newHeader.ondblclick = function () { makeHeaderEditable(this); };
            newHeader.style.cursor = 'pointer';
        } else {
            newHeader.style.cursor = 'default';
            newHeader.ondblclick = null;
        }
    });
}

function updateRowNumbers() {
    const table = document.getElementById('dynamicTable');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.forEach((row, index) => {
        const cells = Array.from(row.cells);

        let firstDataCellIndex = 0;
        if (cells[0] && cells[0].classList.contains(CHECKBOX_COLUMN_CLASS)) {
            firstDataCellIndex = 1;
        }

        if (cells[firstDataCellIndex]) {
            const input = cells[firstDataCellIndex].querySelector('.editable');
            if (input) {
                input.value = index + 1;
                input.readOnly = true;
            }
        }
    });
}

function updateStats() {
    const table = document.getElementById('dynamicTable');
    const rowCount = table.querySelectorAll('tbody tr').length;
    const headerRow = table.querySelector('thead tr');
    let columnCount = 0;
    
    if (headerRow) {
        Array.from(headerRow.cells).forEach(th => {
            if (!th.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                columnCount++;
            }
        });
    }
    
    const cellCount = rowCount * columnCount;

    const rowCountEl = document.getElementById('rowCount');
    const columnCountEl = document.getElementById('columnCount');
    const cellCountEl = document.getElementById('cellCount');
    
    if (rowCountEl) rowCountEl.textContent = rowCount;
    if (columnCountEl) columnCountEl.textContent = columnCount;
    if (cellCountEl) cellCountEl.textContent = cellCount;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    const columnNameInput = document.getElementById('columnName');
    if (columnNameInput) {
        columnNameInput.value = '';
    }
}

function clearTable() {
    if (confirm('Tüm tabloyu temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        const table = document.getElementById('dynamicTable');
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        const theadTr = table.querySelector('thead tr');
        if (theadTr) {
            theadTr.innerHTML = '';
            const initialTh = document.createElement('th');
            initialTh.textContent = 'ID';
            initialTh.style.background = '#2c3e50';
            initialTh.style.color = 'white';
            initialTh.style.cursor = 'pointer';
            theadTr.appendChild(initialTh);
        }

        if (isMultiDeleteModeActive) {
            toggleMultiDeleteMode();
        }

        updateStats();
        clearSelection();
        updateColumnClickEvents();
        markAsChanged();
    }
}

function exportToExcelBasic() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX kütüphanesi yüklenmemiş');
        }

        const table = document.getElementById('dynamicTable');
        const wb = XLSX.utils.book_new();
        const data = [];

        const headers = [];
        table.querySelectorAll('thead th').forEach(th => {
            if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            headers.push(th.textContent.trim());
        });
        
        if (headers.length > 0) {
            data.push(headers);
        }

        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = [];
            Array.from(row.cells).forEach(td => {
                if (td.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
                const input = td.querySelector('.editable');
                rowData.push(input ? input.value.trim() : td.textContent.trim());
            });
            if (rowData.length > 0) data.push(rowData);
        });

        if (data.length === 0) {
            alert("Dışa aktarılacak veri bulunamadı.");
            return;
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        if (headers.length > 0) {
            ws['!cols'] = headers.map(() => ({ wch: 20 }));
        }
        
        XLSX.utils.book_append_sheet(wb, ws, "Tabledit");
        XLSX.writeFile(wb, `Tabledit_Basit_${new Date().toISOString().slice(0, 10)}.xlsx`);

        console.log('✅ Basit Excel dosyası başarıyla dışa aktarıldı');

    } catch (error) {
        console.error('❌ Basit Excel dışa aktarma hatası:', error);
        alert('Dosya dışa aktarılırken hata oluştu: ' + error.message);
    } finally {
        if (wasMultiDeleteActive) showRowCheckboxes();
    }
}

async function exportToExcelAdvanced() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    try {
        if (typeof ExcelJS === 'undefined') {
            throw new Error('ExcelJS kütüphanesi yüklenmemiş');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tabledit');
        const table = document.getElementById('dynamicTable');

        const headers = [];
        const headerStyles = [];
        
        table.querySelectorAll('thead th').forEach(th => {
            if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            headers.push(th.textContent.trim());
            headerStyles.push({ 
                bg: th.style.backgroundColor || '#2c3e50', 
                text: th.style.color || '#ffffff' 
            });
        });

        if (headers.length === 0) {
            alert("Dışa aktarılacak veri bulunamadı.");
            return;
        }

        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
            const style = headerStyles[colNumber - 1];
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: colorToARGB(style.bg) } 
            };
            cell.font = { 
                name: 'Calibri', 
                size: 12, 
                bold: true, 
                color: { argb: colorToARGB(style.text) } 
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF000000' } }, 
                left: { style: 'medium', color: { argb: 'FF000000' } },
                bottom: { style: 'medium', color: { argb: 'FF000000' } }, 
                right: { style: 'medium', color: { argb: 'FF000000' } }
            };
        });
        
        worksheet.columns = headers.map(() => ({ width: 25 }));

        table.querySelectorAll('tbody tr').forEach(trNode => {
            const rowData = [];
            const cellStyles = [];
            
            Array.from(trNode.cells).forEach(td => {
                if (td.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
                const input = td.querySelector('.editable');
                rowData.push(input ? input.value.trim() : td.textContent.trim());
                cellStyles.push({ 
                    bg: td.style.backgroundColor || '#ffffff', 
                    text: td.style.color || '#000000' 
                });
            });

            if (rowData.length > 0) {
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, colNumber) => {
                    const style = cellStyles[colNumber - 1];
                    cell.font = { 
                        name: 'Calibri', 
                        size: 11, 
                        color: { argb: colorToARGB(style.text) } 
                    };
                    
                    if (style.bg && style.bg !== 'rgb(255, 255, 255)' && style.bg !== '#ffffff' && style.bg !== 'transparent' && style.bg !== '') {
                        cell.fill = { 
                            type: 'pattern', 
                            pattern: 'solid', 
                            fgColor: { argb: colorToARGB(style.bg) } 
                        };
                    }
                    
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFBFBFBF' } }, 
                        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } }, 
                        right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
                    };
                });
            }
        });
        
        if (worksheet.getRow(1)) {
            worksheet.getRow(1).height = 30;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Tabledit_Formatlı_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ Formatlı Excel dosyası başarıyla dışa aktarıldı');

    } catch (error) {
        console.error('❌ Formatlı Excel dışa aktarma hatası:', error);
        alert('Dosya dışa aktarılırken hata oluştu: ' + error.message);
    } finally {
        if (wasMultiDeleteActive) showRowCheckboxes();
    }
}

function colorToARGB(color) {
    if (!color || color === 'transparent') return 'FFFFFFFF';

    let r = 255, g = 255, b = 255;

    if (color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        }
    } else if (color.startsWith('#')) {
        const hex = color.substring(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    } else {
        const namedColorMap = { 
            'white': 'FFFFFFFF', 
            'black': 'FF000000',
            'red': 'FFFF0000',
            'green': 'FF00FF00',
            'blue': 'FF0000FF'
        };
        if (namedColorMap[color.toLowerCase()]) {
            return namedColorMap[color.toLowerCase()];
        }
        console.warn("Bilinmeyen renk adı:", color, "Beyaz varsayılıyor.");
        return 'FFFFFFFF';
    }
    
    return `FF${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function exportToCSV() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    try {
        const table = document.getElementById('dynamicTable');
        let csv = '';

        const headers = [];
        table.querySelectorAll('thead th').forEach(th => {
            if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            headers.push(`"${th.textContent.trim().replace(/"/g, '""')}"`);
        });

        if (headers.length === 0) {
            alert("Dışa aktarılacak veri bulunamadı.");
            return;
        }
        
        csv += headers.join(',') + '\n';

        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = [];
            Array.from(row.cells).forEach(td => {
                if (td.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
                const input = td.querySelector('.editable');
                const text = input ? input.value.trim() : td.textContent.trim();
                rowData.push(`"${text.replace(/"/g, '""')}"`);
            });
            if (rowData.length > 0) {
                csv += rowData.join(',') + '\n';
            }
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Tabledit_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ CSV dosyası başarıyla dışa aktarıldı');

    } catch (error) {
        console.error('❌ CSV dışa aktarma hatası:', error);
        alert('Dosya dışa aktarılırken hata oluştu: ' + error.message);
    } finally {
        if (wasMultiDeleteActive) showRowCheckboxes();
    }
}

function toggleMultiDeleteMode() {
    isMultiDeleteModeActive = !isMultiDeleteModeActive;
    const multiDeleteToolbar = document.getElementById('multiDeleteToolbar');

    if (isMultiDeleteModeActive) {
        showRowCheckboxes();
        if (multiDeleteToolbar) {
            multiDeleteToolbar.style.display = 'flex';
        }
        clearSelection(false);
        updateSelectionInfo('Çoklu satır silme modu aktif. Satırları seçip onaylayın.');
    } else {
        hideRowCheckboxes();
        if (multiDeleteToolbar) {
            multiDeleteToolbar.style.display = 'none';
        }
        updateSelectionInfo(null);
    }
    updateColumnClickEvents();
}

function showRowCheckboxes() {
    const table = document.getElementById('dynamicTable');
    const theadTr = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    if (theadTr && !theadTr.querySelector(`th.${CHECKBOX_COLUMN_CLASS}`)) {
        const th = document.createElement('th');
        th.classList.add(CHECKBOX_COLUMN_CLASS);
        th.style.width = '40px';
        th.style.background = '#34495e';
        th.style.textAlign = 'center';
        theadTr.insertBefore(th, theadTr.firstChild);
    }

    if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => {
            if (!row.querySelector(`td.${CHECKBOX_COLUMN_CLASS}`)) {
                const cell = row.insertCell(0);
                cell.classList.add(CHECKBOX_COLUMN_CLASS);
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.cursor = 'pointer';
                checkbox.onclick = function (event) { event.stopPropagation(); };
                cell.appendChild(checkbox);
                cell.style.textAlign = 'center';
                cell.style.verticalAlign = 'middle';
                cell.onclick = function (event) { event.stopPropagation(); checkbox.click(); };
            }
        });
    }
    updateStats();
}

function hideRowCheckboxes() {
    const table = document.getElementById('dynamicTable');
    table.querySelectorAll(`.${CHECKBOX_COLUMN_CLASS}`).forEach(cell => cell.remove());
    updateStats();
}

function confirmDeleteSelectedRows() {
    const tbody = document.getElementById('dynamicTable').querySelector('tbody');
    if (!tbody) return;
    
    const rowsToDelete = [];
    tbody.querySelectorAll('tr').forEach(row => {
        const checkboxCell = row.cells[0];
        if (checkboxCell && checkboxCell.classList.contains(CHECKBOX_COLUMN_CLASS)) {
            const checkbox = checkboxCell.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                rowsToDelete.push(row);
            }
        }
    });

    if (rowsToDelete.length === 0) {
        alert('Lütfen silmek için en az bir satır seçin.');
        return;
    }

    if (confirm(`${rowsToDelete.length} satır silinecek. Emin misiniz?`)) {
        rowsToDelete.forEach(row => row.remove());
        toggleMultiDeleteMode();
        updateStats();
        updateRowNumbers();
        markAsChanged();
    }
}

window.openAuthModal = async function (type) {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.openAuthModal(type);
    } else {
        alert('Giriş sistemi yüklenirken hata oluştu. Sayfayı yenileyin.');
    }
}

window.closeAuthModal = async function (type) {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.closeAuthModal(type);
    }
}

window.toggleUserDropdown = async function () {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.toggleUserDropdown();
    }
}

window.logoutUser = async function () {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.logoutUser();
    } else {
        alert('Çıkış sistemi yüklenirken hata oluştu. Sayfayı yenileyin.');
    }
}

window.openProfile = function () {
    alert('Profil sayfası yakında gelecek!');
}

window.openMyFiles = function () {
    window.location.href = './files.html';
}

window.createNewFile = function () {
    if (hasUnsavedChanges) {
        if (confirm('Kaydedilmemiş değişiklikler var. Yeni dosya oluşturmak istediğinizden emin misiniz?')) {
            createNewTable();
        }
    } else {
        createNewTable();
    }
}

function createNewTable() {
    currentFileId = null;
    currentFileName = null;
    hasUnsavedChanges = false;
    
    const table = document.getElementById('dynamicTable');
    const tbody = table.querySelector('tbody');
    const theadTr = table.querySelector('thead tr');
    
    if (tbody) tbody.innerHTML = '';
    if (theadTr) {
        theadTr.innerHTML = `
            <th onclick="selectColumn(0)" style="background: #2c3e50; color: white;">ID</th>
            <th onclick="selectColumn(1)" style="background: #2c3e50; color: white;">Ad Soyad</th>
            <th onclick="selectColumn(2)" style="background: #2c3e50; color: white;">Mevki</th>
            <th onclick="selectColumn(3)" style="background: #2c3e50; color: white;">Departman</th>
            <th onclick="selectColumn(4)" style="background: #2c3e50; color: white;">Telefon</th>
        `;
    }
    
    if (tbody) {
        const sampleRows = [
            ['1', 'Ahmet YILMAZ', 'Başkan', 'Yönetim', '0532 123 45 67'],
            ['2', 'Turan KAYA', 'Sekreter', 'Yönetim', '0533 234 56 78'],
            ['3', 'Mehmet ALİ', 'Üye', 'Etkinlik', '0534 345 67 89']
        ];
        
        sampleRows.forEach(rowData => {
            const tr = tbody.insertRow();
            tr.onclick = function () { selectRow(this); };
            tr.style.cursor = 'pointer';
            
            rowData.forEach((cellValue, index) => {
                const td = tr.insertCell();
                td.onclick = function (event) { selectCell(this, event); };
                td.style.cursor = 'pointer';
                td.innerHTML = `<input type="text" class="editable" value="${cellValue}" ${index === 0 ? 'readonly' : ''}>`;
            });
        });
    }
    
    updateStats();
    updateColumnClickEvents();
    updateRowNumbers();
    clearSelection();
    updateSaveStatus();
    
    showNotification('Yeni dosya oluşturuldu', 'success');
}

async function loadFileFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const fileId = urlParams.get('file');
        
        if (!fileId) return;
        
        const sessionData = sessionStorage.getItem('loadFileData');
        sessionStorage.removeItem('loadFileData');
        
        if (sessionData) {
            const fileData = JSON.parse(sessionData);
            currentFileId = fileId;
            currentFileName = fileData.name;
            
            const userManager = await import('./user-manager.js');
            userManager.deserializeTableData(fileData.data);
            
            hasUnsavedChanges = false;
            lastSaveTime = new Date(fileData.updatedAt);
            updateSaveStatus();
            
            showNotification(`"${fileData.name}" dosyası açıldı`, 'success');
            
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
    } catch (error) {
        console.error('URL\'den dosya yüklenemedi:', error);
        showNotification('Dosya açılırken hata oluştu: ' + error.message, 'error');
    }
}

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(async () => {
        const authLoaded = await loadAuthModule();
        if (!authLoaded || !window.authModule || !window.authModule.isUserLoggedIn()) {
            return;
        }
        
        if (!hasUnsavedChanges || !currentFileId) {
            return;
        }
        
        try {
            const userManager = await import('./user-manager.js');
            const tableData = userManager.serializeTableData();
            
            await userManager.updateUserFile(currentFileId, currentFileName, tableData);
            
            hasUnsavedChanges = false;
            lastSaveTime = new Date();
            updateSaveStatus();
            
            showNotification('Otomatik kayıt tamamlandı', 'info', 2000);
            
        } catch (error) {
            console.error('Otomatik kayıt hatası:', error);
            showNotification('Otomatik kayıt başarısız: ' + error.message, 'warning', 3000);
        }
    }, AUTO_SAVE_INTERVAL);
    
    autoSaveEnabled = true;
    console.log('Otomatik kayıt başlatıldı (30 saniye aralıklarla)');
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    autoSaveEnabled = false;
    console.log('Otomatik kayıt durduruldu');
}

function markAsChanged() {
    hasUnsavedChanges = true;
    updateSaveStatus();
}

function updateSaveStatus() {
    const statusEl = document.getElementById('saveStatus');
    if (!statusEl) {
        createSaveStatusIndicator();
        return;
    }
    
    if (hasUnsavedChanges) {
        statusEl.innerHTML = '● Kaydedilmemiş değişiklikler';
        statusEl.className = 'save-status unsaved';
    } else if (lastSaveTime) {
        const timeAgo = formatTimeAgo(lastSaveTime);
        statusEl.innerHTML = `✓ ${timeAgo} kaydedildi`;
        statusEl.className = 'save-status saved';
    } else {
        statusEl.innerHTML = 'Yeni dosya';
        statusEl.className = 'save-status new';
    }
}

function createSaveStatusIndicator() {
    const toolbar = document.querySelector('.quick-toolbar');
    if (!toolbar) return;
    
    const statusEl = document.createElement('div');
    statusEl.id = 'saveStatus';
    statusEl.className = 'save-status new';
    statusEl.innerHTML = 'Yeni dosya';
    
    const separatorEl = document.createElement('div');
    separatorEl.className = 'toolbar-separator';
    
    toolbar.appendChild(separatorEl);
    toolbar.appendChild(statusEl);
    
    const style = document.createElement('style');
    style.textContent = `
        .save-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
            white-space: nowrap;
        }
        .save-status.saved {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .save-status.unsaved {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .save-status.new {
            background: #e2e3e5;
            color: #495057;
            border: 1px solid #d6d8db;
        }
    `;
    document.head.appendChild(style);
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
}

function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        success: 'linear-gradient(45deg, #27ae60, #229954)',
        error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
        warning: 'linear-gradient(45deg, #f39c12, #e67e22)',
        info: 'linear-gradient(45deg, #3498db, #2980b9)'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        font-size: 14px;
        font-weight: 500;
        max-width: 350px;
        word-break: break-word;
        animation: slideInRight 0.3s ease-out;
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

window.resendVerificationEmail = async function() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.resendEmailVerification();
    } else {
        alert('E-posta gönderilirken hata oluştu. Sayfayı yenileyin.');
    }
}

window.checkEmailVerificationStatus = async function() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.checkEmailVerification();
    } else {
        alert('Kontrol edilirken hata oluştu. Sayfayı yenileyin.');
    }
}

window.closeEmailVerificationModal = async function() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && window.authModule) {
        window.authModule.closeEmailVerificationModal();
    }
}

function setupFormEventListeners() {
    function setupCityDistrictDropdowns() {
        const citySelect = document.getElementById('registerCity');
        const districtSelect = document.getElementById('registerDistrict');
        
        if (citySelect && districtSelect) {
            citySelect.innerHTML = '<option value="">İl Seçin</option>';
            Object.keys(turkeyLocationData).sort().forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
            
            citySelect.addEventListener('change', function() {
                const selectedCity = this.value;
                districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
                
                if (selectedCity && turkeyLocationData[selectedCity]) {
                    turkeyLocationData[selectedCity].forEach(district => {
                        const option = document.createElement('option');
                        option.value = district;
                        option.textContent = district;
                        districtSelect.appendChild(option);
                    });
                }
            });
        }
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const nameInput = document.getElementById('registerName');
            const cityInput = document.getElementById('registerCity');
            const districtInput = document.getElementById('registerDistrict');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            
            const formData = {
                name: nameInput ? nameInput.value.trim() : '',
                city: cityInput ? cityInput.value : '',
                district: districtInput ? districtInput.value : '',
                email: emailInput ? emailInput.value.trim() : '',
                password: passwordInput ? passwordInput.value : ''
            };
            
            if (!formData.name || !formData.email || !formData.password) {
                alert('Lütfen tüm zorunlu alanları doldurun.');
                return;
            }
            
            if (!formData.city || !formData.district) {
                formData.city = formData.city || 'İstanbul';
                formData.district = formData.district || 'Kadıköy';
            }
            
            const authLoaded = await loadAuthModule();
            if (authLoaded && window.authModule) {
                try {
                    await window.authModule.registerUser(formData);
                } catch (error) {
                    console.error('Kayıt hatası:', error);
                }
            } else {
                alert('Sistem hatası: Auth modülü yüklenemedi');
            }
        });
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            
            if (!email || !password) {
                alert('Lütfen e-posta ve şifrenizi girin.');
                return;
            }
            
            const authLoaded = await loadAuthModule();
            if (authLoaded && window.authModule) {
                try {
                    await window.authModule.loginUser(email, password);
                } catch (error) {
                    console.error('Giriş hatası:', error);
                }
            } else {
                alert('Sistem hatası: Auth modülü yüklenemedi');
            }
        });
    }
    
    setupCityDistrictDropdowns();
}

function initializeEventListeners() {
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.nav-menu')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            document.querySelectorAll('.nav-button').forEach(button => {
                button.classList.remove('active');
            });
        }
    });

    window.onclick = function (event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                case 'S':
                    event.preventDefault();
                    saveTableAsExcel();
                    break;
                case 'o':
                case 'O':
                    event.preventDefault();
                    loadTableFromExcel();
                    break;
                case 'p':
                case 'P':
                    event.preventDefault();
                    printTableOnly();
                    break;
            }
        }
    });
}

function initializeApplication() {
    console.log('🚀 Tabledit uygulaması başlatılıyor...');
    
    try {
        updateStats();
        updateColumnClickEvents();
        updateRowNumbers();
        initializeEventListeners();
        setupFormEventListeners();
        setupTableChangeListeners();
        createSaveStatusIndicator();
        
        loadAuthModule().then(authLoaded => {
            if (authLoaded && window.authModule) {
                window.authModule.initializeAuth();
                console.log('✅ Auth sistemi başlatıldı');
                
                window.authModule.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        const { checkUserVerificationStatus } = await import('./email-verification.js');
                        const verificationStatus = await checkUserVerificationStatus(user.uid);
                        
                        if (verificationStatus.verified) {
                            setTimeout(() => {
                                startAutoSave();
                            }, 2000);
                        }
                    } else {
                        stopAutoSave();
                    }
                });
            } else {
                console.error('❌ Auth sistemi yüklenemedi');
                const authButtons = document.querySelector('.auth-buttons');
                if (authButtons) {
                    authButtons.innerHTML = '<span style="color: red; font-size: 12px;">Auth sistemi yüklenemedi</span>';
                }
            }
        });
        
        loadFileFromUrl();
        
        const urlParams = new URLSearchParams(window.location.search);
        const verifiedStatus = urlParams.get('verified');
        
        if (verifiedStatus === 'success') {
            setTimeout(() => {
                showNotification('🎉 E-posta doğrulama başarılı! Hoş geldiniz!\n\nArtık Tabledit\'in tüm özelliklerini kullanabilirsiniz.', 'success', 5000);
                const newUrl = window.location.href.split('?')[0];
                window.history.replaceState({}, document.title, newUrl);
            }, 1000);
        }
        
        console.log('✅ Tabledit uygulaması başarıyla başlatıldı');
        
    } catch (error) {
        console.error('❌ Uygulama başlatma hatası:', error);
    }
}

function setupTableChangeListeners() {
    const table = document.getElementById('dynamicTable');
    if (!table) return;
    
    const observer = new MutationObserver((mutations) => {
        let hasRelevantChanges = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || 
                (mutation.type === 'attributes' && 
                 (mutation.attributeName === 'style' || mutation.attributeName === 'value'))) {
                hasRelevantChanges = true;
            }
        });
        
        if (hasRelevantChanges) {
            markAsChanged();
        }
    });
    
    observer.observe(table, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'value']
    });
    
    table.addEventListener('input', () => {
        markAsChanged();
    });
    
    table.addEventListener('change', () => {
        markAsChanged();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}

window.addEventListener('load', () => {
    console.log('📄 Sayfa tamamen yüklendi');
});

window.addEventListener('beforeunload', (event) => {
    stopAutoSave();
    
    if (hasUnsavedChanges) {
        const message = 'Kaydedilmemiş değişiklikler var. Sayfayı kapatmak istediğinizden emin misiniz?';
        event.returnValue = message;
        return message;
    }
});

window.addEventListener('pagehide', () => {
    stopAutoSave();
});