<<<<<<< HEAD
// frontend/src/firebase.js
=======
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
<<<<<<< HEAD
  signInWithRedirect, 
  getRedirectResult, 
=======
  signInWithPopup,  // ← Using POPUP instead of redirect
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';

<<<<<<< HEAD
=======
// Firebase Configuration
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
<<<<<<< HEAD
=======
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
};

console.log('🔥 [FIREBASE] Initializing...');

<<<<<<< HEAD
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Set persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('🔥 [FIREBASE] Persistence set'))
  .catch((error) => console.error('🔥 [FIREBASE] Persistence error:', error));

/**
 * Sign in with Google using REDIRECT (works in Hugging Face Spaces)
 */
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 [SIGNIN] Starting redirect sign-in...');
    await signInWithRedirect(auth, provider);
    // User will be redirected to Google, then back to your app
  } catch (error) {
    console.error('🔐 [SIGNIN] Redirect failed:', error);
    
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domain not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in not enabled in Firebase Console.');
    } else {
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }
};

/**
 * Check for redirect result on page load
 */
export const checkRedirectResult = async () => {
  try {
    console.log('🔐 [REDIRECT] Checking for redirect result...');
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log('✅ [REDIRECT] Sign-in successful:', result.user.email);
      return result.user;
    } else {
      console.log('ℹ️ [REDIRECT] No redirect result');
      return null;
    }
  } catch (error) {
    console.error('❌ [REDIRECT] Error:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const logout = async () => {
  try {
    console.log('🔐 [SIGNOUT] Signing out...');
    await signOut(auth);
    console.log('✅ [SIGNOUT] Success');
  } catch (error) {
    console.error('❌ [SIGNOUT] Failed:', error);
=======
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
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
    throw error;
  }
};

<<<<<<< HEAD
/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('👤 [AUTH] User signed in:', user.email);
      callback(user);
    } else {
      console.log('ℹ️ [AUTH] No user signed in');
      callback(null);
    }
=======
// Auth state change listener helper
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    console.log('🔄 [AUTH STATE] Changed, user:', user ? user.email : 'none');
    callback(user);
>>>>>>> 0788675c3d01576e6262a32ef183063e1f388de2
  });
};

export { auth };