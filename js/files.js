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
    searchUserFiles,
    batchDeleteFiles,
    duplicateUserFile,
    exportUserFileAsJSON,
    syncOfflineChanges,
    initializeOfflineSupport
} from './user-manager.js';

let currentFiles = [];
let currentViewMode = 'grid';
let selectedFileId = null;
let selectedFiles = new Set();
let searchTimeout = null;
let authModule = null;
let isLoadingFiles = false;
let lastRefreshTime = null;
let uploadProgress = new Map();
let fileOperationsQueue = [];
let isProcessingQueue = false;
let connectionStatus = 'online';
let autoRefreshInterval = null;
let realTimeUpdates = true;

const CACHE_DURATION = 300000;
const MAX_UPLOAD_SIZE = 1048576;
const SUPPORTED_FORMATS = ['.xlsx', '.xls', '.csv', '.json'];
const BATCH_SIZE = 10;

async function loadAuthModule() {
    if (!authModule) {
        try {
            authModule = await import('./auth.js');
            return true;
        } catch (error) {

            return false;
        }
    }
    return true;
}

function initializeFilesPage() {
    setupEventListeners();
    initializeAuth();
    initializeConnectionMonitoring();
    setupAutoRefresh();
    
    if (typeof initializeOfflineSupport === 'function') {
        initializeOfflineSupport();
    }
    
    setTimeout(() => {
        loadFiles();
    }, 1000);
    
    initializeDropZone();
    restoreViewMode();
    setupKeyboardShortcuts();
    createImprovedUI();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    window.addEventListener('focus', () => {
        if (realTimeUpdates && !isLoadingFiles) {
            loadFiles();
        }
    });
    

}

function initializeConnectionMonitoring() {
    function updateConnectionStatus() {
        const oldStatus = connectionStatus;
        connectionStatus = navigator.onLine ? 'online' : 'offline';
        
        if (oldStatus !== connectionStatus) {
            updateConnectionIndicator();
            
            if (connectionStatus === 'online') {
                showSuccess('Bağlantı yeniden kuruldu');
                if (realTimeUpdates) {
                    loadFiles();
                }
            } else {
                showError('Bağlantı kesildi - offline modda çalışılıyor');
            }
        }
    }
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    setInterval(updateConnectionStatus, 5000);
    updateConnectionStatus();
}

function setupAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (realTimeUpdates && connectionStatus === 'online' && !isLoadingFiles) {
            loadFiles(false);
        }
    }, 30000);
}

function createImprovedUI() {
    const filesToolbar = document.querySelector('.files-toolbar');
    if (!filesToolbar) return;
    
    const connectionIndicator = document.createElement('div');
    connectionIndicator.id = 'connectionIndicator';
    connectionIndicator.className = 'connection-status';
    
    const realTimeToggle = document.createElement('div');
    realTimeToggle.className = 'realtime-toggle';
    realTimeToggle.innerHTML = `
        <label class="toggle-switch">
            <input type="checkbox" id="realtimeToggle" ${realTimeUpdates ? 'checked' : ''}>
            <span class="slider"></span>
            <span class="toggle-label">Otomatik Yenile</span>
        </label>
    `;
    
    const toolbarRight = filesToolbar.querySelector('.toolbar-right');
    if (toolbarRight) {
        toolbarRight.appendChild(connectionIndicator);
        toolbarRight.appendChild(realTimeToggle);
    }
    
    const realtimeToggleInput = document.getElementById('realtimeToggle');
    if (realtimeToggleInput) {
        realtimeToggleInput.addEventListener('change', (e) => {
            realTimeUpdates = e.target.checked;
            if (realTimeUpdates) {
                setupAutoRefresh();
                showSuccess('Otomatik yenileme açıldı');
            } else {
                clearInterval(autoRefreshInterval);
                showSuccess('Otomatik yenileme kapatıldı');
            }
        });
    }
    
    updateConnectionIndicator();
    addImprovedStyles();
}

function updateConnectionIndicator() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;
    
    indicator.className = `connection-status ${connectionStatus}`;
    indicator.innerHTML = connectionStatus === 'online' 
        ? '<span class="status-dot online"></span>Çevrimiçi'
        : '<span class="status-dot offline"></span>Çevrimdışı';
}

function addImprovedStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .connection-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #dee2e6;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .status-dot.online {
            background: #27ae60;
            box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
            animation: pulse 2s infinite;
        }
        .status-dot.offline {
            background: #e74c3c;
            box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
        }
        
        .realtime-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .toggle-switch {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .toggle-switch input {
            width: 40px;
            height: 20px;
            border-radius: 10px;
            border: 2px solid #ddd;
            background: #fff;
            appearance: none;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }
        .toggle-switch input:checked {
            background: #3498db;
            border-color: #3498db;
        }
        .toggle-switch input::before {
            content: '';
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ddd;
            top: 1px;
            left: 1px;
            transition: all 0.3s ease;
        }
        .toggle-switch input:checked::before {
            background: white;
            transform: translateX(20px);
        }
        .toggle-label {
            font-size: 12px;
            font-weight: 500;
            color: #666;
        }
        
        .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        
        .file-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #e9ecef;
            border-radius: 16px;
            padding: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .file-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border-color: #3498db;
        }
        
        .file-card.selected {
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
            background: linear-gradient(135deg, #ebf3fd 0%, #f8f9fa 100%);
        }
        
        .file-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 16px 8px;
        }
        
        .file-icon {
            font-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-radius: 12px;
            color: white;
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }
        
        .file-selection {
            display: flex;
            align-items: center;
        }
        
        .file-checkbox {
            width: 18px;
            height: 18px;
            border: 2px solid #ddd;
            border-radius: 4px;
            appearance: none;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .file-checkbox:checked {
            background: #3498db;
            border-color: #3498db;
        }
        
        .file-checkbox:checked::after {
            content: '✓';
            position: absolute;
            top: -2px;
            left: 2px;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        .file-content {
            padding: 0 16px 16px;
            cursor: pointer;
        }
        
        .file-name {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .file-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
            color: #7f8c8d;
        }
        
        .file-stats {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        }
        
        .stats-item {
            background: rgba(52, 152, 219, 0.1);
            color: #3498db;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .file-actions {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(248, 249, 250, 0.8);
            border-top: 1px solid #e9ecef;
        }
        
        .file-action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }
        
        .file-action-btn.primary {
            background: #3498db;
            color: white;
        }
        
        .file-action-btn.primary:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        .file-action-btn.secondary {
            background: #95a5a6;
            color: white;
        }
        
        .file-action-btn.secondary:hover {
            background: #7f8c8d;
            transform: translateY(-1px);
        }
        
        .file-action-btn.danger {
            background: #e74c3c;
            color: white;
        }
        
        .file-action-btn.danger:hover {
            background: #c0392b;
            transform: translateY(-1px);
        }
        
        .file-action-btn svg {
            width: 14px;
            height: 14px;
        }
        
        /* Modern Table Styles */
        .files-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .files-table thead {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
        }
        
        .files-table th {
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            border: none;
        }
        
        .files-table th:first-child {
            padding-left: 20px;
        }
        
        .files-table th:last-child {
            padding-right: 20px;
        }
        
        .file-row {
            border-bottom: 1px solid #f1f3f4;
            transition: all 0.2s ease;
        }
        
        .file-row:hover {
            background: #f8f9fa;
        }
        
        .file-row.selected {
            background: #ebf3fd;
            border-color: #3498db;
        }
        
        .files-table td {
            padding: 16px 12px;
            vertical-align: middle;
            border: none;
        }
        
        .files-table td:first-child {
            padding-left: 20px;
        }
        
        .files-table td:last-child {
            padding-right: 20px;
        }
        
        .file-name-cell {
            cursor: pointer;
        }
        
        .file-name-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .file-details {
            min-width: 0;
            flex: 1;
        }
        
        .file-details .file-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        
        .file-stats {
            color: #7f8c8d;
            font-size: 13px;
        }
        
        .file-size, .file-date {
            color: #6c757d;
            font-size: 13px;
        }
        
        .file-actions-cell .file-actions {
            display: flex;
            gap: 6px;
            justify-content: flex-end;
        }
        
        .action-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 8px;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-btn.primary {
            background: #3498db;
            color: white;
        }
        
        .action-btn.primary:hover {
            background: #2980b9;
        }
        
        .action-btn.secondary {
            background: #95a5a6;
            color: white;
        }
        
        .action-btn.secondary:hover {
            background: #7f8c8d;
        }
        
        .action-btn.tertiary {
            background: #f39c12;
            color: white;
        }
        
        .action-btn.tertiary:hover {
            background: #e67e22;
        }
        
        .action-btn.danger {
            background: #e74c3c;
            color: white;
        }
        
        .action-btn.danger:hover {
            background: #c0392b;
        }
        
        .advanced-search-btn {
            background: linear-gradient(135deg, #8e44ad, #9b59b6);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            margin-left: 8px;
            transition: all 0.2s ease;
        }
        
        .advanced-search-btn:hover {
            background: linear-gradient(135deg, #7d3c98, #8e44ad);
            transform: translateY(-1px);
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            z-index: 10000;
        }
        
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-height: 90vh;
            overflow-y: auto;
            max-width: 600px;
            width: 90%;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .modal-body {
            padding: 24px;
        }
        
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px 24px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }
        
        .search-form {
            display: grid;
            gap: 20px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .form-group label {
            font-weight: 600;
            color: #2c3e50;
            font-size: 14px;
        }
        
        .form-group input {
            padding: 10px 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        .size-range, .date-range, .dimension-range {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .size-range input, .date-range input, .dimension-range input {
            flex: 1;
        }
        
        .size-range span, .date-range span {
            font-weight: 600;
            color: #7f8c8d;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn.btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn.btn-primary:hover {
            background: #2980b9;
        }
        
        .btn.btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .btn.btn-secondary:hover {
            background: #7f8c8d;
        }
        
        .btn.btn-tertiary {
            background: #f39c12;
            color: white;
        }
        
        .btn.btn-tertiary:hover {
            background: #e67e22;
        }
        
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        
        /* Animations */
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .files-grid {
                grid-template-columns: 1fr;
                gap: 16px;
                padding: 16px;
            }
            
            .file-card {
                border-radius: 12px;
            }
            
            .file-actions {
                flex-direction: column;
                gap: 6px;
            }
            
            .file-action-btn {
                justify-content: flex-start;
            }
            
            .files-table {
                font-size: 13px;
            }
            
            .files-table th,
            .files-table td {
                padding: 12px 8px;
            }
            
            .file-actions-cell .file-actions {
                flex-direction: column;
                gap: 4px;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .file-card {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border-color: #4a5568;
                color: white;
            }
            
            .file-name {
                color: white;
            }
            
            .files-table {
                background: #2c3e50;
                color: white;
            }
            
            .file-row:hover {
                background: #34495e;
            }
        }
    `;
    
    document.head.appendChild(style);
}

function addEnhancedEmptyStateStyles() {
    const style = document.createElement('style');
    style.id = 'enhanced-empty-styles';
    style.textContent = `
        .improved-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 500px;
            padding: 60px 40px;
            background: linear-gradient(135deg, #ffffff, #f8f9fa);
            border-radius: 20px;
            margin: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            border: 2px dashed #e9ecef;
            position: relative;
            overflow: hidden;
        }

        .improved-empty-state::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 30% 20%, rgba(52, 152, 219, 0.05), transparent 50%),
                       radial-gradient(circle at 70% 80%, rgba(39, 174, 96, 0.05), transparent 50%);
            pointer-events: none;
        }

        .empty-illustration {
            margin-bottom: 40px;
            position: relative;
            z-index: 1;
        }

        .empty-folder-animation {
            position: relative;
            width: 120px;
            height: 100px;
            margin: 0 auto;
        }

        .folder-base {
            width: 100px;
            height: 80px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-radius: 8px 8px 6px 6px;
            position: absolute;
            bottom: 0;
            left: 10px;
            box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
            animation: float 3s ease-in-out infinite;
        }

        .folder-flap {
            width: 40px;
            height: 20px;
            background: linear-gradient(135deg, #2980b9, #1f618d);
            border-radius: 6px 6px 0 0;
            position: absolute;
            top: 0;
            left: 10px;
            animation: float 3s ease-in-out infinite 0.1s;
        }

        .folder-documents {
            position: absolute;
            top: 20px;
            right: 0;
        }

        .document {
            width: 20px;
            height: 26px;
            background: white;
            border: 2px solid #ecf0f1;
            border-radius: 2px;
            margin-bottom: 3px;
            position: relative;
            animation: documentFloat 3s ease-in-out infinite;
        }

        .document:nth-child(1) { animation-delay: 0.2s; }
        .document:nth-child(2) { animation-delay: 0.4s; }
        .document:nth-child(3) { animation-delay: 0.6s; }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        @keyframes documentFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
        }

        .auth-animation {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 48px;
        }

        .lock-icon, .key-icon {
            animation: bounce 2s infinite;
        }

        .key-icon {
            animation-delay: 0.5s;
        }

        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }

        .offline-animation {
            position: relative;
            font-size: 48px;
        }

        .wifi-icon {
            position: relative;
            z-index: 2;
        }

        .offline-indicator {
            position: absolute;
            top: -10px;
            right: -10px;
            font-size: 24px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
        }

        .error-animation {
            position: relative;
            font-size: 48px;
        }

        .error-icon {
            position: relative;
            z-index: 2;
            animation: shake 2s infinite;
        }

        .error-pulse {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 60px;
            height: 60px;
            border: 3px solid #e74c3c;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: errorPulse 2s infinite;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes errorPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }

        .empty-content {
            text-align: center;
            max-width: 600px;
            position: relative;
            z-index: 1;
        }

        .empty-content h2 {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #2c3e50, #3498db);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .empty-content p {
            font-size: 16px;
            color: #6c757d;
            margin-bottom: 32px;
            line-height: 1.6;
        }

        .empty-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 40px;
            flex-wrap: wrap;
        }

        .btn-enhanced {
            padding: 14px 28px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .btn-enhanced::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.6s ease;
        }

        .btn-enhanced:hover::before {
            width: 400px;
            height: 400px;
        }

        .btn-enhanced:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        }

        .btn-enhanced.primary {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }

        .btn-enhanced.success {
            background: linear-gradient(135deg, #27ae60, #229954);
            color: white;
        }

        .btn-enhanced.secondary {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
            color: white;
        }

        .btn-icon {
            font-size: 16px;
            position: relative;
            z-index: 2;
        }

        .empty-features {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 40px;
        }

        .feature {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .feature-icon {
            font-size: 24px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            animation: featureFloat 4s ease-in-out infinite;
        }

        .feature:nth-child(1) .feature-icon { animation-delay: 0s; }
        .feature:nth-child(2) .feature-icon { animation-delay: 1s; }
        .feature:nth-child(3) .feature-icon { animation-delay: 2s; }

        @keyframes featureFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }

        .feature-text {
            font-size: 12px;
            font-weight: 600;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .auth-required {
            border-color: #f39c12;
            background: linear-gradient(135deg, #fef9e7, #fcf3cf);
        }

        .offline-mode {
            border-color: #e74c3c;
            background: linear-gradient(135deg, #fdedec, #fadbd8);
        }

        .error-state {
            border-color: #e74c3c;
            background: linear-gradient(135deg, #fdedec, #fadbd8);
        }

        @media (max-width: 768px) {
            .improved-empty-state {
                padding: 40px 20px;
                min-height: 400px;
                margin: 10px;
            }

            .empty-content h2 {
                font-size: 24px;
            }

            .empty-content p {
                font-size: 14px;
            }

            .empty-actions {
                flex-direction: column;
                align-items: center;
            }

            .btn-enhanced {
                width: 100%;
                max-width: 280px;
                justify-content: center;
            }

            .empty-features {
                gap: 20px;
            }

            .feature-text {
                font-size: 10px;
            }
        }
    `;
    document.head.appendChild(style);
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
            clearFileSelection();
        }
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        if (event.ctrlKey && event.key === 'a') {
            if (event.target.closest('.files-container')) {
                event.preventDefault();
                selectAllFiles();
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        if (uploadProgress.size > 0) {
            return 'Dosya yükleme işlemi devam ediyor. Sayfayı kapatmak istediğinizden emin misiniz?';
        }
    });

    window.addEventListener('online', async () => {
        try {
            const syncedCount = await syncOfflineChanges();
            if (syncedCount > 0) {
                showSuccess(`${syncedCount} offline değişiklik senkronize edildi`);
                await loadFiles();
            }
        } catch (error) {

        }
    });
}

async function initializeAuth() {
    const authLoaded = await loadAuthModule();
    if (authLoaded && authModule) {
        authModule.initializeAuth();
        
        if (auth && auth.onAuthStateChanged) {
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
        } else {
            console.error('Auth sistemi yüklenemedi');
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                userProfile.innerHTML = '<span style="color: red;">Auth Hata</span>';
            }
        }
    }
}

async function loadUserProfile(user) {
    try {
        const userAvatar = document.querySelector('.user-avatar');
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        const displayName = user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
        const initials = displayName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
        
        if (userAvatar) {
            userAvatar.textContent = initials;
        }
        
        userNameElements.forEach(element => {
            element.textContent = displayName;
        });
        
        userEmailElements.forEach(element => {
            element.textContent = user.email || '';
        });
        
        // Make user profile visible
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.classList.add('active');
        }
        
    } catch (error) {
        console.warn('Kullanıcı profili yüklenirken hata:', error);
        // Fallback
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.style.display = 'none';
        }
    }
}

async function checkUserVerificationStatus(userId) {
    try {
        const { checkUserVerificationStatus } = await import('./email-verification.js');
        return await checkUserVerificationStatus(userId);
    } catch (error) {

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

async function loadFiles(showLoading = true) {
    if (isLoadingFiles) return;
    
    try {
        isLoadingFiles = true;
        
        if (showLoading) {
            showLoadingState();
        }
        
        await new Promise(resolve => {
            if (auth.currentUser) {
                resolve();
            } else {
                const unsubscribe = auth.onAuthStateChanged(user => {
                    unsubscribe();
                    resolve();
                });
            }
        });
        
        const user = auth.currentUser;
        if (!user) {

            showImprovedEmptyState('auth');
            return;
        }

        let files = [];
        try {
            files = await getUserFiles();
        } catch (fileError) {
            
            const cachedFiles = loadFromLocalCache();
            if (cachedFiles && cachedFiles.length > 0) {
                files = cachedFiles;
                showSuccess('Cached dosyalar yüklendi');
            } else {
                throw fileError;
            }
        }
        
        if (!files || !Array.isArray(files)) {
            files = [];
        }
        
        const sortedFiles = files.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        const hasNewFiles = JSON.stringify(sortedFiles) !== JSON.stringify(currentFiles);
        currentFiles = sortedFiles;
        
        if (currentFiles.length === 0) {
            showImprovedEmptyState('empty');
        } else {
            hideEmptyState();
            displayFiles(currentFiles);
            
            if (hasNewFiles && !showLoading) {
                showSuccess('Dosyalar güncellendi');
            }
        }
        
        try {
            const stats = await getUserFileStats();
            updateFileStats(stats);
        } catch (statsError) {

            updateFileStats({
                totalFiles: currentFiles.length,
                totalSize: currentFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0)
            });
        }
        
        lastRefreshTime = new Date();
        updateLastRefreshIndicator();
        
    } catch (error) {

        
        if (connectionStatus === 'offline') {
            showError('Offline modda - bağlantı gelince yenilenecek');
            showImprovedEmptyState('offline');
        } else {
            showError(`Dosyalar yüklenirken hata: ${error.message}`);
            showImprovedEmptyState('error');
        }
    } finally {
        const loadingEl = document.getElementById('loadingFiles');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        isLoadingFiles = false;
    }
}

function loadFromLocalCache() {
    try {
        const cached = localStorage.getItem('cached_files');
        if (cached) {
            const files = JSON.parse(cached);
            return Object.values(files).filter(file => {
                const cacheAge = new Date() - new Date(file.cachedAt);
                return cacheAge < 86400000; // 24 hours
            });
        }
    } catch (error) {

    }
    return [];
}

function updateLastRefreshIndicator() {
    const indicator = document.getElementById('lastRefreshIndicator');
    if (!indicator) {
        const toolbar = document.querySelector('.files-toolbar .toolbar-left');
        if (toolbar) {
            const refreshIndicator = document.createElement('div');
            refreshIndicator.id = 'lastRefreshIndicator';
            refreshIndicator.className = 'refresh-indicator';
            toolbar.appendChild(refreshIndicator);
        }
        return;
    }
    
    if (lastRefreshTime) {
        const timeAgo = formatTimeAgo(lastRefreshTime);
        indicator.innerHTML = `🔄 ${timeAgo} güncellendi`;
        indicator.title = `Son güncelleme: ${lastRefreshTime.toLocaleString('tr-TR')}`;
    }
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
    if (diffDays < 7) return `${diffDays - 1} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
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
    setTimeout(() => {
        if (!files || files.length === 0) {
            showImprovedEmptyState('empty');
            return;
        }
        
        hideEmptyState();
        
        if (currentViewMode === 'grid') {
            displayFilesGrid(files);
        } else {
            displayFilesList(files);
        }
        
        updateSelectionUI();
    }, 100);
}

function showImprovedEmptyState(type = 'empty') {
    const container = document.querySelector('.files-container');
    if (!container) {
        return;
    }
    
    let content = '';
    
    switch (type) {
        case 'empty':
            content = `
                <div class="improved-empty-state">
                    <div class="empty-illustration">
                        <div class="empty-folder-animation">
                            <div class="folder-base"></div>
                            <div class="folder-flap"></div>
                            <div class="folder-documents">
                                <div class="document"></div>
                                <div class="document"></div>
                                <div class="document"></div>
                            </div>
                        </div>
                    </div>
                    <div class="empty-content">
                        <h2>Dosyalarınız burada görünecek</h2>
                        <p>Henüz hiç dosyanız bulunmuyor. İlk dosyanızı oluşturmaya başlayın!</p>
                        <div class="empty-actions">
                            <button class="btn-enhanced primary" onclick="createNewFile()">
                                <span class="btn-icon">📄</span>
                                Yeni Dosya Oluştur
                            </button>
                            <button class="btn-enhanced success" onclick="showUploadModal()">
                                <span class="btn-icon">📤</span>
                                Excel Dosyası Yükle
                            </button>
                        </div>
                        <div class="empty-features">
                            <div class="feature">
                                <div class="feature-icon">⚡</div>
                                <div class="feature-text">Otomatik Kayıt</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">🔄</div>
                                <div class="feature-text">Real-time Sync</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">📱</div>
                                <div class="feature-text">Cross Platform</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'auth':
            content = `
                <div class="improved-empty-state auth-required">
                    <div class="empty-illustration">
                        <div class="auth-animation">
                            <div class="lock-icon">🔒</div>
                            <div class="key-icon">🔑</div>
                        </div>
                    </div>
                    <div class="empty-content">
                        <h2>Giriş Gerekli</h2>
                        <p>Dosyalarınızı görüntülemek için giriş yapmanız gerekiyor.</p>
                        <div class="empty-actions">
                            <button class="btn-enhanced primary" onclick="goToMainPage()">
                                <span class="btn-icon">🏠</span>
                                Ana Sayfaya Git
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'offline':
            content = `
                <div class="improved-empty-state offline-mode">
                    <div class="empty-illustration">
                        <div class="offline-animation">
                            <div class="wifi-icon offline">📶</div>
                            <div class="offline-indicator">❌</div>
                        </div>
                    </div>
                    <div class="empty-content">
                        <h2>Offline Modda</h2>
                        <p>İnternet bağlantınız kesilmiş. Bağlantı gelince dosyalarınız yüklenecek.</p>
                        <div class="empty-actions">
                            <button class="btn-enhanced primary" onclick="loadFiles(true)">
                                <span class="btn-icon">🔄</span>
                                Tekrar Dene
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'error':
            content = `
                <div class="improved-empty-state error-state">
                    <div class="empty-illustration">
                        <div class="error-animation">
                            <div class="error-icon">⚠️</div>
                            <div class="error-pulse"></div>
                        </div>
                    </div>
                    <div class="empty-content">
                        <h2>Bir Hata Oluştu</h2>
                        <p>Dosyalar yüklenirken bir sorun yaşandı. Lütfen tekrar deneyin.</p>
                        <div class="empty-actions">
                            <button class="btn-enhanced primary" onclick="loadFiles(true)">
                                <span class="btn-icon">🔄</span>
                                Yeniden Yükle
                            </button>
                            <button class="btn-enhanced secondary" onclick="window.location.reload()">
                                <span class="btn-icon">🌐</span>
                                Sayfayı Yenile
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
    
    container.innerHTML = content;
    
    if (!document.querySelector('#enhanced-empty-styles')) {
        addEnhancedEmptyStateStyles();
    }
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const loadingFiles = document.getElementById('loadingFiles');
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingFiles) loadingFiles.style.display = 'none';
    
    setTimeout(() => {
        const filesGrid = document.getElementById('filesGrid');
        const filesList = document.getElementById('filesList');
        
        if (currentViewMode === 'grid') {
            if (filesGrid) {
                filesGrid.style.display = 'grid';
            }
            if (filesList) filesList.style.display = 'none';
        } else {
            if (filesList) {
                filesList.style.display = 'block';
            }
            if (filesGrid) filesGrid.style.display = 'none';
        }
        
        const container = document.querySelector('.files-container');
        if (container) {
            const existingEmptyState = container.querySelector('.improved-empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
        }
    }, 50);
}

function displayFilesGrid(files) {
    const gridEl = document.getElementById('filesGrid');
    if (!gridEl) {
        const container = document.querySelector('.files-container');
        if (container) {
            let existingGrid = container.querySelector('#filesGrid');
            if (!existingGrid) {
                existingGrid = document.createElement('div');
                existingGrid.id = 'filesGrid';
                existingGrid.className = 'files-grid';
                existingGrid.style.display = 'grid';
                container.appendChild(existingGrid);
                
                setTimeout(() => displayFilesGrid(files), 50);
            }
        }
        return;
    }
    
    gridEl.innerHTML = files.map(file => {
        const fileName = file.fileName || file.name || 'Adsız Dosya';
        return `
            <div class="file-card ${selectedFiles.has(file.id) ? 'selected' : ''}" 
                 data-file-id="${file.id}">
                <div class="file-card-header">
                    <div class="file-icon">📊</div>
                    <div class="file-selection">
                        <input type="checkbox" 
                               class="file-checkbox" 
                               ${selectedFiles.has(file.id) ? 'checked' : ''}
                               onchange="toggleFileSelection('${file.id}')"
                               onclick="event.stopPropagation()">
                    </div>
                </div>
                
                <div class="file-content" onclick="openFileById('${file.id}')">
                    <div class="file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
                    <div class="file-meta">
                        <div class="file-size">📄 ${formatFileSize(file.fileSize)}</div>
                        <div class="file-date">🕒 ${formatDate(file.updatedAt)}</div>
                    </div>
                    <div class="file-stats">
                        <span class="stats-item">${file.rowCount || 0} satır</span>
                        <span class="stats-item">${file.columnCount || 0} sütun</span>
                    </div>
                </div>
                
                <div class="file-actions">
                    <button class="file-action-btn primary" 
                            onclick="event.stopPropagation(); openFileById('${file.id}')" 
                            title="Dosyayı Aç">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        Aç
                    </button>
                    <button class="file-action-btn secondary" 
                            onclick="event.stopPropagation(); downloadSingleFile('${file.id}')" 
                            title="Dosyayı İndir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        İndir
                    </button>
                    <button class="file-action-btn danger" 
                            onclick="event.stopPropagation(); confirmDeleteFile('${file.id}')" 
                            title="Dosyayı Sil">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Sil
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    updateSelectionUI();
}

function displayFilesList(files) {
    const tableBody = document.getElementById('filesTableBody');
    if (!tableBody) {
        const container = document.querySelector('.files-container');
        if (container) {
            let existingList = container.querySelector('#filesList');
            if (!existingList) {
                existingList = document.createElement('div');
                existingList.id = 'filesList';
                existingList.className = 'files-list';
                existingList.innerHTML = `
                    <table class="files-table">
                        <thead>
                            <tr>
                                <th width="30px">
                                    <input type="checkbox" 
                                           id="selectAllFiles" 
                                           onchange="handleSelectAll(this)"
                                           title="Tümünü Seç">
                                </th>
                                <th>Dosya Adı</th>
                                <th width="100px">Boyut</th>
                                <th width="140px">Son Güncelleme</th>
                                <th width="140px">Oluşturma</th>
                                <th width="200px">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="filesTableBody"></tbody>
                    </table>
                `;
                container.appendChild(existingList);
                
                setTimeout(() => displayFilesList(files), 50);
            }
        }
        return;
    }
    
    tableBody.innerHTML = files.map(file => {
        const fileName = file.fileName || file.name || 'Adsız Dosya';
        return `
            <tr data-file-id="${file.id}" 
                class="file-row ${selectedFiles.has(file.id) ? 'selected' : ''}">
                <td>
                    <input type="checkbox" 
                           class="file-checkbox" 
                           ${selectedFiles.has(file.id) ? 'checked' : ''}
                           onchange="toggleFileSelection('${file.id}')"
                           onclick="event.stopPropagation()">
                </td>
                <td class="file-name-cell" onclick="openFileById('${file.id}')">
                    <div class="file-name-content">
                        <div class="file-icon">📊</div>
                        <div class="file-details">
                            <div class="file-name">${escapeHtml(fileName)}</div>
                            <small class="file-stats">${file.rowCount || 0} satır • ${file.columnCount || 0} sütun</small>
                        </div>
                    </div>
                </td>
                <td class="file-size">${formatFileSize(file.fileSize)}</td>
                <td class="file-date">${formatDate(file.updatedAt)}</td>
                <td class="file-date">${formatDate(file.createdAt)}</td>
                <td class="file-actions-cell">
                    <div class="file-actions">
                        <button class="action-btn primary" 
                                onclick="event.stopPropagation(); openFileById('${file.id}')" 
                                title="Dosyayı Aç">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            Aç
                        </button>
                        <button class="action-btn secondary" 
                                onclick="event.stopPropagation(); downloadSingleFile('${file.id}')" 
                                title="Dosyayı İndir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                            İndir
                        </button>
                        <button class="action-btn danger" 
                                onclick="event.stopPropagation(); confirmDeleteFile('${file.id}')" 
                                title="Dosyayı Sil">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Sil
                        </button>
                        <button class="action-btn tertiary" 
                                onclick="event.stopPropagation(); showRenameModal('${file.id}')" 
                                title="Yeniden Adlandır">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Düzenle
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateSelectionUI();
}

function handleFileClick(fileId, event) {
    if (event.ctrlKey || event.metaKey) {
        toggleFileSelection(fileId);
    } else if (event.shiftKey && selectedFiles.size > 0) {
        selectFileRange(fileId);
    } else {
        if (selectedFiles.size <= 1) {
            openFileById(fileId);
        } else {
            clearFileSelection();
            toggleFileSelection(fileId);
        }
    }
}

function toggleFileSelection(fileId) {
    if (selectedFiles.has(fileId)) {
        selectedFiles.delete(fileId);
    } else {
        selectedFiles.add(fileId);
    }
    updateSelectionUI();
}

function selectFileRange(endFileId) {
    const fileIds = currentFiles.map(f => f.id);
    const lastSelected = Array.from(selectedFiles).pop();
    const startIndex = fileIds.indexOf(lastSelected);
    const endIndex = fileIds.indexOf(endFileId);
    
    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);
    
    for (let i = rangeStart; i <= rangeEnd; i++) {
        selectedFiles.add(fileIds[i]);
    }
    
    updateSelectionUI();
}

function selectAllFiles() {
    currentFiles.forEach(file => selectedFiles.add(file.id));
    updateSelectionUI();
}

function clearFileSelection() {
    selectedFiles.clear();
    updateSelectionUI();
}

function updateSelectionUI() {
    const selectedCount = selectedFiles.size;
    const totalCount = currentFiles.length;
    
    document.querySelectorAll('.file-card').forEach(card => {
        const fileId = card.dataset.fileId;
        const isSelected = selectedFiles.has(fileId);
        
        card.classList.toggle('selected', isSelected);
    });
    
    document.querySelectorAll('tr[data-file-id]').forEach(row => {
        const fileId = row.dataset.fileId;
        row.classList.toggle('selected', selectedFiles.has(fileId));
    });
    
    updateBulkActionToolbar(selectedCount, totalCount);
}

function updateBulkActionToolbar(selectedCount, totalCount) {
    let toolbar = document.getElementById('bulkActionToolbar');
    
    if (selectedCount > 1) {
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'bulkActionToolbar';
            toolbar.className = 'bulk-action-toolbar';
            
            const container = document.querySelector('.files-container');
            if (container) {
                container.insertBefore(toolbar, container.firstChild);
            }
        }
        
        toolbar.innerHTML = `
            <div class="bulk-actions">
                <span class="selection-count">${selectedCount} dosya seçili</span>
                <button class="btn btn-secondary" onclick="clearFileSelection()">Seçimi Temizle</button>
                <button class="btn btn-danger" onclick="confirmBulkDelete()">Seçilenleri Sil</button>
                <button class="btn btn-primary" onclick="bulkDownload()">Toplu İndir</button>
            </div>
        `;
        
        toolbar.style.display = 'block';
    } else {
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }
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
                displayFiles(Array.from(currentFiles.values()));
            }
        } catch (error) {

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
    
    displayFiles(Array.from(currentFiles.values()));
    localStorage.setItem('filesViewMode', mode);
}

function restoreViewMode() {
    const savedMode = localStorage.getItem('filesViewMode');
    if (savedMode && ['grid', 'list'].includes(savedMode)) {
        setViewMode(savedMode);
    }
}

function sortFiles(sortBy) {
    const [field, direction] = sortBy.split('-');
    
    const sortedFiles = [...currentFiles.values()].sort((a, b) => {
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
    const file = currentFiles.get(fileId);
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

        showError('Dosya indirilirken hata oluştu: ' + error.message);
    }
}

async function bulkDownload() {
    try {
        if (selectedFiles.size === 0) return;
        
        showLoadingMessage('Dosyalar hazırlanıyor...');
        
        const selectedFilesList = Array.from(selectedFiles);
        const exportData = {
            exportedAt: new Date().toISOString(),
            fileCount: selectedFilesList.length,
            files: []
        };
        
        for (const fileId of selectedFilesList) {
            try {
                const fileData = await loadUserFile(fileId);
                exportData.files.push({
                    name: fileData.name,
                    data: fileData.data,
                    metadata: {
                        createdAt: fileData.createdAt,
                        updatedAt: fileData.updatedAt,
                        version: fileData.version
                    }
                });
            } catch (error) {

            }
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Tabledit_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoadingMessage();
        showSuccess(`${exportData.files.length} dosya başarıyla indirildi`);
        
    } catch (error) {

        showError('Dosyalar indirilirken hata oluştu: ' + error.message);
        hideLoadingMessage();
    }
}

function renameFile() {
    const file = currentFiles.find(f => f.id === selectedFileId);
    if (!file) return;
    
    const fileName = file.fileName || file.name || '';
    document.getElementById('newFileName').value = fileName;
    
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
        
        showLoadingMessage('Dosya adı değiştiriliyor...');
        const fileData = await loadUserFile(selectedFileId);
        await updateUserFile(selectedFileId, newName, fileData.data);
        
        closeRenameModal();
        await loadFiles();
        hideLoadingMessage();
        showSuccess('Dosya adı başarıyla değiştirildi');
        
    } catch (error) {
        hideLoadingMessage();
        showError('Dosya adı değiştirilirken hata oluştu: ' + error.message);
    }
}

async function confirmDeleteFile(fileId) {
    if (!fileId) fileId = selectedFileId;
    if (!fileId) return;
    
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const fileName = file.fileName || file.name || 'Dosya';
    
    if (confirm(`"${fileName}" dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
        try {
            showLoadingMessage('Dosya siliniyor...');
            await deleteUserFile(fileId);
            await loadFiles();
            hideLoadingMessage();
            showSuccess('Dosya başarıyla silindi');
            
            if (selectedFileId === fileId) {
                closeFileActionsModal();
            }
            
            selectedFiles.delete(fileId);
            
        } catch (error) {
            hideLoadingMessage();
            showError('Dosya silinirken hata oluştu: ' + error.message);
        }
    }
}

async function confirmBulkDelete() {
    if (selectedFiles.size === 0) return;
    
    const selectedCount = selectedFiles.size;
    if (confirm(`${selectedCount} dosyayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
        try {
            showLoadingMessage('Dosyalar siliniyor...');
            
            const fileIds = Array.from(selectedFiles);
            await batchDeleteFiles(fileIds);
            
            clearFileSelection();
            await loadFiles();
            hideLoadingMessage();
            showSuccess(`${selectedCount} dosya başarıyla silindi`);
            
        } catch (error) {
            hideLoadingMessage();
            showError('Dosyalar silinirken hata oluştu: ' + error.message);
        }
    }
}

function initializeDropZone() {
    const dropZone = document.body;
    
    let dragCounter = 0;
    
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        showDropOverlay();
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            hideDropOverlay();
        }
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        hideDropOverlay();
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processMultipleFiles(files);
        }
    });
}

function showDropOverlay() {
    let overlay = document.getElementById('dropOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'dropOverlay';
        overlay.innerHTML = `
            <div class="drop-content">
                <div class="drop-icon">📤</div>
                <h3>Dosyaları buraya bırakın</h3>
                <p>Excel, CSV ve JSON dosyaları desteklenir</p>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(52, 152, 219, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            text-align: center;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .drop-content {
                background: rgba(255, 255, 255, 0.1);
                padding: 60px 40px;
                border-radius: 20px;
                border: 3px dashed rgba(255, 255, 255, 0.5);
            }
            .drop-icon {
                font-size: 80px;
                margin-bottom: 20px;
            }
            .drop-content h3 {
                font-size: 28px;
                margin-bottom: 12px;
                font-weight: 600;
            }
            .drop-content p {
                font-size: 16px;
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideDropOverlay() {
    const overlay = document.getElementById('dropOverlay');
    if (overlay) {
        overlay.style.display = 'none';
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
    processMultipleFiles(files);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        processMultipleFiles(files);
    }
}

async function processMultipleFiles(files) {
    const validFiles = files.filter(file => {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        const isValidFormat = SUPPORTED_FORMATS.includes(extension);
        const isValidSize = file.size <= MAX_UPLOAD_SIZE;
        
        if (!isValidFormat) {
            showError(`${file.name}: Desteklenmeyen dosya formatı`);
            return false;
        }
        
        if (!isValidSize) {
            showError(`${file.name}: Dosya boyutu çok büyük (Maks: 1MB)`);
            return false;
        }
        
        return true;
    });
    
    if (validFiles.length === 0) return;
    
    if (validFiles.length > 10) {
        if (!confirm(`${validFiles.length} dosya yüklenecek. Devam etmek istediğinizden emin misiniz?`)) {
            return;
        }
    }
    
    showLoadingMessage(`${validFiles.length} dosya işleniyor...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of validFiles) {
        try {
            await processUploadedFile(file);
            successCount++;
        } catch (error) {

            errorCount++;
        }
    }
    
    hideLoadingMessage();
    
    if (successCount > 0) {
        await loadFiles();
        showSuccess(`${successCount} dosya başarıyla yüklendi`);
    }
    
    if (errorCount > 0) {
        showError(`${errorCount} dosya yüklenemedi`);
    }
    
    closeUploadModal();
}

async function processUploadedFile(file) {
    try {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        let tableData;
        
        if (extension === '.json') {
            tableData = await processJSONFile(file);
        } else if (['.xlsx', '.xls'].includes(extension)) {
            tableData = await processExcelFile(file);
        } else if (extension === '.csv') {
            tableData = await processCSVFile(file);
        } else {
            throw new Error('Desteklenmeyen dosya formatı');
        }
        
        const fileId = await saveUserTable(fileName, tableData);
        
        return fileId;
        
    } catch (error) {

        throw error;
    }
}

async function processJSONFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.exportFormat && data.exportFormat.includes('tabledit')) {
        return data.data;
    }
    
    throw new Error('Geçersiz JSON formatı');
}

async function processExcelFile(file) {
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
    
    return convertWorksheetToTableData(worksheet);
}

async function processCSVFile(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('CSV dosyası boş');
    }
    
    const headers = lines[0].split(',').map(h => ({
        text: h.trim().replace(/"/g, ''),
        backgroundColor: '#2c3e50',
        color: '#ffffff'
    }));
    
    const rows = lines.slice(1).map(line => ({
        cells: line.split(',').map((cell, index) => ({
            value: cell.trim().replace(/"/g, ''),
            readonly: index === 0,
            backgroundColor: '',
            color: ''
        })),
        styles: {
            backgroundColor: '',
            color: ''
        }
    }));
    
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
            createdAt: new Date().toISOString(),
            rowCount: rows.length,
            columnCount: headers.length
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
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv,.json';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                processMultipleFiles(files);
            }
        };
        input.click();
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
    showSuccess('Dosyalar yenileniyor...');
    loadFiles(true);
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
window.bulkDownload = bulkDownload;
window.renameFile = renameFile;
window.deleteFile = () => confirmDeleteFile(selectedFileId);
window.confirmRename = confirmRename;
window.confirmDeleteFile = confirmDeleteFile;
window.confirmBulkDelete = confirmBulkDelete;
window.clearFileSelection = clearFileSelection;
window.selectAllFiles = selectAllFiles;
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

async function uploadExcelFile(file) {
    try {
        showSuccess('Dosya yükleniyor...');
        
        showSuccess('Dosya yüklemek için ana sayfaya yönlendiriliyorsunuz...');
        
        setTimeout(() => {
            window.location.href = './index.html?upload=true';
        }, 1500);
        
    } catch (error) {

        showError('Dosya yükleme hatası');
    }
}

function handleSelectAll(checkbox) {
    if (checkbox.checked) {
        selectAllFiles();
    } else {
        clearFileSelection();
    }
}

async function downloadSingleFile(fileId) {
    try {
        showLoadingMessage('Dosya indiriliyor...');
        const file = currentFiles.find(f => f.id === fileId);
        if (!file) {
            throw new Error('Dosya bulunamadı');
        }
        
        const fileData = await loadUserFile(fileId);
        const fileName = file.fileName || file.name || 'dosya';
        
        const blob = new Blob([JSON.stringify(fileData.data, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoadingMessage();
        showSuccess('Dosya başarıyla indirildi');
        
    } catch (error) {
        hideLoadingMessage();
        showError('Dosya indirilirken hata oluştu: ' + error.message);
    }
}

function showRenameModal(fileId) {
    selectedFileId = fileId;
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const fileName = file.fileName || file.name || '';
    const newFileNameInput = document.getElementById('newFileName');
    if (newFileNameInput) {
        newFileNameInput.value = fileName;
    }
    
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function initializeAdvancedFeatures() {
    setupAdvancedSearch();
    setupKeyboardShortcuts();
    setupPerformanceMonitoring();
    setupAccessibility();
    setupAdvancedFileOperations();
    setupRealTimeNotifications();
}

function setupAdvancedSearch() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    const advancedSearchBtn = document.createElement('button');
    advancedSearchBtn.className = 'advanced-search-btn';
    advancedSearchBtn.innerHTML = '🔍 Gelişmiş Arama';
    advancedSearchBtn.onclick = showAdvancedSearchModal;
    
    searchContainer.appendChild(advancedSearchBtn);
}

function showAdvancedSearchModal() {
    const modal = document.createElement('div');
    modal.className = 'modal advanced-search-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔍 Gelişmiş Dosya Arama</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="search-form">
                    <div class="form-group">
                        <label>Dosya Adı:</label>
                        <input type="text" id="searchFileName" placeholder="Dosya adında ara...">
                    </div>
                    <div class="form-group">
                        <label>Boyut Aralığı:</label>
                        <div class="size-range">
                            <input type="number" id="minSize" placeholder="Min KB">
                            <span>-</span>
                            <input type="number" id="maxSize" placeholder="Max KB">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tarih Aralığı:</label>
                        <div class="date-range">
                            <input type="date" id="startDate">
                            <span>-</span>
                            <input type="date" id="endDate">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Satır/Sütun Sayısı:</label>
                        <div class="dimension-range">
                            <input type="number" id="minRows" placeholder="Min satır">
                            <input type="number" id="minCols" placeholder="Min sütun">
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">İptal</button>
                <button class="btn btn-primary" onclick="performAdvancedSearch()">Ara</button>
                <button class="btn btn-tertiary" onclick="clearAdvancedSearch()">Temizle</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('show');
}

function performAdvancedSearch() {
    const fileName = document.getElementById('searchFileName')?.value || '';
    const minSize = document.getElementById('minSize')?.value || 0;
    const maxSize = document.getElementById('maxSize')?.value || Infinity;
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const minRows = document.getElementById('minRows')?.value || 0;
    const minCols = document.getElementById('minCols')?.value || 0;
    
    const filteredFiles = currentFiles.filter(file => {
        const nameMatch = !fileName || file.fileName?.toLowerCase().includes(fileName.toLowerCase());
        const sizeMatch = file.fileSize >= (minSize * 1024) && file.fileSize <= (maxSize * 1024);
        
        let dateMatch = true;
        if (startDate) {
            dateMatch = dateMatch && new Date(file.updatedAt) >= new Date(startDate);
        }
        if (endDate) {
            dateMatch = dateMatch && new Date(file.updatedAt) <= new Date(endDate);
        }
        
        const dimensionMatch = (file.rowCount || 0) >= minRows && (file.columnCount || 0) >= minCols;
        
        return nameMatch && sizeMatch && dateMatch && dimensionMatch;
    });
    
    displayFiles(filteredFiles);
    showSuccess(`${filteredFiles.length} dosya bulundu`);
    document.querySelector('.advanced-search-modal').remove();
}

function clearAdvancedSearch() {
    displayFiles(currentFiles);
    document.querySelector('.advanced-search-modal').remove();
    showSuccess('Arama filtreleri temizlendi');
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput')?.focus();
                    break;
                case 'a':
                    e.preventDefault();
                    selectAllFiles();
                    break;
                case 'r':
                    e.preventDefault();
                    loadFiles();
                    break;
                case 'n':
                    e.preventDefault();
                    createNewFile();
                    break;
                case 'u':
                    e.preventDefault();
                    showUploadModal();
                    break;
            }
        }
        
        switch(e.key) {
            case 'Delete':
                if (selectedFiles.size > 0) {
                    e.preventDefault();
                    if (selectedFiles.size === 1) {
                        confirmDeleteFile(Array.from(selectedFiles)[0]);
                    } else {
                        confirmBulkDelete();
                    }
                }
                break;
            case 'F2':
                if (selectedFiles.size === 1) {
                    e.preventDefault();
                    showRenameModal(Array.from(selectedFiles)[0]);
                }
                break;
            case 'Enter':
                if (selectedFiles.size === 1) {
                    e.preventDefault();
                    openFileById(Array.from(selectedFiles)[0]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                clearFileSelection();
                closeAllModals();
                break;
        }
    });
}

function setupPerformanceMonitoring() {
    const performanceData = {
        loadTimes: [],
        searchTimes: [],
        renderTimes: []
    };
    
    window.tableditPerformance = {
        startTimer: (operation) => {
            window[`${operation}StartTime`] = performance.now();
        },
        endTimer: (operation) => {
            const endTime = performance.now();
            const startTime = window[`${operation}StartTime`];
            if (startTime) {
                const duration = endTime - startTime;
                performanceData[`${operation}Times`].push(duration);
                
                if (duration > 1000) {
                    showWarning(`${operation} işlemi ${Math.round(duration)}ms sürdü`);
                }
            }
        },
        getStats: () => performanceData
    };
}

function setupAccessibility() {
    document.querySelectorAll('.file-card, .file-row').forEach(element => {
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });
    
    const announcements = document.createElement('div');
    announcements.setAttribute('aria-live', 'polite');
    announcements.setAttribute('aria-atomic', 'true');
    announcements.className = 'sr-only';
    document.body.appendChild(announcements);
    
    window.announceToScreenReader = (message) => {
        announcements.textContent = message;
        setTimeout(() => announcements.textContent = '', 1000);
    };
}

function setupAdvancedFileOperations() {
    window.duplicateFile = async (fileId) => {
        try {
            showLoadingMessage('Dosya kopyalanıyor...');
            const file = currentFiles.find(f => f.id === fileId);
            if (!file) throw new Error('Dosya bulunamadı');
            
            const fileData = await loadUserFile(fileId);
            const newFileName = `${file.fileName || file.name} - Kopya`;
            
            await saveUserTable(newFileName, fileData.data);
            await loadFiles();
            hideLoadingMessage();
            showSuccess('Dosya başarıyla kopyalandı');
        } catch (error) {
            hideLoadingMessage();
            showError('Dosya kopyalanırken hata oluştu: ' + error.message);
        }
    };
    
    window.createFileFromTemplate = async (templateType) => {
        try {
            showLoadingMessage('Şablon dosyası oluşturuluyor...');
            
            let templateData = [];
            let fileName = 'Yeni Dosya';
            
            switch(templateType) {
                case 'budget':
                    fileName = 'Bütçe Planı';
                    templateData = [
                        ['Kategori', 'Planlanan', 'Gerçekleşen', 'Fark'],
                        ['Gelirler', '', '', '=C2-B2'],
                        ['Giderler', '', '', '=C3-B3'],
                        ['Net', '=B2-B3', '=C2-C3', '=C4-B4']
                    ];
                    break;
                case 'inventory':
                    fileName = 'Envanter Listesi';
                    templateData = [
                        ['Ürün Kodu', 'Ürün Adı', 'Stok Miktarı', 'Birim Fiyat', 'Toplam Değer'],
                        ['', '', '', '', '=C2*D2']
                    ];
                    break;
                case 'schedule':
                    fileName = 'Haftalık Program';
                    templateData = [
                        ['Saat', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
                        ['09:00', '', '', '', '', '', '', ''],
                        ['10:00', '', '', '', '', '', '', ''],
                        ['11:00', '', '', '', '', '', '', '']
                    ];
                    break;
            }
            
            await saveUserTable(fileName, templateData);
            await loadFiles();
            hideLoadingMessage();
            showSuccess('Şablon dosyası oluşturuldu');
        } catch (error) {
            hideLoadingMessage();
            showError('Şablon oluşturulurken hata oluştu: ' + error.message);
        }
    };
}

function setupRealTimeNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    window.sendNotification = (title, body, icon = '📊') => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: icon
            });
        }
    };
    
    const originalLoadFiles = loadFiles;
    loadFiles = async function(...args) {
        const result = await originalLoadFiles.apply(this, args);
        const fileCount = currentFiles.length;
        
        if (fileCount > 0) {
            window.announceToScreenReader?.(`${fileCount} dosya yüklendi`);
        }
        
        return result;
    };
}

function showWarning(message) {
    createToast(message, 'warning');
}

// Initialize page and advanced features
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeFilesPage();
        setTimeout(initializeAdvancedFeatures, 1000);
    });
} else {
    initializeFilesPage();
    setTimeout(initializeAdvancedFeatures, 1000);
}