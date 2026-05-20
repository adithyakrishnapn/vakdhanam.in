import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
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
    onUpdate(
      snapshot.docs
        .map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>))
        .filter((comment) => comment.moderationStatus !== 'Spam' && comment.moderationStatus !== 'Hidden'),
    );
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
  return snapshot.docs
    .map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>))
    .filter((comment) => comment.moderationStatus !== 'Spam' && comment.moderationStatus !== 'Hidden');
}

export async function castReaction(input: { promiseId: string; participantId: string; reaction: 'like' | 'dislike' }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  const participantId = getFirebaseAuth()?.currentUser?.uid ?? input.participantId;
  const promiseRef = doc(db, 'promises', input.promiseId);
  const reactionRef = doc(db, 'reactions', `${input.promiseId}_${participantId}`);

  await runTransaction(db, async (transaction) => {
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists()) {
      throw new Error('Promise not found');
    }

    const reactionSnapshot = await transaction.get(reactionRef);
    const existingReaction = reactionSnapshot.exists() ? (reactionSnapshot.data() as { reaction?: 'like' | 'dislike' }) : null;
    if (existingReaction?.reaction === input.reaction) {
      throw new Error('Duplicate reaction');
    }

    const update: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (input.reaction === 'like') {
      update['likes'] = increment(1);
      if (existingReaction?.reaction === 'dislike') {
        update['dislikes'] = increment(-1);
      }
    } else {
      update['dislikes'] = increment(1);
      if (existingReaction?.reaction === 'like') {
        update['likes'] = increment(-1);
      }
    }

    transaction.set(reactionRef, {
      promiseId: input.promiseId,
      participantId,
      reaction: input.reaction,
      createdAt: reactionSnapshot.exists() ? (reactionSnapshot.data() as { createdAt?: unknown })['createdAt'] ?? serverTimestamp() : serverTimestamp(),
    }, { merge: true });
    transaction.update(promiseRef, update);
  });
}

export async function registerLightweightProfile(input?: { username?: string; email?: string; avatar?: 'sage' | 'mango' | 'rocket' | 'wave' | 'radio' | 'lotus'; participantId?: string }) {
  const participantId = input?.participantId ?? `vakdhanm_user_${crypto.randomUUID().slice(0, 8)}`;

  const profile = {
    id: participantId,
    username: (input?.username ?? 'vakdhanm_user').replace(/<[^>]*>/g, '').trim() || 'vakdhanm_user',
    email: (input?.email ?? '').toLowerCase(),
    avatar: input?.avatar ?? 'wave',
    createdAt: new Date().toISOString(),
    role: 'visitor',
    emailVerified: false,
  } as const;

  return { ok: true, profile };
}

