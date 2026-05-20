import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MessageSquare, FileText, LogOut, UserCircle2 } from 'lucide-react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeTime } from '@/lib/format';
import { deleteOwnComment, deleteOwnSubmission } from '@/lib/firebase-api';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { mapCommentDocument, mapSubmissionDocument } from '@/lib/firestore-mappers';
import type { CommentItem, SubmissionItem } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const authSession = useAppStore((state) => state.authSession);
  const signOutSession = useAppStore((state) => state.signOutSession);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [busyCommentId, setBusyCommentId] = useState('');
  const [busySubmissionId, setBusySubmissionId] = useState('');
  const [error, setError] = useState('');

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

  if (!authSession) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10">
        <Seo title="Dashboard" description="Your personal activity dashboard." path="/me" />
        <Card className="w-full">
          <CardContent className="space-y-4 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Dashboard</p>
            <h1 className="text-3xl font-bold">Login required.</h1>
            <p className="text-white/65">Open your dashboard after signing in so we can show your comments and pending submissions.</p>
            <Button onClick={() => navigate('/login')}>Login</Button>
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
    </div>
  );
}
