// Firebase Configuration

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC2hj4HDIvzbPXyCkeIhCMBdMsfg7BpK7Q",
  authDomain: "tabledit.firebaseapp.com",
  projectId: "tabledit",
  storageBucket: "tabledit.firebasestorage.app",
  messagingSenderId: "95580006809",
  appId: "1:95580006809:web:ed118d543ba694c2178b08"
};

let app;
let auth;
let db;

try {
  console.log('🔥 Firebase başlatılıyor...');
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('✅ Firebase başarıyla başlatıldı!');
} catch (error) {
  console.error('❌ Firebase başlatma hatası:', error);
  throw error;
}

const securityConfig = {
  MAX_FILE_SIZE: 1048576,
  MAX_FILES_PER_USER: 50,
  ALLOWED_FILENAME_REGEX: /^[a-zA-Z0-9\s\-_.()]+$/,
  RATE_LIMIT: {
    SAVE_FILE: 10,
    LOAD_FILE: 30,
    DELETE_FILE: 5
  }
};

export { auth, db, securityConfig };

let isOnline = navigator.onLine;
let connectionStatus = 'checking';

const checkFirebaseConnection = async () => {
  try {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      connectionStatus = 'connected';
      console.log('🔥 Firebase Auth bağlantısı aktif');
      if (user) {
        console.log('👤 Kullanıcı oturumu bulundu:', user.email);
      }
      unsubscribe();
    });
    
    setTimeout(() => {
      if (connectionStatus === 'checking') {
        connectionStatus = 'timeout';
        console.warn('⏰ Firebase bağlantısı zaman aşımına uğradı');
      }
    }, 10000);
    
  } catch (error) {
    connectionStatus = 'error';
    console.error('❌ Firebase bağlantı kontrolü hatası:', error);
  }
};

window.addEventListener('online', () => {
  isOnline = true;
  console.log('🌐 İnternet bağlantısı restored');
  checkFirebaseConnection();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('📴 İnternet bağlantısı kesildi');
});

export const getConnectionStatus = () => ({
  isOnline,
  firebase: connectionStatus
});

window.addEventListener('unhandledrejection', event => {
  if (event.reason?.code?.startsWith('auth/') || 
      event.reason?.code?.startsWith('firestore/')) {
    console.error('🔥 Firebase Error:', {
      code: event.reason.code,
      message: event.reason.message,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = getErrorMessage(event.reason.code);
    if (errorMessage) {
      console.log('📢 Kullanıcı hata mesajı:', errorMessage);
    }
  }
});

function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/network-request-failed': 'İnternet bağlantınızı kontrol edin',
    'auth/too-many-requests': 'Çok fazla deneme. Lütfen biraz bekleyin',
    'firestore/unavailable': 'Veritabanı geçici olarak kullanılamıyor',
    'firestore/permission-denied': 'Bu işlem için yetkiniz yok'
  };
  
  return errorMessages[errorCode] || null;
}

checkFirebaseConnection();

console.log('🔥 Firebase Config tamamen yüklendi!');
console.log('📊 Proje bilgileri:');
console.log('  📧 Auth Domain:', firebaseConfig.authDomain);
console.log('  🗂️ Project ID:', firebaseConfig.projectId);
console.log('  🔒 Güvenlik: Production modu aktif');