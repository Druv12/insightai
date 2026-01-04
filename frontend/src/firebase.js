import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDvtJPLMF2DZLXp-W78M1zsQFFSFV-X8NU",
  authDomain: "insightai-analytics.firebaseapp.com",
  projectId: "insightai-analytics",
  storageBucket: "insightai-analytics.firebasestorage.app",
  messagingSenderId: "95590325924",
  appId: "1:95590325924:web:274612d642d53657811031",
  measurementId: "G-F8DT6XKSN7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign Out
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export { auth };