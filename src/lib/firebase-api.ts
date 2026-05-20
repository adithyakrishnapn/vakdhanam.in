import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseFunctions } from './firebase';
import { mapCommentDocument, mapPollDocument, mapPromiseDocument, mapSubmissionDocument } from './firestore-mappers';
import type { CommentItem, PollItem, PromiseItem, SubmissionItem } from '@/types';

export function subscribePublicPromises(onUpdate: (items: PromiseItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const promiseQuery = query(collection(db, 'promises'), orderBy('trendScore', 'desc'), limit(50));
  return onSnapshot(promiseQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((entry) => mapPromiseDocument(entry.id, entry.data() as Record<string, unknown>)));
  }, () => {
    onUpdate([]);
  });
}

export function subscribePromiseById(id: string, onUpdate: (item: PromiseItem | null) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate(null);
    return () => undefined;
  }

  return onSnapshot(doc(db, 'promises', id), (snapshot) => {
    onUpdate(snapshot.exists() ? mapPromiseDocument(snapshot.id, snapshot.data() as Record<string, unknown>) : null);
  }, () => {
    onUpdate(null);
  });
}

export function subscribePromiseComments(promiseId: string, onUpdate: (items: CommentItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const commentQuery = query(collection(db, 'comments'), where('promiseId', '==', promiseId), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(commentQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>)));
  }, () => {
    onUpdate([]);
  });
}

export function subscribePolls(onUpdate: (items: PollItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const pollQuery = query(collection(db, 'polls'), orderBy('totalVotes', 'desc'), limit(20));
  return onSnapshot(pollQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((entry) => mapPollDocument(entry.id, entry.data() as Record<string, unknown>)));
  }, () => {
    onUpdate([]);
  });
}

export function subscribeSubmissions(onUpdate: (items: SubmissionItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const submissionQuery = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(submissionQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((entry) => mapSubmissionDocument(entry.id, entry.data() as Record<string, unknown>)));
  }, () => {
    onUpdate([]);
  });
}

export function subscribeUserComments(userId: string, onUpdate: (items: CommentItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const commentQuery = query(collection(db, 'comments'), where('userId', '==', userId), limit(200));
  return onSnapshot(commentQuery, (snapshot) => {
    const items = snapshot.docs
      .map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    onUpdate(items);
  }, () => {
    onUpdate([]);
  });
}

export function subscribeUserSubmissions(userId: string, onUpdate: (items: SubmissionItem[]) => void) {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => undefined;
  }

  const submissionQuery = query(collection(db, 'submissions'), where('createdBy', '==', userId), limit(100));
  return onSnapshot(submissionQuery, (snapshot) => {
    const items = snapshot.docs
      .map((entry) => mapSubmissionDocument(entry.id, entry.data() as Record<string, unknown>))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    onUpdate(items);
  }, () => {
    onUpdate([]);
  });
}

export async function fetchPromiseOnce(id: string) {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const snapshot = await getDoc(doc(db, 'promises', id));
  return snapshot.exists() ? mapPromiseDocument(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export async function fetchPromiseCommentsOnce(promiseId: string) {
  const db = getFirebaseDb();
  if (!db) {
    return [] as CommentItem[];
  }

  const commentQuery = query(collection(db, 'comments'), where('promiseId', '==', promiseId), orderBy('createdAt', 'desc'), limit(200));
  const snapshot = await getDocs(commentQuery);
  return snapshot.docs.map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>));
}

export async function castReaction(input: { promiseId: string; participantId: string; reaction: 'like' | 'dislike' }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'castReaction');
  await callable(input);
}

export async function registerLightweightProfile(input?: { username?: string; email?: string; avatar?: 'sage' | 'mango' | 'rocket' | 'wave' | 'radio' | 'lotus'; participantId?: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'registerLightweightProfile');
  const response = await callable({
    username: input?.username ?? 'Anonymous',
    email: input?.email ?? '',
    avatar: input?.avatar ?? 'wave',
    participantId: input?.participantId,
  });
  return response.data as { ok: true; profile: { id: string; username: string; email: string; avatar: 'sage' | 'mango' | 'rocket' | 'wave' | 'radio' | 'lotus'; createdAt: string; role: string; emailVerified: boolean } };
}

export async function castVote(input: { promiseId: string; participantId: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'castVote');
  await callable(input);
}

export async function submitComment(input: { promiseId: string; content: string; participantId: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'submitComment');
  await callable(input);
}

export async function deleteOwnComment(input: { commentId: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Backend functions are not available');
  }

  const callable = httpsCallable(functions, 'deleteOwnComment');
  await callable(input);
}

export async function deleteOwnSubmission(input: { submissionId: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Backend functions are not available');
  }

  const callable = httpsCallable(functions, 'deleteOwnSubmission');
  await callable(input);
}

export async function submitPromise(input: unknown) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'submitPromise');
  await callable(input);
}

export async function adminUpdatePromise(input: { promiseId: string; status: 'Pending' | 'In Progress' | 'Completed' | 'Failed'; progress: number; pinned?: boolean }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'adminUpdatePromise');
  await callable(input);
}

export async function adminDeleteComment(input: { commentId: string; promiseId: string }) {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error('Firebase Functions are not available');
  }

  const callable = httpsCallable(functions, 'adminDeleteComment');
  await callable(input);
}
