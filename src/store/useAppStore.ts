import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { categories, districts } from '@/data/mock';
import { sanitizeText } from '@/lib/sanitize';
import { promiseSubmissionSchema, profileSchema, commentSchema } from '@/lib/validator';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/firebase';
import { adminUpdatePromise as callAdminUpdatePromise, castReaction as callCastReaction, castVote as callCastVote, registerLightweightProfile as callRegisterLightweightProfile, submitComment as callSubmitComment, submitPromise as callSubmitPromise, subscribePolls, subscribePublicPromises } from '@/lib/firebase-api';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getIdTokenResult } from 'firebase/auth';
import type { AuthSession, AvatarName, CommentItem, ParticipantProfile, PollItem, PromiseCategory, PromiseItem, PromiseStatus } from '@/types';

type FeedMode = 'trending' | 'votes' | 'recent' | 'completed';
type ThemeMode = 'dark' | 'light';

interface AppState {
  theme: ThemeMode;
  profile: ParticipantProfile | null;
  authSession: AuthSession | null;
  reactionIdentityId: string;
  promises: PromiseItem[];
  comments: CommentItem[];
  polls: PollItem[];
  loading: boolean;
  firebaseReady: boolean;
  search: string;
  category: string;
  district: string;
  feedMode: FeedMode;
  isSubmitting: boolean;
  hasMore: boolean;
  init: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setDistrict: (value: string) => void;
  setFeedMode: (value: FeedMode) => void;
  upsertProfile: (input: { username: string; email: string; avatar: AvatarName }) => ParticipantProfile;
  signOutSession: () => void;
  likePromise: (id: string) => Promise<void>;
  dislikePromise: (id: string) => Promise<void>;
  votePromise: (id: string) => Promise<void>;
  addComment: (payload: { promiseId: string; content: string }) => Promise<void>;
  submitPromise: (payload: unknown) => Promise<void>;
  editPromiseStatus: (id: string, status: PromiseStatus, progress?: number, pinned?: boolean) => Promise<void>;
  pinPromise: (id: string) => Promise<void>;
  clearFilters: () => void;
}

