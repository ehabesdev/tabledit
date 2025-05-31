let currentWorkbook = null;
let convertedData = null;
let currentFileName = '';

const uploadArea = document.querySelector('.upload-area');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});

function back() {
    window.location.href = 'index.html';
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    uploadArea.classList.add('dragover');
}

function unhighlight() {
    uploadArea.classList.remove('dragover');
}

uploadArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];
    currentFileName = file.name.replace(/\.[^/.]+$/, "");

    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel', 'text/csv'];
    const validExtensions = ['.xlsx', '.xls', '.csv'];

    if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        showError('Lütfen geçerli bir Excel dosyası (.xlsx, .xls) veya CSV dosyası seçin.');
        return;
    }

    showLoading(true);
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            currentWorkbook = XLSX.read(data, { type: 'array' });

            displayFileInfo(file, currentWorkbook);
            setupSheetSelector(currentWorkbook);
            showLoading(false);

        } catch (error) {
            showError('Dosya okuma hatası: ' + error.message);
            showLoading(false);
        }
    };

    reader.onerror = function () {
        showError('Dosya okuma sırasında bir hata oluştu.');
        showLoading(false);
    };

    reader.readAsArrayBuffer(file);
}

function displayFileInfo(file, workbook) {
    const fileInfo = document.getElementById('fileInfo');
    const sheetCount = workbook.SheetNames.length;

    fileInfo.innerHTML = `
                <strong>📄 ${file.name}</strong><br>
                📏 Boyut: ${(file.size / 1024).toFixed(2)} KB<br>
                📋 Sayfa Sayısı: ${sheetCount}
            `;
    fileInfo.style.display = 'block';
}

function setupSheetSelector(workbook) {
    const sheetSelector = document.getElementById('sheetSelector');
    const formatSelector = document.getElementById('formatSelector');
    const sheetSelect = document.getElementById('sheetSelect');
    const convertBtn = document.getElementById('convertBtn');

    sheetSelect.innerHTML = '';

    workbook.SheetNames.forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        sheetSelect.appendChild(option);
    });

    sheetSelector.style.display = 'block';
    formatSelector.style.display = 'block';
    convertBtn.disabled = false;
    hideMessages();
}

function convertToJSON() {
    if (!currentWorkbook) {
        showError('Lütfen önce bir dosya seçin.');
        return;
    }

    const selectedSheet = document.getElementById('sheetSelect').value;
    const formatType = document.getElementById('formatSelect').value;
    showLoading(true);

    try {
        const worksheet = currentWorkbook.Sheets[selectedSheet];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false
        });

        const filteredData = jsonData.filter(row => row.some(cell => cell !== ""));

        if (filteredData.length === 0) {
            showError('Seçilen sayfada veri bulunamadı.');
            showLoading(false);
            return;
        }

        if (formatType === 'agd') {
            const headers = filteredData[0];
            const dataRows = filteredData.slice(1);

            convertedData = {
                headers: headers.map(header => ({
                    text: header || 'Sütun',
                    style: {
                        backgroundColor: '#2c3e50',
                        color: '#ffffff'
                    }
                })),
                rows: dataRows.map(row =>
                    row.map((cell, index) => ({
                        text: cell || "",
                        style: {
                            backgroundColor: '',
                            color: '#000000',
                            isReadonly: index === 0 && (headers[0] || '').toLowerCase().includes('id')
                        }
                    }))
                )
            };
        } else {
            const headers = filteredData[0];
            const dataRows = filteredData.slice(1);

            convertedData = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header || `Column_${index + 1}`] = row[index] || "";
                });
                return obj;
            });
        }

        displayPreview(convertedData);
        showSuccess(`✅ ${formatType === 'agd' ? 'AGD formatında' : 'Standart formatda'} ${formatType === 'agd' ? convertedData.rows.length : convertedData.length} satır başarıyla dönüştürüldü!`);
        document.getElementById('downloadBtn').style.display = 'inline-block';
        showLoading(false);

    } catch (error) {
        showError('Dönüştürme hatası: ' + error.message);
        showLoading(false);
    }
}

function displayPreview(data) {
    const preview = document.getElementById('preview');
    const previewContent = document.getElementById('previewContent');

    let previewData;
    let recordCount;

    if (data.headers) {
        previewData = {
            headers: data.headers.slice(0, 3),
            rows: data.rows.slice(0, 3)
        };
        recordCount = data.rows.length;
    } else {
        previewData = data.slice(0, 3);
        recordCount = data.length;
    }

    previewContent.textContent = JSON.stringify(previewData, null, 2);

    if (recordCount > 3) {
        previewContent.textContent += `\n\n... ve ${recordCount - 3} kayıt daha`;
    }

    preview.style.display = 'block';
}

function downloadJSON() {
    if (!convertedData) {
        showError('Dönüştürülecek veri yok.');
        return;
    }

    const formatType = document.getElementById('formatSelect').value;
    const jsonString = JSON.stringify(convertedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const suffix = formatType === 'agd' ? '_agd_format' : '_standard_format';
    a.download = `${currentFileName}${suffix}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showSuccess('✅ JSON dosyası başarıyla indirildi!');
}

function resetApp() {
    currentWorkbook = null;
    convertedData = null;
    currentFileName = '';

    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('sheetSelector').style.display = 'none';
    document.getElementById('formatSelector').style.display = 'none';
    document.getElementById('preview').style.display = 'none';
    document.getElementById('convertBtn').disabled = true;
    document.getElementById('downloadBtn').style.display = 'none';

    hideMessages();
    showLoading(false);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}