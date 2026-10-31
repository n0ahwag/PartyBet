import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Timestamp } from 'firebase/firestore';

const env = import.meta.env;

// Web-Config ist nicht geheim; Schutz passiert über firestore.rules.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyA95lwHyq0cZ5z7si_woAn8iKFeFqtoDv8',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'partybe-d44b7.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'partybe-d44b7',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'partybe-d44b7.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '960737105971',
  appId: env.VITE_FIREBASE_APP_ID || '1:960737105971:web:55482d6ea806bca6a36b46',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

/**
 * Räume werden nach einem Tag automatisch gelöscht: Jedes Raum-Dokument (und alles darunter)
 * bekommt ein Ablaufdatum „expireAt“, das eine Firestore-TTL-Richtlinie auswertet (docs/DATABASE.md).
 */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const expiry = () => ({ expireAt: Timestamp.fromMillis(Date.now() + ROOM_TTL_MS) });

/** Liefert die anonyme UID dieses Geräts (= playerId bzw. hostId). */
let uidPromise;
export function ensureUid() {
  if (!uidPromise) {
    uidPromise = new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user.uid);
        }
      });
      signInAnonymously(auth).catch((err) => {
        unsub();
        uidPromise = null;
        reject(err);
      });
    });
  }
  return uidPromise;
}
