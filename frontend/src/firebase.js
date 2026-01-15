import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,  // ← Using POPUP instead of redirect
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

console.log('🔥 [FIREBASE] Initializing...');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to LOCAL
console.log('🔒 [FIREBASE] Setting persistence to LOCAL...');
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ [FIREBASE] Persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('❌ [FIREBASE] Persistence setup failed:', error);
  });

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

console.log('✅ [FIREBASE] Initialization complete');

// Google Sign-In with POPUP
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 [SIGNIN] Starting Google sign-in POPUP...');
    console.log('🔐 [SIGNIN] Current URL:', window.location.href);
    
    const result = await signInWithPopup(auth, googleProvider);
    
    if (result.user) {
      console.log('✅ [SIGNIN] Popup sign-in successful!');
      console.log('✅ [SIGNIN] User:', result.user.email);
      console.log('✅ [SIGNIN] UID:', result.user.uid);
      
      // Store authentication data
      const idToken = await result.user.getIdToken();
      localStorage.setItem('authToken', idToken);
      localStorage.setItem('userEmail', result.user.email);
      localStorage.setItem('userId', result.user.uid);
      
      console.log('✅ [SIGNIN] User data stored in localStorage');
      
      return result.user;
    }
    
  } catch (error) {
    console.error('❌ [SIGNIN] Popup sign-in failed:', error);
    console.error('❌ [SIGNIN] Error code:', error.code);
    console.error('❌ [SIGNIN] Error message:', error.message);
    
    // User-friendly error messages
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup blocked by browser. Please allow popups and try again.');
    } else {
      throw error;
    }
  }
};

// Sign Out
export const logout = async () => {
  try {
    console.log('🚪 [LOGOUT] Signing out...');
    
    // Clear all stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    
    await signOut(auth);
    
    console.log('✅ [LOGOUT] Signed out successfully');
  } catch (error) {
    console.error('❌ [LOGOUT] Error:', error);
    throw error;
  }
};

// Auth state change listener helper
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    console.log('🔄 [AUTH STATE] Changed, user:', user ? user.email : 'none');
    callback(user);
  });
};

export { auth };