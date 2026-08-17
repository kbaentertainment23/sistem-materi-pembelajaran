import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign internal transport retry logs
try {
  setLogLevel('error');
} catch {}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const databaseId = firebaseConfig.firestoreDatabaseId || 'sistem-materi';

let db: ReturnType<typeof getFirestore>;

try {
  db = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    databaseId
  );
} catch {
  db = getFirestore(app, databaseId);
}

export { app, db };

