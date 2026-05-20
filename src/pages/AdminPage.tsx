import { useEffect, useState } from 'react';
import { Lock, CheckCircle2, Ban, Pin, MessageSquareWarning, BarChart3, Trash2 } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Seo } from '@/components/seo/Seo';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { adminDeleteComment, adminUpdatePromise } from '@/lib/firebase-api';
import { getFirebaseDb } from '@/lib/firebase';
import { mapCommentDocument, mapPromiseDocument, mapSubmissionDocument } from '@/lib/firestore-mappers';
import type { CommentItem, PromiseItem, SubmissionItem } from '@/types';

export default function AdminPage() {
  const authSession = useAppStore((state) => state.authSession);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);

  const isAdmin = authSession?.role === 'admin';

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

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Seo title="Admin" description="Hidden moderation dashboard for verified administrators only." path="/admin" />
      <Card>
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-red/15 text-brand-red"><Lock /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Admin dashboard</p>
              <h1 className="text-3xl font-bold">Promise moderation queue</h1>
            </div>
          </div>

          {!isAdmin ? (
            <div className="rounded-2xl border border-brand-red/30 bg-brand-red/10 p-5 text-sm text-white/75">
              This area is locked behind verified admin claims. Whitelist admin accounts in the account system, then set `admin: true` on the token.
            </div>
          ) : null}

          {isAdmin && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Live promises', promises.length],
                  ['Submissions queue', submissions.length],
                  ['Flagged comments', comments.length],
                ].map(([title, value]) => (
                  <div key={title as string} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <BarChart3 className="mb-3 text-accent" />
                    <div className="text-lg font-bold">{title as string}</div>
                    <div className="mt-1 text-sm text-white/55">{value as number} items</div>
                  </div>
                ))}
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
                        <div className="mt-2 text-sm leading-7 text-white/75">{entry.content}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => adminDeleteComment({ commentId: entry.id, promiseId: entry.promiseId })}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Spam queue', '12 reports waiting'],
                  ['Flagged comments', 'Moderate abusive content only from admin claims'],
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
    </div>
  );
}
