// frontend/src/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

console.log('🔥 [FIREBASE] Initializing...');

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
    throw error;
  }
};

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
  });
};

export { auth };