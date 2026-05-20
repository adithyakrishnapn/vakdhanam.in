import { getFirebaseDb } from './firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

export async function fetchFirestoreCollection<T>(collectionName: string) {
  const db = getFirebaseDb();
  if (!db) {
    return [] as T[];
  }

  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((entry) => entry.data() as T);
}

export async function fetchFirestoreDoc<T>(collectionName: string, id: string) {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

export function orderByTrend(collectionName: string) {
  const db = getFirebaseDb();
  return db ? query(collection(db, collectionName), orderBy('trendScore', 'desc'), limit(20)) : null;
}