export async function castVote(input: { promiseId: string; participantId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  const participantId = getFirebaseAuth()?.currentUser?.uid ?? input.participantId;
  const voteRef = doc(db, 'votes', `${input.promiseId}_${participantId}`);
  const promiseRef = doc(db, 'promises', input.promiseId);
  const pollRef = doc(db, 'polls', input.promiseId);

  await runTransaction(db, async (transaction) => {
    const voteSnapshot = await transaction.get(voteRef);
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists()) {
      throw new Error('Promise not found');
    }
    if (voteSnapshot.exists()) {
      throw new Error('Vote already recorded for this promise');
    }

    transaction.set(voteRef, {
      promiseId: input.promiseId,
      participantId,
      createdAt: serverTimestamp(),
    });
    transaction.update(promiseRef, {
      votes: increment(1),
      updatedAt: serverTimestamp(),
    });
    transaction.set(pollRef, {
      promiseId: input.promiseId,
      totalVotes: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function submitComment(input: { promiseId: string; content: string; participantId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  const participantId = getFirebaseAuth()?.currentUser?.uid ?? input.participantId;
  const commentRef = doc(collection(db, 'comments'));
  const promiseRef = doc(db, 'promises', input.promiseId);

  await runTransaction(db, async (transaction) => {
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists()) {
      throw new Error('Promise not found');
    }

    transaction.set(commentRef, {
      id: commentRef.id,
      promiseId: input.promiseId,
      userId: participantId,
      content: input.content.trim(),
      likes: 0,
      createdAt: serverTimestamp(),
    });
    transaction.update(promiseRef, {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteOwnComment(input: { commentId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await deleteDoc(doc(db, 'comments', input.commentId));
}

export async function deleteOwnSubmission(input: { submissionId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await deleteDoc(doc(db, 'submissions', input.submissionId));
}

export async function submitPromise(input: unknown) {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();
  const userId = auth?.currentUser?.uid;
  if (!db || !userId) {
    throw new Error('Login required for submissions');
  }

  const parsed = input as {
    title: string;
    description: string;
    sourceLink: string;
    electionYear: number;
    category: 'Health' | 'Education' | 'Infrastructure' | 'Jobs' | 'Transport' | 'Environment' | 'Welfare' | 'Governance';
    district: string;
    screenshotUrl?: string | null;
  };

  const submissionRef = doc(collection(db, 'submissions'));
  await setDoc(submissionRef, {
    id: submissionRef.id,
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    sourceLink: parsed.sourceLink.trim(),
    electionYear: parsed.electionYear,
    category: parsed.category,
    district: parsed.district.trim(),
    screenshotUrl: parsed.screenshotUrl ?? null,
    createdBy: userId,
    status: 'Pending Review',
    createdAt: serverTimestamp(),
  });
}

export async function adminUpdatePromise(input: { promiseId: string; status: 'Pending' | 'In Progress' | 'Completed' | 'Failed'; progress: number; pinned?: boolean }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'promises', input.promiseId), {
    status: input.status,
    progress: input.progress,
    pinned: input.pinned ?? undefined,
    updatedAt: serverTimestamp(),
  });
}

export async function adminApproveSubmission(input: { submission: SubmissionItem }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  const submissionRef = doc(db, 'submissions', input.submission.id);
  const promiseRef = doc(db, 'promises', input.submission.id);
  await setDoc(promiseRef, {
    id: input.submission.id,
    title: input.submission.title,
    description: input.submission.description,
    category: input.submission.category,
    district: input.submission.district,
    sourceLink: input.submission.sourceLink,
    electionYear: input.submission.electionYear,
    status: 'Pending',
    likes: 0,
    dislikes: 0,
    votes: 0,
    commentsCount: 0,
    createdBy: input.submission.createdBy,
    verified: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    progress: 0,
    pinned: false,
    trendScore: 15,
    minister: undefined,
    timeline: [{ label: 'Approved by moderators', done: true }],
  });

  await updateDoc(submissionRef, {
    moderationStatus: 'Approved',
    moderatedAt: serverTimestamp(),
    reviewedPromiseId: promiseRef.id,
  });
}

export async function adminRejectSubmission(input: { submissionId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'submissions', input.submissionId), {
    moderationStatus: 'Rejected',
    moderatedAt: serverTimestamp(),
  });
}

export async function adminMarkSubmissionSpam(input: { submissionId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'submissions', input.submissionId), {
    moderationStatus: 'Spam',
    moderatedAt: serverTimestamp(),
  });
}

export async function adminDeleteSubmission(input: { submissionId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await deleteDoc(doc(db, 'submissions', input.submissionId));
}

export async function adminApproveComment(input: { commentId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'comments', input.commentId), {
    moderationStatus: 'Approved',
    moderatedAt: serverTimestamp(),
  });
}

export async function adminMarkCommentSpam(input: { commentId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'comments', input.commentId), {
    moderationStatus: 'Spam',
    moderatedAt: serverTimestamp(),
  });
}

export async function adminDeleteComment(input: { commentId: string; promiseId: string }) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  const commentRef = doc(db, 'comments', input.commentId);
  const promiseRef = doc(db, 'promises', input.promiseId);

  await runTransaction(db, async (transaction) => {
    transaction.delete(commentRef);
    transaction.update(promiseRef, {
      commentsCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function adminUpdateSubmission(input: {
  submissionId: string;
  title: string;
  description: string;
  category: 'Health' | 'Education' | 'Infrastructure' | 'Jobs' | 'Transport' | 'Environment' | 'Welfare' | 'Governance';
  district: string;
  electionYear: number;
  sourceLink?: string;
}) {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase is not available');
  }

  await updateDoc(doc(db, 'submissions', input.submissionId), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    district: input.district.trim(),
    electionYear: input.electionYear,
    sourceLink: input.sourceLink?.trim() ?? undefined,
    updatedAt: serverTimestamp(),
  });
}
