import { z } from 'zod';

export const profileSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().trim().email(),
  avatar: z.enum(['sage', 'mango', 'rocket', 'wave', 'radio', 'lotus']),
});

export const commentSchema = z.object({
  promiseId: z.string().min(1),
  content: z.string().trim().min(2).max(500),
});

export const promiseSubmissionSchema = z.object({
  title: z.string().trim().min(10).max(120),
  description: z.string().trim().min(30).max(1200),
  sourceLink: z.string().trim().url(),
  screenshotUrl: z.union([z.string().trim().url(), z.literal('')]).optional(),
  electionYear: z.coerce.number().int().min(2000).max(2035),
  category: z.enum(['Health', 'Education', 'Infrastructure', 'Jobs', 'Transport', 'Environment', 'Welfare', 'Governance']),
  district: z.string().trim().min(2).max(64),
});
