import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';

const uid = process.argv[2];
const serviceAccountPath = process.argv[3] ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!uid) {
  console.error('Usage: npm run admin:set -- <firebase-auth-uid>');
  process.exit(1);
}

if (!serviceAccountPath) {
  console.error('Provide a Firebase service-account JSON path as the second argument or set GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

const resolvedPath = path.resolve(serviceAccountPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Service-account file not found at ${resolvedPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
});

try {
  await getAuth(app).setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim set for ${uid}`);
} catch (error) {
  console.error('Failed to set admin claim:', error instanceof Error ? error.message : error);
  process.exit(1);
}
