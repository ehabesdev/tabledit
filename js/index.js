

let selectedCell = null;
let selectedRow = null;
let selectedColumn = null;
let colorTargetType = '';
let isMultiDeleteModeActive = false;
const CHECKBOX_COLUMN_CLASS = 'row-checkbox-cell';


function converter() {
    window.location.href = 'converter.html';
}

function updateFixedElementLayout() {
    const headerElement = document.querySelector('.header');
    const toolbarElement = document.querySelector('.toolbar');
    const containerElement = document.querySelector('.container');

    if (headerElement && toolbarElement && containerElement) {
        const headerHeight = headerElement.offsetHeight;
        toolbarElement.style.top = headerHeight + 'px';

        const toolbarHeight = toolbarElement.offsetHeight;

        containerElement.style.paddingTop = (headerHeight + toolbarHeight) + 'px';
    }
}

function updateSelectionInfo(message) {
    const selectionInfoEl = document.getElementById('selectionInfo');
    const selectionTextEl = document.getElementById('selectionText');
    if (message) {
        selectionTextEl.textContent = message;
        selectionInfoEl.classList.add('show');
    } else {
        selectionTextEl.textContent = 'Seçim yapılmadı';
        selectionInfoEl.classList.remove('show');
    }
}

function selectCell(cell, event) {
    if (event) {
        event.stopPropagation();
    }
    if (isMultiDeleteModeActive) {
        if (cell.parentNode.tagName === 'TR') {
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
    updateSelectionInfo(`Hücre seçildi: Satır ${cell.parentNode.parentNode.tagName === 'TBODY' ? Array.from(cell.parentNode.parentNode.children).indexOf(cell.parentNode) + 1 : 'Başlık'}, Sütun "${headerText}"`);

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

function selectColumn(index) {
    const headerCell = document.getElementById('dynamicTable').querySelector('thead tr').cells[index];
    if (isMultiDeleteModeActive || (headerCell && headerCell.classList.contains(CHECKBOX_COLUMN_CLASS))) {
        return;
    }
    clearSelection(false);

    selectedColumn = index;
    const table = document.getElementById('dynamicTable');
    const rows = table.querySelectorAll('tr');
    let headerText = "";

    rows.forEach(rowNode => {
        const cell = rowNode.cells[index];
        if (cell) {
            cell.classList.add('selected-column');
            if (rowNode.parentNode.tagName === 'THEAD') {
                headerText = cell.textContent;
            }
        }
    });
    updateSelectionInfo(`Sütun "${headerText || index + 1}" seçildi.`);
}

function showColorPalette(target) {
    colorTargetType = target;
    const palette = document.getElementById('colorPalette');
    palette.classList.add('show');

    palette.style.top = '20px';
    palette.style.left = '20px';

    setTimeout(() => {
        document.addEventListener('click', hidePaletteOnClickOutside, { once: true });
    }, 0);
}

function hidePaletteOnClickOutside(event) {
    const palette = document.getElementById('colorPalette');
    if (!palette.contains(event.target) && !event.target.closest('[onclick^="showColorPalette"]')) {
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
    palette.classList.remove('show');
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

    let dataColumnCount = 0;
    if (headerRow) {
        Array.from(headerRow.cells).forEach(th => {
            if (!th.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                dataColumnCount++;
            }
        });
    } else {
        dataColumnCount = 5;
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

    for (let i = 0; i < dataColumnCount; i++) {
        const cell = newRow.insertCell();
        cell.onclick = function (event) { selectCell(this, event); };
        cell.style.cursor = 'pointer';

        let cellValue = "";
        let actualDataHeaderCell = null;
        let currentDataColIdx = 0;
        if (headerRow) {
            Array.from(headerRow.cells).forEach(th => {
                if (!th.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                    if (currentDataColIdx === i) {
                        actualDataHeaderCell = th;
                    }
                    currentDataColIdx++;
                }
            });
        }

        if (i === 0 && actualDataHeaderCell && (actualDataHeaderCell.textContent.toLowerCase().includes('id') || actualDataHeaderCell.textContent.toLowerCase().includes('sıra no'))) {
            cellValue = (tbody.rows.length).toString().padStart(3, '0');
            cell.innerHTML = `<input type="text" class="editable" value="${cellValue}" readonly>`;
        } else {
            cell.innerHTML = `<input type="text" class="editable" value="">`;
        }
    }

    newRow.onclick = function () { selectRow(this); };
    updateStats();
    updateRowNumbers();
}


function addColumn() {
    document.getElementById('columnModal').style.display = 'block';
}

function confirmAddColumn() {
    const columnName = document.getElementById('columnName').value || 'Yeni Sütun';
    const position = document.getElementById('columnPosition').value;
    const table = document.getElementById('dynamicTable');

    const headerRow = table.querySelector('thead tr');
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

    closeModal('columnModal');
    updateStats();
    updateColumnClickEvents();
}


function deleteSelectedRow() {
    if (selectedRow && selectedRow.parentNode && selectedRow.parentNode.tagName === 'TBODY') {
        selectedRow.remove();
        selectedRow = null;
        updateStats();
        updateRowNumbers();
        clearSelection();
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
    let isFirstDataColumnId = false;
    if (headerCellToDelete) {
        let dataColIndex = 0;
        let visualIndexCounter = 0;
        Array.from(table.querySelector('thead tr').cells).forEach((th, vIdx) => {
            if (!th.classList.contains(CHECKBOX_COLUMN_CLASS)) {
                if (vIdx === selectedColumn) {
                    if (dataColIndex === 0 && (th.textContent.toLowerCase().includes('id') || th.textContent.toLowerCase().includes('sıra no'))) {
                        isFirstDataColumnId = true;
                    }
                }
                dataColIndex++;
            }
        });
    }
    if (isFirstDataColumnId) {
        if (!confirm('"ID/Sıra No" sütununu silmek üzeresiniz. Bu işlem verilerinizin sıralamasını etkileyebilir ve önerilmez. Devam etmek istiyor musunuz?')) {
            return;
        }
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
}

function updateColumnClickEvents() {
    const headers = document.querySelectorAll('#dynamicTable thead th');
    headers.forEach((header, index) => {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        if (!newHeader.classList.contains(CHECKBOX_COLUMN_CLASS)) {
            newHeader.onclick = function () { selectColumn(index); };
            newHeader.style.cursor = 'pointer';
        } else {
            newHeader.style.cursor = 'default';
        }
    });
}

function updateRowNumbers() {
    const table = document.getElementById('dynamicTable');
    const headerRow = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    if (!headerRow || !tbody || headerRow.cells.length === 0) return;

    let idColumnVisualIndex = -1;
    let dataColumnCounter = 0;

    Array.from(headerRow.cells).forEach((th, visualIndex) => {
        if (!th.classList.contains(CHECKBOX_COLUMN_CLASS)) {
            if (dataColumnCounter === 0) {
                if (th.textContent.toLowerCase().includes('id') || th.textContent.toLowerCase().includes('sıra no')) {
                    idColumnVisualIndex = visualIndex;
                }
            }
            dataColumnCounter++;
        }
    });

    if (idColumnVisualIndex !== -1) {
        const bodyRows = tbody.querySelectorAll('tr');
        bodyRows.forEach((row, rowIndex) => {
            const idCell = row.cells[idColumnVisualIndex];
            if (idCell) {
                const input = idCell.querySelector('.editable');
                if (input && input.hasAttribute('readonly')) {
                    const newRowNumber = (rowIndex + 1).toString().padStart(1, '0');
                    input.value = newRowNumber;
                }
            }
        });
    }
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

    document.getElementById('rowCount').textContent = rowCount;
    document.getElementById('columnCount').textContent = columnCount;
    document.getElementById('cellCount').textContent = cellCount;
}


function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    const columnNameInput = document.getElementById('columnName');
    if (columnNameInput) columnNameInput.value = '';
}

window.onclick = function (event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function saveTable() {
    const table = document.getElementById('dynamicTable');
    const data = {
        headers: [],
        rows: [],
    };

    const headers = table.querySelectorAll('thead th');
    headers.forEach(header => {
        if (header.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
        data.headers.push({
            text: header.textContent,
            style: {
                backgroundColor: header.style.backgroundColor,
                color: header.style.color
            }
        });
    });

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = [];
        Array.from(row.cells).forEach(cell => {
            if (cell.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            const input = cell.querySelector('.editable');
            rowData.push({
                text: input ? input.value : cell.textContent,
                style: {
                    backgroundColor: cell.style.backgroundColor,
                    color: cell.style.color,
                    isReadonly: input ? input.readOnly : false
                }
            });
        });
        if (rowData.length > 0) {
            data.rows.push(rowData);
        }
    });

    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anadolu_genclik_tablo_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadTable() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (isMultiDeleteModeActive) {
                        toggleMultiDeleteMode();
                    }
                    loadTableFromData(data);
                } catch (error) {
                    alert('Dosya yüklenirken hata oluştu: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function loadTableFromData(data) {
    const table = document.getElementById('dynamicTable');
    const theadTr = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    theadTr.innerHTML = '';
    tbody.innerHTML = '';
    clearSelection();

    data.headers.forEach((headerData, index) => {
        const th = document.createElement('th');
        th.textContent = headerData.text;
        th.style.backgroundColor = headerData.style.backgroundColor || '#2c3e50';
        th.style.color = headerData.style.color || 'white';
        theadTr.appendChild(th);
    });

    data.rows.forEach(rowData => {
        const tr = tbody.insertRow();
        tr.onclick = function () { selectRow(this); };
        tr.style.cursor = 'pointer';

        rowData.forEach(cellData => {
            const td = tr.insertCell();
            td.onclick = function (event) { selectCell(this, event); };
            td.style.cursor = 'pointer';
            td.innerHTML = `<input type="text" class="editable" value="${cellData.text || ''}" ${cellData.isReadonly ? 'readonly' : ''}>`;
            td.style.backgroundColor = cellData.style.backgroundColor || '';
            td.style.color = cellData.style.color || '';

            const input = td.querySelector('.editable');
            if (input && cellData.style.color) {
                input.style.color = cellData.style.color;
            }
        });
    });

    updateStats();
    updateColumnClickEvents();
    updateRowNumbers();
}

function clearTable() {
    if (confirm('Tüm tabloyu temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        const table = document.getElementById('dynamicTable');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const theadTr = table.querySelector('thead tr');
        theadTr.innerHTML = `
                <th onclick="selectColumn(0)" style="background: #2c3e50; color: white; cursor: pointer;">ID</th>
            `;

        if (isMultiDeleteModeActive) {
            toggleMultiDeleteMode();
        }

        updateStats();
        clearSelection();
        updateColumnClickEvents();
    }
}

function exportToExcelBasic() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    const table = document.getElementById('dynamicTable');
    const wb = XLSX.utils.book_new();
    const data = [];

    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
        headers.push(th.textContent.trim());
    });
    data.push(headers);

    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = [];
        Array.from(row.cells).forEach(td => {
            if (td.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
            const input = td.querySelector('.editable');
            rowData.push(input ? input.value.trim() : td.textContent.trim());
        });
        if (rowData.length > 0) data.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    if (headers.length > 0) {
        ws['!cols'] = headers.map(() => ({ wch: 20 }));
    }
    XLSX.utils.book_append_sheet(wb, ws, "Anadolu Gençlik Tablosu");
    XLSX.writeFile(wb, `Anadolu_Genclik_Basit_${new Date().toISOString().slice(0, 10)}.xlsx`);

    if (wasMultiDeleteActive) showRowCheckboxes();
}

async function exportToExcelAdvanced() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Anadolu Gençlik Tablosu');
    const table = document.getElementById('dynamicTable');

    const headers = [];
    const headerStyles = [];
    table.querySelectorAll('thead th').forEach(th => {
        if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
        headers.push(th.textContent.trim());
        headerStyles.push({ bg: th.style.backgroundColor || '#2c3e50', text: th.style.color || '#ffffff' });
    });

    if (headers.length === 0) {
        alert("Dışa aktarılacak veri bulunamadı.");
        if (wasMultiDeleteActive) showRowCheckboxes();
        return;
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell, colNumber) => {
        const style = headerStyles[colNumber - 1];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorToARGB(style.bg) } };
        cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: colorToARGB(style.text) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF000000' } }, left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } }, right: { style: 'medium', color: { argb: 'FF000000' } }
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
            cellStyles.push({ bg: td.style.backgroundColor || '#ffffff', text: td.style.color || '#000000' });
        });

        if (rowData.length > 0) {
            const dataRow = worksheet.addRow(rowData);
            dataRow.eachCell((cell, colNumber) => {
                const style = cellStyles[colNumber - 1];
                cell.font = { name: 'Calibri', size: 11, color: { argb: colorToARGB(style.text) } };
                if (style.bg && style.bg !== 'rgb(255, 255, 255)' && style.bg !== '#ffffff' && style.bg !== 'transparent' && style.bg !== '') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorToARGB(style.bg) } };
                }
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = { /* ... (sınır stilleri aynı kalabilir) ... */
                    top: { style: 'thin', color: { argb: 'FFBFBFBF' } }, left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } }, right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
                };
            });
        }
    });
    if (worksheet.getRow(1)) worksheet.getRow(1).height = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Anadolu_Genclik_Renkli_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (wasMultiDeleteActive) showRowCheckboxes();
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
        const namedColorMap = { 'white': 'FFFFFFFF', 'black': 'FF000000' };
        if (namedColorMap[color.toLowerCase()]) return namedColorMap[color.toLowerCase()];
        console.warn("Bilinmeyen renk adı:", color, "Beyaz varsayılıyor.");
        return 'FFFFFFFF';
    }
    return `FF${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function exportToCSV() {
    const wasMultiDeleteActive = isMultiDeleteModeActive;
    if (wasMultiDeleteActive) hideRowCheckboxes();

    const table = document.getElementById('dynamicTable');
    let csv = '';

    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        if (th.classList.contains(CHECKBOX_COLUMN_CLASS)) return;
        headers.push(`"${th.textContent.trim().replace(/"/g, '""')}"`);
    });

    if (headers.length === 0) {
        alert("Dışa aktarılacak veri bulunamadı.");
        if (wasMultiDeleteActive) showRowCheckboxes();
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
    link.download = `Anadolu_Genclik_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (wasMultiDeleteActive) showRowCheckboxes();
}

function toggleMultiDeleteMode() {
    isMultiDeleteModeActive = !isMultiDeleteModeActive;
    const toggleBtn = document.getElementById('toggleMultiDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteSelectedBtn');
    const singleDeleteRowBtn = document.getElementById('singleDeleteRowBtn');
    const addColumnBtn = document.getElementById('addColumnBtn');
    const deleteColumnBtn = document.getElementById('deleteColumnBtn');

    if (isMultiDeleteModeActive) {
        showRowCheckboxes();
        toggleBtn.textContent = '✖️ İptal';
        toggleBtn.classList.remove('btn-info');
        toggleBtn.classList.add('btn-danger');
        confirmBtn.style.display = 'inline-block';
        if (singleDeleteRowBtn) singleDeleteRowBtn.style.display = 'none';
        if (addColumnBtn) addColumnBtn.disabled = true;
        if (deleteColumnBtn) deleteColumnBtn.disabled = true;
        clearSelection(false);
        updateSelectionInfo('Çoklu satır silme modu aktif. Satırları seçip onaylayın.');
    } else {
        hideRowCheckboxes();
        toggleBtn.textContent = '🔪 Çoklu Silme';
        toggleBtn.classList.remove('btn-danger');
        toggleBtn.classList.add('btn-info');
        confirmBtn.style.display = 'none';
        if (singleDeleteRowBtn) singleDeleteRowBtn.style.display = 'inline-block';
        if (addColumnBtn) addColumnBtn.disabled = false;
        if (deleteColumnBtn) deleteColumnBtn.disabled = false;
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
        // th.innerHTML = '<input type="checkbox" onclick="toggleSelectAllRows(this)" title="Tümünü Seç/Kaldır">';
        th.style.width = '40px';
        th.style.background = '#34495e';
        th.style.textAlign = 'center';
        theadTr.insertBefore(th, theadTr.firstChild);
    }

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
    updateStats();
}

function hideRowCheckboxes() {
    const table = document.getElementById('dynamicTable');
    table.querySelectorAll(`.${CHECKBOX_COLUMN_CLASS}`).forEach(cell => cell.remove());
    updateStats();
}

function confirmDeleteSelectedRows() {
    const tbody = document.getElementById('dynamicTable').querySelector('tbody');
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

        isMultiDeleteModeActive = false;
        hideRowCheckboxes();

        const toggleBtn = document.getElementById('toggleMultiDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteSelectedBtn');
        const singleDeleteRowBtn = document.getElementById('singleDeleteRowBtn');
        const addColumnBtn = document.getElementById('addColumnBtn');
        const deleteColumnBtn = document.getElementById('deleteColumnBtn');

        toggleBtn.textContent = '🔪 Çoklu Silme';
        toggleBtn.classList.remove('btn-danger');
        toggleBtn.classList.add('btn-info');
        confirmBtn.style.display = 'none';
        if (singleDeleteRowBtn) singleDeleteRowBtn.style.display = 'inline-block';
        if (addColumnBtn) addColumnBtn.disabled = false;
        if (deleteColumnBtn) deleteColumnBtn.disabled = false;

        updateStats();
        updateRowNumbers();
        updateSelectionInfo(null);
        updateColumnClickEvents();
    }
}
const originalOnload = window.onload;
window.onload = function () {
    if (originalOnload) {
        originalOnload();
    }
    updateFixedElementLayout();
    updateStats();
    updateColumnClickEvents();
    updateRowNumbers();
    const addColumnBtn = document.getElementById('addColumnBtn');
    const deleteColumnBtn = document.getElementById('deleteColumnBtn');
    if (addColumnBtn) addColumnBtn.disabled = false;
    if (deleteColumnBtn) deleteColumnBtn.disabled = false;
}
window.addEventListener('resize', updateFixedElementLayout);