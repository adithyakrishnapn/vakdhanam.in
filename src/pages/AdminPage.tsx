import { useEffect, useMemo, useState } from 'react';
import { Lock, CheckCircle2, Ban, Pin, MessageSquareWarning, BarChart3, Trash2, Sparkles, AlertTriangle, ShieldCheck, Loader2, Pencil, Link2, ImageIcon } from 'lucide-react';
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
  adminUpdateSubmission,
  adminSyncMissingEvidence,
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
  const [editingSubmission, setEditingSubmission] = useState<SubmissionItem | null>(null);
  const [editingPromise, setEditingPromise] = useState<PromiseItem | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
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
                    const isEditing = editingSubmission?.id === entry.id;

                    if (isEditing) {
                      return (
                        <div key={entry.id} className="rounded-3xl border border-brand-yellow/30 bg-white/[0.04] p-5 space-y-4">
                          <div className="text-xs uppercase tracking-[0.28em] text-brand-yellow font-semibold">Editing Submission</div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-white/50 font-medium">Title</label>
                            <input
                              type="text"
                              value={editingSubmission.title}
                              onChange={(e) => setEditingSubmission({ ...editingSubmission, title: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-white/50 font-medium">Description</label>
                            <textarea
                              value={editingSubmission.description}
                              onChange={(e) => setEditingSubmission({ ...editingSubmission, description: e.target.value })}
                              rows={4}
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none min-h-[100px] resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Category</label>
                              <select
                                value={editingSubmission.category}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, category: e.target.value as any })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              >
                                {['Health', 'Education', 'Infrastructure', 'Jobs', 'Transport', 'Environment', 'Welfare', 'Governance'].map((cat) => (
                                  <option key={cat} value={cat} className="bg-neutral-900 text-white">{cat}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">District</label>
                              <input
                                type="text"
                                value={editingSubmission.district}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, district: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Election Year</label>
                              <input
                                type="number"
                                value={editingSubmission.electionYear}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, electionYear: parseInt(e.target.value) || 2021 })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Source Link</label>
                              <input
                                type="text"
                                value={editingSubmission.sourceLink}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, sourceLink: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-white/50 font-medium">Screenshot / Image URL</label>
                            <input
                              type="text"
                              value={editingSubmission.screenshotUrl || ''}
                              onChange={(e) => setEditingSubmission({ ...editingSubmission, screenshotUrl: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                            />
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyAction === `edit-save-${entry.id}`}
                              onClick={() => runAdminAction(
                                `edit-save-${entry.id}`,
                                async () => {
                                  await adminUpdateSubmission({
                                    submissionId: editingSubmission.id,
                                    title: editingSubmission.title,
                                    description: editingSubmission.description,
                                    category: editingSubmission.category,
                                    district: editingSubmission.district,
                                    electionYear: editingSubmission.electionYear,
                                    sourceLink: editingSubmission.sourceLink,
                                    screenshotUrl: editingSubmission.screenshotUrl || undefined,
                                  });
                                  setEditingSubmission(null);
                                },
                                'Submission updated',
                                'The submission has been successfully updated.',
                              )}
                              className="bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30 hover:bg-brand-yellow/25"
                            >
                              {busyAction === `edit-save-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Save Changes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyAction === `edit-save-${entry.id}`}
                              onClick={() => setEditingSubmission(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    }

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

                        {(entry.sourceLink || entry.screenshotUrl) && (
                          <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                            {entry.sourceLink && (
                              <div className="flex items-center gap-2 text-xs">
                                <Link2 size={14} className="text-accent" />
                                <span className="text-white/40 font-medium">Source Proof:</span>
                                <a
                                  href={entry.sourceLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline break-all"
                                >
                                  {entry.sourceLink}
                                </a>
                              </div>
                            )}

                            {entry.screenshotUrl && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
                                  <ImageIcon size={14} className="text-brand-yellow" />
                                  <span>Attached Evidence / Screenshot:</span>
                                </div>
                                <div
                                  onClick={() => setExpandedImage(entry.screenshotUrl || null)}
                                  className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-black/40 max-w-[240px]"
                                >
                                  <img
                                    src={entry.screenshotUrl}
                                    alt="Evidence screenshot"
                                    className="max-h-[120px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                                      Click to elaborate
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

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
                            disabled={busyAction !== ''}
                            onClick={() => setEditingSubmission({ ...entry })}
                          >
                            <Pencil size={14} />
                            Edit
                          </Button>
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

              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">Published promises</p>
                    <h2 className="text-2xl font-bold">Active live promises in feed</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyAction === 'sync-evidence'}
                      onClick={() => runAdminAction(
                        'sync-evidence',
                        async () => {
                          const count = await adminSyncMissingEvidence();
                          setPopup({
                            open: true,
                            title: 'Sync completed',
                            message: `Successfully backfilled proof evidence for ${count} promise(s).`,
                            variant: 'success'
                          });
                        },
                        'Sync completed',
                        'Proof evidence has been backfilled.',
                      )}
                      className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/25"
                    >
                      {busyAction === 'sync-evidence' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Sync Evidence from Submissions
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {promises.map((entry) => {
                    const isEditing = editingPromise?.id === entry.id;

                    if (isEditing) {
                      return (
                        <div key={entry.id} className="rounded-3xl border border-brand-yellow/30 bg-white/[0.04] p-5 space-y-4 col-span-1 md:col-span-2 xl:col-span-3">
                          <div className="text-xs uppercase tracking-[0.28em] text-brand-yellow font-semibold">Editing Live Promise Details</div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Title</label>
                              <input
                                type="text"
                                value={editingPromise.title}
                                onChange={(e) => setEditingPromise({ ...editingPromise, title: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">District</label>
                              <input
                                type="text"
                                value={editingPromise.district}
                                onChange={(e) => setEditingPromise({ ...editingPromise, district: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-white/50 font-medium">Description</label>
                            <textarea
                              value={editingPromise.description}
                              onChange={(e) => setEditingPromise({ ...editingPromise, description: e.target.value })}
                              rows={3}
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none min-h-[80px] resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Category</label>
                              <select
                                value={editingPromise.category}
                                onChange={(e) => setEditingPromise({ ...editingPromise, category: e.target.value as any })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              >
                                {['Health', 'Education', 'Infrastructure', 'Jobs', 'Transport', 'Environment', 'Welfare', 'Governance'].map((cat) => (
                                  <option key={cat} value={cat} className="bg-neutral-900 text-white">{cat}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Election Year</label>
                              <input
                                type="number"
                                value={editingPromise.electionYear}
                                onChange={(e) => setEditingPromise({ ...editingPromise, electionYear: parseInt(e.target.value) || 2021 })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Status</label>
                              <select
                                value={editingPromise.status}
                                onChange={(e) => setEditingPromise({ ...editingPromise, status: e.target.value as any })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              >
                                {['Pending', 'In Progress', 'Completed', 'Failed'].map((status) => (
                                  <option key={status} value={status} className="bg-neutral-900 text-white">{status}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Progress ({editingPromise.progress}%)</label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={editingPromise.progress}
                                onChange={(e) => setEditingPromise({ ...editingPromise, progress: parseInt(e.target.value) || 0 })}
                                className="w-full h-10 accent-brand-yellow animate-none"
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Source Proof Link</label>
                              <input
                                type="text"
                                value={editingPromise.sourceLink || ''}
                                onChange={(e) => setEditingPromise({ ...editingPromise, sourceLink: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-white/50 font-medium">Screenshot / Evidence Image URL</label>
                              <input
                                type="text"
                                value={editingPromise.screenshotUrl || ''}
                                onChange={(e) => setEditingPromise({ ...editingPromise, screenshotUrl: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyAction === `promise-save-${entry.id}`}
                              onClick={() => runAdminAction(
                                `promise-save-${entry.id}`,
                                async () => {
                                  await adminUpdatePromise({
                                    promiseId: editingPromise.id,
                                    title: editingPromise.title,
                                    description: editingPromise.description,
                                    category: editingPromise.category,
                                    district: editingPromise.district,
                                    electionYear: editingPromise.electionYear,
                                    sourceLink: editingPromise.sourceLink,
                                    screenshotUrl: editingPromise.screenshotUrl || null,
                                    status: editingPromise.status,
                                    progress: editingPromise.progress,
                                    pinned: editingPromise.pinned,
                                  });
                                  setEditingPromise(null);
                                },
                                'Promise updated',
                                'The promise details have been successfully updated.',
                              )}
                              className="bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30 hover:bg-brand-yellow/25"
                            >
                              {busyAction === `promise-save-${entry.id}` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Save Changes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyAction === `promise-save-${entry.id}`}
                              onClick={() => setEditingPromise(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 flex flex-col justify-between h-full hover:border-white/20 transition-all duration-300">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Badge>{entry.status}</Badge>
                              {entry.pinned && <Badge className="ml-2 bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20">Pinned</Badge>}
                              <h3 className="mt-3 text-xl font-bold leading-tight">{entry.title}</h3>
                            </div>
                            <BarChart3 className="text-accent shrink-0" />
                          </div>
                          
                          <p className="text-sm leading-7 text-white/65 line-clamp-3">{entry.description}</p>

                          {(entry.sourceLink || entry.screenshotUrl) && (
                            <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                              {entry.sourceLink && (
                                <div className="flex items-center gap-1.5">
                                  <Link2 size={12} className="text-accent shrink-0" />
                                  <span className="text-white/40">Proof:</span>
                                  <a href={entry.sourceLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">{entry.sourceLink}</a>
                                </div>
                              )}
                              {entry.screenshotUrl && (
                                <div className="flex items-center gap-1.5">
                                  <ImageIcon size={12} className="text-brand-yellow shrink-0" />
                                  <span className="text-white/40">Evidence Screenshot Attached</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 text-[11px] text-white/45">
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5">{entry.category}</span>
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5">{entry.district}</span>
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5">{entry.electionYear}</span>
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-medium text-brand-yellow">{entry.progress}% progress</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'In Progress', progress: Math.max(entry.progress, 35), pinned: entry.pinned })}><CheckCircle2 size={12} /> Progress</Button>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'Completed', progress: 100, pinned: entry.pinned })}><CheckCircle2 size={12} /> Complete</Button>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: 'Failed', progress: entry.progress, pinned: entry.pinned })}><Ban size={12} /> Fail</Button>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5" onClick={() => adminUpdatePromise({ promiseId: entry.id, status: entry.status, progress: entry.progress, pinned: !entry.pinned })}><Pin size={12} /> Pin</Button>
                          <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5 hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setEditingPromise({ ...entry })}>
                            <Pencil size={12} /> Edit Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
          <img
            src={expandedImage}
            alt="Elaborated evidence"
            className="max-h-[90vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
