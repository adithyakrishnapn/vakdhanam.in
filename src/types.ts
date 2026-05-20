export type PromiseStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';

export type UserRole = 'visitor' | 'user' | 'moderator' | 'admin';

export type PromiseCategory =
  | 'Health'
  | 'Education'
  | 'Infrastructure'
  | 'Jobs'
  | 'Transport'
  | 'Environment'
  | 'Welfare'
  | 'Governance';

export type AvatarName =
  | 'sage'
  | 'mango'
  | 'rocket'
  | 'wave'
  | 'radio'
  | 'lotus';

export interface ParticipantProfile {
  id: string;
  username: string;
  email: string;
  avatar: AvatarName;
  createdAt: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface AuthSession {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  role: UserRole;
}

export interface PromiseItem {
  id: string;
  title: string;
  description: string;
  category: PromiseCategory;
  district: string;
  sourceLink: string;
  electionYear: number;
  status: PromiseStatus;
  likes: number;
  dislikes: number;
  votes: number;
  commentsCount: number;
  createdBy: string;
  verified: boolean;
  createdAt: string;
  progress: number;
  pinned?: boolean;
  trendScore: number;
  minister?: string;
  screenshotUrl?: string | null;
  timeline: Array<{ label: string; done: boolean }>;
}

export interface CommentItem {
  id: string;
  promiseId: string;
  userId: string;
  content: string;
  likes: number;
  createdAt: string;
  moderationStatus?: 'Approved' | 'Spam' | 'Hidden';
  moderatedAt?: string;
}

export interface PollItem {
  id: string;
  promiseId: string;
  totalVotes: number;
  choices: Array<{ label: string; votes: number }>;
}

export interface ReportItem {
  id: string;
  reason: string;
  reportedBy: string;
  promiseId: string;
  createdAt: string;
}

export interface SubmissionItem {
  id: string;
  title: string;
  description: string;
  sourceLink: string;
  electionYear: number;
  category: PromiseCategory;
  district: string;
  screenshotUrl?: string | null;
  createdBy: string;
  status: string;
  moderationStatus?: 'Pending Review' | 'Approved' | 'Rejected' | 'Spam';
  moderatedAt?: string;
  createdAt: string;
}
