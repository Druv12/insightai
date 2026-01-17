import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged 
} from 'firebase/auth'

// 🔥 HARDCODED CONFIG FOR HUGGING FACE (REACT_APP env vars don't work)
const firebaseConfig = {
  apiKey: "AIzaSyC6tyG7RSVE-UBBmgQUzfSHBTd4EozWVqM",
  authDomain: "insightai-app-v2.firebaseapp.com",
  projectId: "insightai-app-v2",
  storageBucket: "insightai-app-v2.firebasestorage.app",
  messagingSenderId: "265470276222",
  appId: "1265470276222webbf6d6de264c145eb2b1e2f",
  measurementId: "G-KG6VZSV4E3"
}

console.log('🔥 [FIREBASE] Initializing...')
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Set persistence to LOCAL
console.log('🔥 [FIREBASE] Setting persistence to LOCAL...')
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('🔥 [FIREBASE] Persistence set to LOCAL'))
  .catch(error => console.error('🔥 [FIREBASE] Persistence setup failed', error))

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
console.log('🔥 [FIREBASE] Initialization complete')

// Google Sign-In with POPUP
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 [SIGNIN] Starting Google sign-in POPUP...')
    console.log('🔐 [SIGNIN] Current URL', window.location.href)
    const result = await signInWithPopup(auth, googleProvider)
    if (result.user) {
      console.log('🔐 [SIGNIN] Popup sign-in successful!')
      console.log('🔐 [SIGNIN] User', result.user.email)
      console.log('🔐 [SIGNIN] UID', result.user.uid)
      
      // Store authentication data
      const idToken = await result.user.getIdToken()
      localStorage.setItem('authToken', idToken)
      localStorage.setItem('userEmail', result.user.email)
      localStorage.setItem('userId', result.user.uid)
      console.log('🔐 [SIGNIN] User data stored in localStorage')
      return result.user
    }
  } catch (error) {
    console.error('🔐 [SIGNIN] Popup sign-in failed', error)
    console.error('🔐 [SIGNIN] Error code', error.code)
    console.error('🔐 [SIGNIN] Error message', error.message)
    
    // User-friendly error messages
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please try again.')
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup blocked by browser. Please allow popups and try again.')
    } else {
      throw error
    }
  }
}

// Sign Out
export const logout = async () => {
  try {
    console.log('🔐 [LOGOUT] Signing out...')
    // Clear all stored data
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    await signOut(auth)
    console.log('🔐 [LOGOUT] Signed out successfully')
  } catch (error) {
    console.error('🔐 [LOGOUT] Error', error)
    throw error
  }
}

// Auth state change listener helper
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    console.log('🔐 [AUTH STATE] Changed', user ? user.email : 'none')
    callback(user)
  })
}

export { auth }
