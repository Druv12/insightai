import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6tyG7RSVE-UBBmgQUzfSHBTd4EozWVqM",
  authDomain: "insightai-app-v2.firebaseapp.com",
  projectId: "insightai-app-v2",
  storageBucket: "insightai-app-v2.firebasestorage.app",
  messagingSenderId: "265470276222",
  appId: "1:265470276222:web:bf6d6de264c145eb2b1e2f",
  measurementId: "G-KG6VZSV4E3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Provider with custom parameters
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google (POPUP with error handling)
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 [FIREBASE] Starting Google sign-in...');
    
    // Use popup with explicit error handling
    const result = await signInWithPopup(auth, provider);
    
    console.log('✅ [FIREBASE] Sign-in successful:', result.user.email);
    return result.user;
    
  } catch (error) {
    console.error('❌ [FIREBASE] Sign-in error:', error.code, error.message);
    
    // Handle specific errors
    if (error.code === 'auth/popup-blocked') {
      alert('Popup was blocked by browser. Please allow popups for this site.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.log('User closed the popup');
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.log('Popup request cancelled');
    } else {
      alert('Sign-in failed: ' + error.message);
    }
    
    throw error;
  }
};

// Logout
export const logout = () => {
  console.log('🚪 [FIREBASE] Logging out...');
  return signOut(auth);
};

// Auth state listener
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export { auth };
