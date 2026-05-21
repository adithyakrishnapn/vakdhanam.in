import type { CommentItem, ParticipantProfile, PollItem, PromiseItem, ReportItem, SubmissionItem, UserRole } from '@/types';

function toStringDate(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

export function mapPromiseDocument(id: string, data: any): PromiseItem {
  return {
    id,
    title: String(data['title'] ?? ''),
    description: String(data['description'] ?? ''),
    category: data['category'] as PromiseItem['category'],
    district: String(data['district'] ?? ''),
    sourceLink: String(data['sourceLink'] ?? ''),
    electionYear: Number(data['electionYear'] ?? 2021),
    status: data['status'] as PromiseItem['status'],
    likes: Number(data['likes'] ?? 0),
    dislikes: Number(data['dislikes'] ?? 0),
    votes: Number(data['votes'] ?? 0),
    commentsCount: Number(data['commentsCount'] ?? 0),
    createdBy: String(data['createdBy'] ?? ''),
    verified: Boolean(data['verified']),
    createdAt: toStringDate(data['createdAt']),
    progress: Number(data['progress'] ?? 0),
    pinned: Boolean(data['pinned']),
    trendScore: Number(data['trendScore'] ?? 0),
    minister: data['minister'] ? String(data['minister']) : undefined,
    screenshotUrl: data['screenshotUrl'] ? String(data['screenshotUrl']) : null,
    timeline: Array.isArray(data['timeline'])
      ? data['timeline'].map((entry: any) => ({
          label: String(entry['label'] ?? ''),
          done: Boolean(entry['done']),
        }))
      : [],
  };
}

export function mapCommentDocument(id: string, data: any): CommentItem {
  return {
    id,
    promiseId: String(data['promiseId'] ?? ''),
    userId: String(data['userId'] ?? ''),
    authorName: data['authorName'] ? String(data['authorName']) : undefined,
    content: String(data['content'] ?? ''),
    likes: Number(data['likes'] ?? 0),
    createdAt: toStringDate(data['createdAt']),
    moderationStatus: data['moderationStatus'] ? String(data['moderationStatus']) as CommentItem['moderationStatus'] : undefined,
    moderatedAt: data['moderatedAt'] ? toStringDate(data['moderatedAt']) : undefined,
  };
}

export function mapPollDocument(id: string, data: any): PollItem {
  return {
    id,
    promiseId: String(data['promiseId'] ?? ''),
    totalVotes: Number(data['totalVotes'] ?? 0),
    choices: Array.isArray(data['choices'])
      ? data['choices'].map((choice: any) => ({
          label: String(choice['label'] ?? ''),
          votes: Number(choice['votes'] ?? 0),
        }))
      : [],
  };
}

export function mapUserDocument(id: string, data: any): ParticipantProfile {
  return {
    id,
    username: String(data['username'] ?? 'anonymous'),
    email: String(data['email'] ?? ''),
    avatar: String(data['avatar'] ?? 'sage') as ParticipantProfile['avatar'],
    createdAt: toStringDate(data['createdAt']),
    role: (data['role'] as UserRole) ?? 'visitor',
    emailVerified: Boolean(data['emailVerified']),
  };
}

export function mapReportDocument(id: string, data: any): ReportItem {
  return {
    id,
    reason: String(data['reason'] ?? ''),
    reportedBy: String(data['reportedBy'] ?? ''),
    promiseId: String(data['promiseId'] ?? ''),
    createdAt: toStringDate(data['createdAt']),
  };
}

export function mapSubmissionDocument(id: string, data: any): SubmissionItem {
  return {
    id,
    title: String(data['title'] ?? ''),
    description: String(data['description'] ?? ''),
    sourceLink: String(data['sourceLink'] ?? ''),
    electionYear: Number(data['electionYear'] ?? 2021),
    category: data['category'] as SubmissionItem['category'],
    district: String(data['district'] ?? ''),
    screenshotUrl: data['screenshotUrl'] ? String(data['screenshotUrl']) : null,
    createdBy: String(data['createdBy'] ?? ''),
    status: String(data['status'] ?? 'Pending Review'),
    moderationStatus: data['moderationStatus'] ? String(data['moderationStatus']) as SubmissionItem['moderationStatus'] : undefined,
    moderatedAt: data['moderatedAt'] ? toStringDate(data['moderatedAt']) : undefined,
    createdAt: toStringDate(data['createdAt']),
  };
}
