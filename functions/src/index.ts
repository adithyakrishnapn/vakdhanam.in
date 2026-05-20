import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomUUID } from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

admin.initializeApp();
const db = admin.firestore();

const avatarSchema = z.enum(['sage', 'mango', 'rocket', 'wave', 'radio', 'lotus']);
const lightweightProfileSchema = z.object({
  username: z.string().trim().min(3).max(24).optional(),
  email: z.string().trim().email().optional(),
  avatar: avatarSchema,
  participantId: z.string().min(10).optional(),
});
const reactionSchema = z.object({
  promiseId: z.string().min(1),
  participantId: z.string().min(10),
  reaction: z.enum(['like', 'dislike']),
});
const voteSchema = z.object({
  promiseId: z.string().min(1),
  participantId: z.string().min(10),
});
const commentSchema = z.object({
  promiseId: z.string().min(1),
  content: z.string().trim().min(2).max(500),
  participantId: z.string().min(10),
});
const deleteOwnCommentSchema = z.object({
  commentId: z.string().min(1),
});
const deleteOwnSubmissionSchema = z.object({
  submissionId: z.string().min(1),
});
const submissionSchema = z.object({
  title: z.string().trim().min(10).max(120),
  description: z.string().trim().min(30).max(1200),
  sourceLink: z.string().trim().url(),
  electionYear: z.coerce.number().int().min(2000).max(2035),
  category: z.enum(['Health', 'Education', 'Infrastructure', 'Jobs', 'Transport', 'Environment', 'Welfare', 'Governance']),
  district: z.string().trim().min(2).max(64),
  screenshotUrl: z.string().url().optional().nullable(),
});

function cleanContent(input: string) {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).replace(/javascript:/gi, '').trim();
}

function throwRateLimit(message = 'Too many requests') {
  throw new HttpsError('resource-exhausted', message);
}

async function assertRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const ref = db.collection('rateLimits').doc(key);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    if (snapshot.exists) {
      const data = snapshot.data() as { count: number; windowStart: number };
      const expired = now - data.windowStart > windowMs;
      if (!expired && data.count >= limit) {
        throwRateLimit();
      }
      transaction.set(ref, {
        count: expired ? 1 : data.count + 1,
        windowStart: expired ? now : data.windowStart,
      }, { merge: true });
      return;
    }
    transaction.set(ref, { count: 1, windowStart: now }, { merge: true });
  });
}

function requireAppCheck(request: { app?: unknown }) {
  if (request.app) {
    return;
  }

  const origin = String((request as { rawRequest?: { headers?: { origin?: string } } }).rawRequest?.headers?.origin ?? '');
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return;
  }

  throw new HttpsError('failed-precondition', 'App Check required');
}

function requireSignedIn(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required');
  }
}

function requireVerifiedEmail(request: { auth?: { uid: string; token: { email_verified?: boolean } } }) {
  requireSignedIn(request);
  if (request.auth?.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Email verification required');
  }
}

function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  requireSignedIn(request);
  if (request.auth?.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
}

async function resolveParticipantId(request: { auth?: { uid: string } }, participantId: string) {
  if (request.auth?.uid) {
    return request.auth.uid;
  }

  const profileSnapshot = await db.collection('users').doc(participantId).get();
  if (!profileSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'Anonymous identity missing');
  }

  return participantId;
}

export const registerLightweightProfile = onCall({ cors: true }, async (request) => {
  requireAppCheck(request);
  const payload = lightweightProfileSchema.parse(request.data);
  const participantId = payload.participantId ?? `anon_${randomUUID()}`;
  await assertRateLimit(`register:${participantId}`, 4, 24 * 60 * 60 * 1000);

  const profile = {
    id: participantId,
    username: (payload.username ?? 'Anonymous').replace(/<[^>]*>/g, '').trim(),
    email: (payload.email ?? '').toLowerCase(),
    avatar: payload.avatar,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    role: 'visitor',
    emailVerified: false,
  };

  await db.collection('users').doc(participantId).set(profile, { merge: true });
  return { ok: true, profile };
});

