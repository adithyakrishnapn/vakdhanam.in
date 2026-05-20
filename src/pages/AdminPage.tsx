import { useEffect, useMemo, useState } from 'react';
import { Lock, CheckCircle2, Ban, Pin, MessageSquareWarning, BarChart3, Trash2, Sparkles, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Seo } from '@/components/seo/Seo';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessagePopup } from '@/components/ui/message-popup';
import { useAppStore } from '@/store/useAppStore';
import {
  adminApproveComment,
  adminApproveSubmission,
  adminDeleteComment,
  adminDeleteSubmission,
  adminMarkCommentSpam,
  adminMarkSubmissionSpam,
  adminRejectSubmission,
  adminUpdatePromise,
} from '@/lib/firebase-api';
import { getFirebaseDb } from '@/lib/firebase';
import { mapCommentDocument, mapPromiseDocument, mapSubmissionDocument } from '@/lib/firestore-mappers';
import type { CommentItem, PromiseItem, SubmissionItem } from '@/types';

export default function AdminPage() {
  const authSession = useAppStore((state) => state.authSession);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [busyAction, setBusyAction] = useState('');
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const isAdmin = authSession?.role === 'admin';

  const pendingSubmissions = useMemo(() => submissions.filter((entry) => (entry.moderationStatus ?? 'Pending Review') === 'Pending Review'), [submissions]);
  const approvedSubmissions = useMemo(() => submissions.filter((entry) => entry.moderationStatus === 'Approved'), [submissions]);
  const spamSubmissions = useMemo(() => submissions.filter((entry) => entry.moderationStatus === 'Spam'), [submissions]);
  const rejectedSubmissions = useMemo(() => submissions.filter((entry) => entry.moderationStatus === 'Rejected'), [submissions]);
  const spamComments = useMemo(() => comments.filter((entry) => entry.moderationStatus === 'Spam'), [comments]);

  async function runAdminAction(actionId: string, task: () => Promise<void>, successTitle: string, successMessage: string) {
    setBusyAction(actionId);
    setPopup({ open: false, title: '', message: '', variant: 'info' });
    try {
      await task();
      setPopup({ open: true, title: successTitle, message: successMessage, variant: 'success' });
    } catch (cause) {
      setPopup({ open: true, title: 'Action failed', message: cause instanceof Error ? cause.message : 'Please try again.', variant: 'error' });
    } finally {
      setBusyAction('');
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    const db = getFirebaseDb();
    if (!db) return;

    const promiseUnsub = onSnapshot(query(collection(db, 'promises'), orderBy('trendScore', 'desc'), limit(12)), (snapshot) => {
      setPromises(snapshot.docs.map((entry) => mapPromiseDocument(entry.id, entry.data() as Record<string, unknown>)));
    });
    const submissionUnsub = onSnapshot(query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(12)), (snapshot) => {
      setSubmissions(snapshot.docs.map((entry) => mapSubmissionDocument(entry.id, entry.data() as Record<string, unknown>)));
    });
    const commentUnsub = onSnapshot(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(12)), (snapshot) => {
      setComments(snapshot.docs.map((entry) => mapCommentDocument(entry.id, entry.data() as Record<string, unknown>)));
    });

    return () => {
      promiseUnsub();
      submissionUnsub();
      commentUnsub();
    };
  }, [isAdmin]);

  const livePromises = promises.length;
  const queueCount = pendingSubmissions.length;
  const spamCount = spamSubmissions.length + spamComments.length;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Seo title="Admin" description="Moderation dashboard for verified administrators only." path="/admin" />
      <Card>
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-red/15 text-brand-red"><Lock /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Admin dashboard</p>
              <h1 className="text-3xl font-bold">Promise moderation console</h1>
            </div>
          </div>

          {!isAdmin ? (
            <div className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-5 text-sm text-white/75">
              This area is locked behind verified admin claims. Log in with an account that has the `admin` claim.
            </div>
          ) : null}

          {isAdmin && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['Live promises', livePromises],
                  ['Review queue', queueCount],
                  ['Spam bin', spamCount],
                  ['Comments', comments.length],
                ].map(([title, value]) => (
                  <div key={title as string} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <BarChart3 className="mb-3 text-accent" />
                    <div className="text-lg font-bold">{title as string}</div>
                    <div className="mt-1 text-sm text-white/55">{value as number} items</div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-brand-green/20 bg-brand-green/10 p-4 text-sm text-white/75">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck size={16} className="text-brand-green" />
                  Accept publishes the submission as a live promise. Spam hides it from the public queue. Delete removes the record entirely.
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">Review queue</p>
                    <h2 className="text-2xl font-bold">Submissions waiting for a decision</h2>
                  </div>
                  <Badge className="bg-white/10 text-white/70">{pendingSubmissions.length} pending</Badge>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {submissions.map((entry) => {
                    const status = entry.moderationStatus ?? 'Pending Review';
                    const isPending = status === 'Pending Review';
                    const isApproved = status === 'Approved';
                    const isSpam = status === 'Spam';
                    const isRejected = status === 'Rejected';
                    return (
                      <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Badge className={isApproved ? 'bg-brand-green/15 text-brand-green' : isSpam ? 'bg-brand-red/15 text-brand-red' : isRejected ? 'bg-white/10 text-white/70' : 'bg-brand-yellow/15 text-brand-yellow'}>
                              {status}
                            </Badge>
                            <h3 className="mt-3 text-xl font-bold">{entry.title}</h3>
                          </div>
                          <Sparkles className="text-accent" />
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/65">{entry.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                          <span className="rounded-full bg-white/5 px-3 py-1">{entry.category}</span>
                          <span className="rounded-full bg-white/5 px-3 py-1">{entry.district}</span>
                          <span className="rounded-full bg-white/5 px-3 py-1">{entry.electionYear}</span>
                          {entry.moderatedAt && <span className="rounded-full bg-white/5 px-3 py-1">Reviewed</span>}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!isApproved && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyAction === `approve-${entry.id}`}
                              onClick={() => runAdminAction(
                                `approve-${entry.id}`,
                                () => adminApproveSubmission({ submission: entry }),
                                'Submission approved',
                                'The submission is now live as a public promise.',
                              )}
                            >
                              {busyAction === `approve-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Accept & publish
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyAction === `reject-${entry.id}`}
                            onClick={() => runAdminAction(
                              `reject-${entry.id}`,
                              () => adminRejectSubmission({ submissionId: entry.id }),
                              'Submission rejected',
                              'The submission was moved out of the review queue.',
                            )}
                          >
                            {busyAction === `reject-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyAction === `spam-${entry.id}`}
                            onClick={() => runAdminAction(
                              `spam-${entry.id}`,
                              () => adminMarkSubmissionSpam({ submissionId: entry.id }),
                              'Marked as spam',
                              'The submission moved to the spam bin.',
                            )}
                          >
                            {busyAction === `spam-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                            Move to spam
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyAction === `delete-${entry.id}`}
                            onClick={() => runAdminAction(
                              `delete-${entry.id}`,
                              () => adminDeleteSubmission({ submissionId: entry.id }),
                              'Submission deleted',
                              'The submission has been removed from Firestore.',
                            )}
                          >
                            {busyAction === `delete-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Approved</p>
                  <div className="mt-2 text-3xl font-bold text-brand-green">{approvedSubmissions.length}</div>
                  <p className="mt-2 text-sm text-white/55">Published promises waiting in the feed.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Rejected</p>
                  <div className="mt-2 text-3xl font-bold text-white">{rejectedSubmissions.length}</div>
                  <p className="mt-2 text-sm text-white/55">Declined submissions kept for audit.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Spam</p>
                  <div className="mt-2 text-3xl font-bold text-brand-red">{spamSubmissions.length}</div>
                  <p className="mt-2 text-sm text-white/55">Low quality submissions you can clean up later.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {promises.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge>{entry.status}</Badge>
                        <h2 className="mt-3 text-xl font-bold">{entry.title}</h2>
                      </div>
                      <BarChart3 className="text-accent" />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/65">{entry.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'In Progress', progress: Math.max(entry.progress, 35), pinned: entry.pinned })}><CheckCircle2 size={14} /> Progress</Button>
                      <Button variant="outline" size="sm" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'Completed', progress: 100, pinned: entry.pinned })}><CheckCircle2 size={14} /> Complete</Button>
                      <Button variant="outline" size="sm" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'Failed', progress: entry.progress, pinned: entry.pinned })}><Ban size={14} /> Fail</Button>
                      <Button variant="outline" size="sm" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: entry.status, progress: entry.progress, pinned: !entry.pinned })}><Pin size={14} /> Pin</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {submissions.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/45">Pending submission</div>
                    <div className="mt-2 text-lg font-bold">{entry.title}</div>
                    <div className="mt-2 text-sm text-white/60">{entry.category} · {entry.district} · {entry.createdAt}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {comments.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.28em] text-white/45">Comment moderation</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={entry.moderationStatus === 'Spam' ? 'bg-brand-red/15 text-brand-red' : 'bg-white/10 text-white/70'}>
                            {entry.moderationStatus ?? 'Visible'}
                          </Badge>
                          <Badge className="bg-white/5 text-white/55">{entry.promiseId}</Badge>
                        </div>
                        <div className="mt-2 text-sm leading-7 text-white/75">{entry.content}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="icon" disabled={busyAction === `comment-approve-${entry.id}`} onClick={() => runAdminAction(
                          `comment-approve-${entry.id}`,
                          () => adminApproveComment({ commentId: entry.id }),
                          'Comment approved',
                          'The comment is visible again.',
                        )}>
                          {busyAction === `comment-approve-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        </Button>
                        <Button variant="outline" size="icon" disabled={busyAction === `comment-spam-${entry.id}`} onClick={() => runAdminAction(
                          `comment-spam-${entry.id}`,
                          () => adminMarkCommentSpam({ commentId: entry.id }),
                          'Comment marked as spam',
                          'The comment was hidden from the public feed.',
                        )}>
                          {busyAction === `comment-spam-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                        </Button>
                        <Button variant="ghost" size="icon" disabled={busyAction === `comment-delete-${entry.id}`} onClick={() => runAdminAction(
                          `comment-delete-${entry.id}`,
                          () => adminDeleteComment({ commentId: entry.id, promiseId: entry.promiseId }),
                          'Comment deleted',
                          'The comment has been removed.',
                        )}>
                          {busyAction === `comment-delete-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Spam comments</p>
                  <div className="mt-2 text-3xl font-bold text-brand-red">{spamComments.length}</div>
                  <p className="mt-2 text-sm text-white/55">Hidden from public promise pages.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Moderation tip</p>
                  <div className="mt-2 text-sm leading-7 text-white/70">
                    Use approve for genuine submissions, spam for obvious junk, and delete only when you want the record gone.
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Spam queue', `${spamCount} items hidden`],
                  ['Flagged comments', 'Spam comments stay out of public view'],
                  ['Top spike', 'Live promises update in Firestore'],
                ].map(([title, subtitle]) => (
                  <div key={title as string} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <MessageSquareWarning className="mb-3 text-brand-yellow" />
                    <div className="text-lg font-bold">{title as string}</div>
                    <div className="mt-1 text-sm text-white/55">{subtitle as string}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
