import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MessageSquare, FileText, LogOut, UserCircle2, Pencil, Save, Loader2, Home } from 'lucide-react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessagePopup } from '@/components/ui/message-popup';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeTime } from '@/lib/format';
import { deleteOwnComment, deleteOwnSubmission } from '@/lib/firebase-api';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { mapCommentDocument, mapSubmissionDocument } from '@/lib/firestore-mappers';
import { profileSchema } from '@/lib/validator';
import type { CommentItem, SubmissionItem } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const authSession = useAppStore((state) => state.authSession);
  const setAuthSessionDisplayName = useAppStore((state) => state.setAuthSessionDisplayName);
  const signOutSession = useAppStore((state) => state.signOutSession);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [busyCommentId, setBusyCommentId] = useState('');
  const [busySubmissionId, setBusySubmissionId] = useState('');
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (authSession?.displayName) {
      setUsername(authSession.displayName);
    }
  }, [authSession?.displayName]);

  useEffect(() => {
    if (!authSession?.uid) {
      setComments([]);
      setSubmissions([]);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setComments([]);
      setSubmissions([]);
      return;
    }

    const commentsQuery = query(collection(db, 'comments'), where('userId', '==', authSession.uid), limit(200));
    const submissionsQuery = query(collection(db, 'submissions'), where('createdBy', '==', authSession.uid), limit(100));

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setComments(
        snapshot.docs
          .map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>))
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
      );
    });

    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(
        snapshot.docs
          .map((entry) => mapSubmissionDocument(entry.id, entry.data() as Record<string, unknown>))
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
      );
    });

    return () => {
      unsubscribeComments();
      unsubscribeSubmissions();
    };
  }, [authSession?.uid]);

  async function handleDeleteComment(commentId: string) {
    setBusyCommentId(commentId);
    setError('');
    try {
      await deleteOwnComment({ commentId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete comment');
    } finally {
      setBusyCommentId('');
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    setBusySubmissionId(submissionId);
    setError('');
    try {
      await deleteOwnSubmission({ submissionId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete submission');
    } finally {
      setBusySubmissionId('');
    }
  }

  async function handleUsernameSave() {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setPopup({ open: true, title: 'Username required', message: 'Please enter a username before saving.', variant: 'error' });
      return;
    }

    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!auth || !user) {
      setPopup({ open: true, title: 'Not signed in', message: 'Login again before changing your username.', variant: 'error' });
      return;
    }

    const parsed = profileSchema.safeParse({
      username: nextUsername,
      email: authSession!.email,
      avatar: 'wave',
    });
    if (!parsed.success) {
      setPopup({ open: true, title: 'Invalid username', message: parsed.error.issues[0]?.message ?? 'Please use 3-24 characters with letters, numbers, dots, hyphens, or underscores.', variant: 'error' });
      return;
    }

    setSavingUsername(true);
    setPopup({ open: false, title: '', message: '', variant: 'info' });
    try {
      await updateProfile(user, { displayName: nextUsername });
      setAuthSessionDisplayName(nextUsername);
      setPopup({ open: true, title: 'Username updated', message: 'Your account name has been changed.', variant: 'success' });
    } catch (cause) {
      setPopup({ open: true, title: 'Could not update username', message: cause instanceof Error ? cause.message : 'Please try again.', variant: 'error' });
    } finally {
      setSavingUsername(false);
    }
  }

  if (!authSession) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <Seo title="Dashboard" description="Your personal activity dashboard." path="/me" />
        <Card className="w-full">
          <CardContent className="space-y-4 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Dashboard</p>
            <h1 className="text-3xl font-bold">Login required.</h1>
            <p className="text-white/65">Open your dashboard after signing in so we can show your comments and pending submissions.</p>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/login')}>Login</Button>
              <Button variant="outline" onClick={() => navigate('/')}><Home size={16} /> Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <Seo title="My Dashboard" description="View and manage your own comments and submitted promises." path="/me" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">My dashboard</p>
          <h1 className="text-4xl font-bold">Hi, {authSession.displayName}.</h1>
          <p className="mt-2 text-white/65">Your public comments and submitted promises are listed here.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/')}><Home size={16} /> Home</Button>
          <Button variant="outline" onClick={() => navigate('/submit')}><FileText size={16} /> Submit promise</Button>
          <Button variant="ghost" onClick={async () => {
            const auth = getFirebaseAuth();
            if (auth) {
              await signOut(auth);
            }
            signOutSession();
            navigate('/');
          }}><LogOut size={16} /> Sign out</Button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-white/75">{error}</div>}

      <Card className="mb-6">
        <CardContent className="space-y-4 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <UserCircle2 className="text-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">User panel</p>
              <h2 className="text-2xl font-bold">Change your username</h2>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/45" htmlFor="username">Username</label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your account username"
                />
              </div>
              <Button onClick={handleUsernameSave} disabled={savingUsername} className="w-full shrink-0 sm:w-auto">
                {savingUsername ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save username
              </Button>
            </div>
            <p className="text-xs text-white/45">This changes the name shown across your account. Soft login users stay as vakdhanm_user.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
              <Pencil size={14} className="text-accent" /> Signed in as {authSession.displayName}
            </span>
            <span className="rounded-full bg-white/5 px-3 py-2">Role: {authSession.role}</span>
            <span className="rounded-full bg-white/5 px-3 py-2">{authSession.emailVerified ? 'Email verified' : 'Email pending'}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-accent" />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Your comments</p>
                <h2 className="text-2xl font-bold">Delete anything you posted</h2>
              </div>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/35">
                    <span>{comment.promiseId}</span>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="mt-3 leading-7 text-white/80">{comment.content}</p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={busyCommentId === comment.id}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/55">
                  No comments yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <UserCircle2 className="text-brand-green" />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Your submissions</p>
                <h2 className="text-2xl font-bold">Promises sent for review</h2>
              </div>
            </div>

            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{submission.status}</Badge>
                      </div>
                      <h3 className="text-lg font-bold">{submission.title}</h3>
                      <p className="text-sm text-white/55">{submission.category} · {submission.district} · Submitted {formatRelativeTime(submission.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubmission(submission.id)}
                      disabled={busySubmissionId === submission.id}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              {submissions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/55">
                  No submissions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <MessagePopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        variant={popup.variant}
        onClose={() => setPopup((current) => ({ ...current, open: false }))}
      />
    </div>
  );
}