export const castReaction = onCall({ cors: true }, async (request) => {
  requireAppCheck(request);
  const payload = reactionSchema.parse(request.data);
  const participantId = await resolveParticipantId(request, payload.participantId);
  await assertRateLimit(`reaction:${participantId}:${payload.promiseId}`, 8, 60_000);
  const reactionRef = db.collection('reactions').doc(`${payload.promiseId}_${participantId}`);
  const promiseRef = db.collection('promises').doc(payload.promiseId);

  await db.runTransaction(async (transaction) => {
    const reactionSnapshot = await transaction.get(reactionRef);
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists) {
      throw new HttpsError('not-found', 'Promise not found');
    }

    const existing = reactionSnapshot.exists ? (reactionSnapshot.data() as { reaction: 'like' | 'dislike' }) : null;
    if (existing?.reaction === payload.reaction) {
      throw new HttpsError('already-exists', 'Duplicate reaction');
    }

    const update: Record<string, admin.firestore.FieldValue> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (payload.reaction === 'like') {
      update.likes = admin.firestore.FieldValue.increment(1);
      if (existing?.reaction === 'dislike') {
        update.dislikes = admin.firestore.FieldValue.increment(-1);
      }
    } else {
      update.dislikes = admin.firestore.FieldValue.increment(1);
      if (existing?.reaction === 'like') {
        update.likes = admin.firestore.FieldValue.increment(-1);
      }
    }

    transaction.set(reactionRef, {
      promiseId: payload.promiseId,
      participantId,
      reaction: payload.reaction,
      createdAt: reactionSnapshot.exists ? reactionSnapshot.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.update(promiseRef, update);
  });

  return { ok: true };
});

export const castVote = onCall({ cors: true }, async (request) => {
  requireAppCheck(request);
  const payload = voteSchema.parse(request.data);
  const participantId = await resolveParticipantId(request, payload.participantId);
  await assertRateLimit(`vote:${participantId}`, 15, 60_000);
  const voteRef = db.collection('votes').doc(`${payload.promiseId}_${participantId}`);
  const promiseRef = db.collection('promises').doc(payload.promiseId);
  const pollRef = db.collection('polls').doc(payload.promiseId);

  await db.runTransaction(async (transaction) => {
    const voteSnapshot = await transaction.get(voteRef);
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists) {
      throw new HttpsError('not-found', 'Promise not found');
    }
    if (voteSnapshot.exists) {
      throw new HttpsError('already-exists', 'Vote already recorded for this promise');
    }

    transaction.set(voteRef, {
      promiseId: payload.promiseId,
      participantId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(promiseRef, {
      votes: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(pollRef, {
      promiseId: payload.promiseId,
      totalVotes: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { ok: true };
});

export const submitComment = onCall({ cors: true }, async (request) => {
  requireAppCheck(request);
  const payload = commentSchema.parse(request.data);
  const participantId = await resolveParticipantId(request, payload.participantId);
  await assertRateLimit(`comment:${participantId}`, 20, 60_000);
  const content = cleanContent(payload.content);
  if (!content) {
    throw new HttpsError('invalid-argument', 'Empty comment');
  }

  const commentRef = db.collection('comments').doc();
  const promiseRef = db.collection('promises').doc(payload.promiseId);
  await db.runTransaction(async (transaction) => {
    const promiseSnapshot = await transaction.get(promiseRef);
    if (!promiseSnapshot.exists) {
      throw new HttpsError('not-found', 'Promise not found');
    }
    transaction.set(commentRef, {
      id: commentRef.id,
      promiseId: payload.promiseId,
      userId: participantId,
      content,
      likes: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(promiseRef, {
      commentsCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const submitPromise = onCall({ cors: true }, async (request) => {
  requireVerifiedEmail(request);
  await assertRateLimit(`submission:${request.auth?.uid}`, 6, 60 * 60_000);
  const payload = submissionSchema.parse(request.data);
  const submissionRef = db.collection('submissions').doc();
  await submissionRef.set({
    id: submissionRef.id,
    title: cleanContent(payload.title),
    description: cleanContent(payload.description),
    sourceLink: payload.sourceLink,
    electionYear: payload.electionYear,
    category: payload.category,
    district: payload.district,
    screenshotUrl: payload.screenshotUrl ?? null,
    createdBy: request.auth?.uid,
    status: 'Pending Review',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, id: submissionRef.id };
});

export const moderateSubmission = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const payload = z.object({
    submissionId: z.string().min(1),
    action: z.enum(['approve', 'reject']),
    status: z.enum(['Pending', 'In Progress', 'Completed', 'Failed']).optional(),
    progress: z.number().min(0).max(100).optional(),
  }).parse(request.data);

  const submissionRef = db.collection('submissions').doc(payload.submissionId);
  const submissionSnapshot = await submissionRef.get();
  if (!submissionSnapshot.exists) {
    throw new HttpsError('not-found', 'Submission not found');
  }

  if (payload.action === 'reject') {
    await submissionRef.update({ moderationStatus: 'Rejected', moderatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true };
  }

  await db.collection('promises').add({
    ...submissionSnapshot.data(),
    status: payload.status ?? 'Pending',
    progress: payload.progress ?? 0,
    verified: true,
    trendScore: 15,
    likes: 0,
    dislikes: 0,
    votes: 0,
    commentsCount: 0,
    pinned: false,
    timeline: [{ label: 'Approved by moderators', done: true }],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await submissionRef.update({ moderationStatus: 'Approved', moderatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

export const setAdminClaim = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const payload = z.object({ uid: z.string().min(1) }).parse(request.data);
  await admin.auth().setCustomUserClaims(payload.uid, { admin: true });
  return { ok: true };
});

export const adminUpdatePromise = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const payload = z.object({
    promiseId: z.string().min(1),
    status: z.enum(['Pending', 'In Progress', 'Completed', 'Failed']),
    progress: z.number().min(0).max(100),
    pinned: z.boolean().optional(),
  }).parse(request.data);

  await db.collection('promises').doc(payload.promiseId).update({
    status: payload.status,
    progress: payload.progress,
    pinned: payload.pinned ?? undefined,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

export const adminDeleteComment = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const payload = z.object({
    commentId: z.string().min(1),
    promiseId: z.string().min(1),
  }).parse(request.data);

  const commentRef = db.collection('comments').doc(payload.commentId);
  const promiseRef = db.collection('promises').doc(payload.promiseId);

  await db.runTransaction(async (transaction) => {
    transaction.delete(commentRef);
    transaction.update(promiseRef, {
      commentsCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

export const deleteOwnComment = onCall({ cors: true }, async (request) => {
  requireSignedIn(request);
  const payload = deleteOwnCommentSchema.parse(request.data);

  const commentRef = db.collection('comments').doc(payload.commentId);
  const commentSnapshot = await commentRef.get();
  if (!commentSnapshot.exists) {
    throw new HttpsError('not-found', 'Comment not found');
  }

  const commentData = commentSnapshot.data() as { userId?: string; promiseId?: string };
  const isOwner = commentData.userId === request.auth?.uid;
  const isAdmin = request.auth?.token.admin === true;
  if (!isOwner && !isAdmin) {
    throw new HttpsError('permission-denied', 'Not allowed to delete this comment');
  }

  const promiseId = commentData.promiseId;
  if (!promiseId) {
    throw new HttpsError('failed-precondition', 'Comment is missing promise reference');
  }

  const promiseRef = db.collection('promises').doc(promiseId);
  await db.runTransaction(async (transaction) => {
    transaction.delete(commentRef);
    transaction.update(promiseRef, {
      commentsCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

export const deleteOwnSubmission = onCall({ cors: true }, async (request) => {
  requireSignedIn(request);
  const payload = deleteOwnSubmissionSchema.parse(request.data);

  const submissionRef = db.collection('submissions').doc(payload.submissionId);
  const submissionSnapshot = await submissionRef.get();
  if (!submissionSnapshot.exists) {
    throw new HttpsError('not-found', 'Submission not found');
  }

  const submissionData = submissionSnapshot.data() as { createdBy?: string };
  const isOwner = submissionData.createdBy === request.auth?.uid;
  const isAdmin = request.auth?.token.admin === true;
  if (!isOwner && !isAdmin) {
    throw new HttpsError('permission-denied', 'Not allowed to delete this submission');
  }

  await submissionRef.delete();
  return { ok: true };
});
