import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;
let analytics: Analytics | undefined;

function shouldUseAppCheck() {
  return import.meta.env['VITE_FIREBASE_ENABLE_APPCHECK'] === 'true';
}

export function getFirebaseApp() {
  if (app) {
    return app;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    app = existingApp;
    auth = getAuth(existingApp);
    db = getFirestore(existingApp);
    functions = getFunctions(existingApp);
    if (shouldUseAppCheck() && import.meta.env.DEV && import.meta.env['VITE_FIREBASE_APPCHECK_DEBUG_TOKEN']) {
      (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        import.meta.env['VITE_FIREBASE_APPCHECK_DEBUG_TOKEN'];
    }
    return app;
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    return undefined;
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  if (shouldUseAppCheck() && import.meta.env.DEV && import.meta.env['VITE_FIREBASE_APPCHECK_DEBUG_TOKEN']) {
    (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env['VITE_FIREBASE_APPCHECK_DEBUG_TOKEN'];
  }

  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  void isSupported().then((supported) => {
    if (supported && app) {
      analytics = getAnalytics(app);
    }
  });

  return app;
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return auth;
}

export function getFirebaseDb() {
  getFirebaseApp();
  return db;
}

export function getFirebaseAnalytics() {
  getFirebaseApp();
  return analytics;
}

export function getFirebaseFunctions() {
  getFirebaseApp();
  return functions;
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}

export function getEmailProvider() {
  return new EmailAuthProvider();
}
