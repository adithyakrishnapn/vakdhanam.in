import { mockComments, mockPolls, mockPromises } from '@/data/mock';
import type { CommentItem, ParticipantProfile, PromiseItem } from '@/types';
import { sanitizeText } from './sanitize';
import { promiseSubmissionSchema, profileSchema, commentSchema } from './validator';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let promises = [...mockPromises];
let comments = [...mockComments];
let polls = [...mockPolls];
const participants = new Map<string, ParticipantProfile>();
const reactions = new Map<string, 'like' | 'dislike'>();
const votes = new Map<string, string>();

export async function getMockFeed() {
  await sleep(120);
  return {
    promises,
    comments,
    polls,
  };
}

export async function registerParticipant(input: unknown) {
  const payload = profileSchema.parse(input);
  const profile: ParticipantProfile = {
    id: `${payload.email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${payload.username.toLowerCase()}`,
    username: payload.username,
    email: payload.email,
    avatar: payload.avatar,
    createdAt: new Date().toISOString(),
    role: 'visitor',
    emailVerified: false,
  };
  participants.set(profile.id, profile);
  await sleep(80);
  return profile;
}

export async function castReaction(input: { promiseId: string; participantId: string; reaction: 'like' | 'dislike' }) {
  const key = `${input.promiseId}:${input.participantId}`;
  const previous = reactions.get(key);
  reactions.set(key, input.reaction);
  promises = promises.map((entry) => {
    if (entry.id !== input.promiseId) return entry;
    const deltaLike = input.reaction === 'like' ? 1 : 0;
    const deltaDislike = input.reaction === 'dislike' ? 1 : 0;
    return {
      ...entry,
      likes: entry.likes + deltaLike - (previous === 'like' ? 1 : 0),
      dislikes: entry.dislikes + deltaDislike - (previous === 'dislike' ? 1 : 0),
    };
  });
  await sleep(120);
}

export async function castVote(input: { promiseId: string; participantId: string }) {
  const key = input.participantId;
  votes.set(key, input.promiseId);
  promises = promises.map((entry) =>
    entry.id === input.promiseId ? { ...entry, votes: entry.votes + 1 } : entry,
  );
  const poll = polls.find((entry) => entry.promiseId === input.promiseId);
  if (poll) {
    poll.totalVotes += 1;
    if (poll.choices[0]) {
      poll.choices[0].votes += 1;
    }
  }
  await sleep(100);
}

export async function submitComment(input: { promiseId: string; userId: string; content: string }) {
  const payload = commentSchema.parse({ promiseId: input.promiseId, content: input.content });
  const comment: CommentItem = {
    id: crypto.randomUUID(),
    promiseId: payload.promiseId,
    userId: input.userId,
    content: sanitizeText(payload.content),
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  comments = [comment, ...comments];
  promises = promises.map((entry) =>
    entry.id === input.promiseId ? { ...entry, commentsCount: entry.commentsCount + 1 } : entry,
  );
  await sleep(80);
  return comment;
}

export async function submitPromise(input: unknown, userId: string) {
  const payload = promiseSubmissionSchema.parse(input);
  const promise: PromiseItem = {
    id: crypto.randomUUID(),
    title: payload.title,
    description: payload.description,
    category: payload.category,
    district: payload.district,
    sourceLink: payload.sourceLink,
    electionYear: payload.electionYear,
    status: 'Pending',
    likes: 0,
    dislikes: 0,
    votes: 0,
    commentsCount: 0,
    createdBy: userId,
    verified: false,
    createdAt: new Date().toISOString(),
    progress: 0,
    trendScore: 10,
    timeline: [{ label: 'Waiting for admin review', done: false }],
  };
  promises = [promise, ...promises];
  await sleep(80);
  return promise;
}
