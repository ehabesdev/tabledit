import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
  app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);
} catch (error) {

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

let isOnline = navigator.onLine;
let connectionStatus = 'checking';

const checkFirebaseConnection = async () => {
  try {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      connectionStatus = 'connected';
              if (user) {
      }
      unsubscribe();
    });
    
    setTimeout(() => {
      if (connectionStatus === 'checking') {
        connectionStatus = 'timeout';

      }
    }, 10000);
    
  } catch (error) {
    connectionStatus = 'error';

  }
};

window.addEventListener('online', () => {
  isOnline = true;

  checkFirebaseConnection();
});

window.addEventListener('offline', () => {
  isOnline = false;

});

export const getConnectionStatus = () => ({
  isOnline,
  firebase: connectionStatus
});

const errorMessageMap = {
  'auth/network-request-failed': 'İnternet bağlantınızı kontrol edin',
  'auth/too-many-requests': 'Çok fazla deneme. Lütfen biraz bekleyin',
  'firestore/unavailable': 'Veritabanı geçici olarak kullanılamıyor',
  'firestore/permission-denied': 'Bu işlem için yetkiniz yok',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda',
  'auth/weak-password': 'Şifre çok zayıf',
  'auth/invalid-email': 'Geçersiz e-posta adresi',
  'auth/user-not-found': 'Kullanıcı bulunamadı',
  'auth/wrong-password': 'Hatalı şifre'
};

window.addEventListener('unhandledrejection', event => {
  if (event.reason?.code?.startsWith('auth/') || 
      event.reason?.code?.startsWith('firestore/')) {
    
    const errorCode = event.reason.code;
    const userMessage = errorMessageMap[errorCode];
    
    console.error('🔥 Firebase Error:', {
      code: errorCode,
      message: event.reason.message,
      userMessage: userMessage,
      timestamp: new Date().toISOString()
    });
    
    if (userMessage && !event.reason.handled) {

      event.reason.handled = true;
    }
  }
});

auth.onAuthStateChanged((user) => {
  if (user && !user.emailVerified) {

  }
});

checkFirebaseConnection();

export { auth, db, securityConfig };