function buildProfile(input: { username: string; email: string; avatar: AvatarName }) {
  const payload = profileSchema.parse(input);
  return {
    id: `${payload.email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${payload.username.toLowerCase()}`,
    username: payload.username,
    email: payload.email,
    avatar: payload.avatar,
    createdAt: new Date().toISOString(),
    role: 'visitor' as const,
    emailVerified: false,
  } satisfies ParticipantProfile;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      profile: null,
      authSession: null,
      reactionIdentityId: '',
      promises: [],
      comments: [],
      polls: [],
      loading: true,
      firebaseReady: false,
      search: '',
      category: 'All',
      district: 'All',
      feedMode: 'trending',
      isSubmitting: false,
      hasMore: false,
      init: () => {
        const app = getFirebaseApp();
        if (!app) {
          set({ firebaseReady: false, loading: false });
          return;
        }

        if ((window as typeof window & { __vakdhanamSubscribed?: boolean }).__vakdhanamSubscribed) {
          return;
        }

        (window as typeof window & { __vakdhanamSubscribed?: boolean }).__vakdhanamSubscribed = true;
        set({ firebaseReady: true, loading: true });
        const theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        set({ theme });

        const storedProfileRaw = localStorage.getItem('vakdhanam-store');
        const storedProfile = storedProfileRaw ? (() => {
          try {
            const parsed = JSON.parse(storedProfileRaw) as { state?: { profile?: ParticipantProfile | null; reactionIdentityId?: string } };
            return parsed.state?.profile ?? null;
          } catch {
            return null;
          }
        })() : null;

        if (!storedProfile) {
          void callRegisterLightweightProfile({ username: 'Anonymous', avatar: 'wave' })
            .then((result) => {
              const profile = result.profile;
              set({
                profile: {
                  id: profile.id,
                  username: profile.username,
                  email: profile.email,
                  avatar: profile.avatar,
                  createdAt: profile.createdAt,
                  role: 'visitor',
                  emailVerified: false,
                },
                reactionIdentityId: profile.id,
              });
            })
            .catch(() => undefined);
        } else {
          set({ profile: storedProfile });
          set({ reactionIdentityId: storedProfile.id });
        }

        subscribePublicPromises((promises) => set({ promises, loading: false }));
        subscribePolls((polls) => set({ polls }));
        window.setTimeout(() => {
          set((state) => (state.loading ? { loading: false } : state));
        }, 4000);

        const auth = getFirebaseAuth();
        if (auth) {
          onAuthStateChanged(auth, async (user) => {
            if (!user) {
              set({ authSession: null });
              return;
            }

            const token = await getIdTokenResult(user, true);
            const claims = token.claims as Record<string, unknown>;
            const role = (claims['admin'] ? 'admin' : claims['moderator'] ? 'moderator' : 'user') as AuthSession['role'];
            set({
              authSession: {
                uid: user.uid,
                email: user.email ?? '',
                displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Anonymous',
                photoURL: user.photoURL ?? undefined,
                emailVerified: user.emailVerified,
                role,
              },
            });
          });
        }
      },
      setTheme: (theme) => set({ theme }),
      setSearch: (search) => set({ search }),
      setCategory: (category) => set({ category }),
      setDistrict: (district) => set({ district }),
      setFeedMode: (feedMode) => set({ feedMode }),
      clearFilters: () => set({ search: '', category: 'All', district: 'All', feedMode: 'trending' }),
      upsertProfile: (input) => {
        const profile = buildProfile(input);
        set({ profile });
        return profile;
      },
      signOutSession: () => set({ authSession: null }),
      likePromise: async (id) => {
        const participantId = get().authSession?.uid ?? get().profile?.id ?? get().reactionIdentityId;
        await callCastReaction({ promiseId: id, participantId, reaction: 'like' });
      },
      dislikePromise: async (id) => {
        const participantId = get().authSession?.uid ?? get().profile?.id ?? get().reactionIdentityId;
        await callCastReaction({ promiseId: id, participantId, reaction: 'dislike' });
      },
      votePromise: async (id) => {
        const participantId = get().authSession?.uid ?? get().profile?.id ?? get().reactionIdentityId;
        await callCastVote({ promiseId: id, participantId });
      },
      addComment: async ({ promiseId, content }) => {
        const safe = sanitizeText(commentSchema.parse({ promiseId, content }).content);
        const participantId = get().authSession?.uid ?? get().profile?.id ?? get().reactionIdentityId;
        await callSubmitComment({ promiseId, content: safe, participantId });
      },
      submitPromise: async (payload) => {
        if (!get().authSession) {
          throw new Error('Login required for submissions');
        }
        set({ isSubmitting: true });
        try {
          const parsedResult = promiseSubmissionSchema.safeParse(payload);
          if (!parsedResult.success) {
            throw new Error(parsedResult.error.issues[0]?.message ?? 'Invalid submission');
          }
          const parsed = parsedResult.data;
          await callSubmitPromise(parsed);
        } finally {
          set({ isSubmitting: false });
        }
      },
      editPromiseStatus: async (id, status, progress, pinned) => {
        await callAdminUpdatePromise({ promiseId: id, status, progress: progress ?? 0, pinned });
      },
      pinPromise: async (id) => {
        const promise = get().promises.find((entry) => entry.id === id);
        await callAdminUpdatePromise({
          promiseId: id,
          status: promise?.status ?? 'Pending',
          progress: promise?.progress ?? 0,
          pinned: !promise?.pinned,
        });
      },
    }),
    {
      name: 'vakdhanam-store',
      partialize: (state) => ({
        theme: state.theme,
        profile: state.profile,
        reactionIdentityId: state.reactionIdentityId,
      }),
    },
  ),
);

export const categoryOptions = categories;
export const districtOptions = districts;
