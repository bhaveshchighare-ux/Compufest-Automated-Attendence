const admin = require('firebase-admin');
const MockFirestore = require('./mockFirestore');

let db;

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  try {
    // Format the private key if it has escaped newlines
    const formattedPrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    
    db = admin.firestore();
    console.log('✅ Firebase Firestore initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Firestore:', error.message);
    console.log('🔄 Falling back to mock local Firestore implementation (JSON database)...');
    db = new MockFirestore();
  }
} else {
  console.log('⚠️ Firebase credentials not configured in environment variables.');
  console.log('🔄 Using mock local Firestore implementation (JSON database at backend/data/db.json)...');
  db = new MockFirestore();
}

module.exports = db;
