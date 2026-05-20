import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Vote, Send, ShieldAlert, Share2 } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatCompactNumber, formatRelativeTime } from '@/lib/format';
import { sanitizeText } from '@/lib/sanitize';
import { fetchPromiseCommentsOnce, fetchPromiseOnce, subscribePromiseById, subscribePromiseComments } from '@/lib/firebase-api';
import type { PromiseItem, CommentItem } from '@/types';

export default function PromisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const votePromise = useAppStore((state) => state.votePromise);
  const addComment = useAppStore((state) => state.addComment);
  const [content, setContent] = useState('');
  const [promise, setPromise] = useState<PromiseItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const completionText = useMemo(() => {
    if (!promise) return 'Promise not found';
    return `${promise.progress}% complete, ${promise.status.toLowerCase()} on paper and in public memory`;
  }, [promise]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let alive = true;
    const promiseFallback = fetchPromiseOnce(id).then((entry) => {
      if (alive) {
        setPromise(entry);
        setLoading(false);
      }
    }).catch(() => {
      if (alive) {
        setPromise(null);
        setLoading(false);
      }
    });
    const unsubscribePromise = subscribePromiseById(id, (entry) => {
      if (alive) {
        setPromise(entry);
        setLoading(false);
      }
    });
    const unsubscribeComments = subscribePromiseComments(id, (items) => {
      if (alive) {
        setComments(items);
      }
    });

    const timeout = window.setTimeout(() => {
      if (alive) {
        setLoading(false);
      }
    }, 4000);

    void promiseFallback;

    return () => {
      alive = false;
      window.clearTimeout(timeout);
      unsubscribePromise();
      unsubscribeComments();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 text-center">
        <Card className="w-full p-8">
          <h1 className="text-3xl font-bold">Loading promises politicians forgot...</h1>
          <p className="mt-2 text-white/65">Fact checking speeches...</p>
        </Card>
      </div>
    );
  }

  if (!promise) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 text-center">
        <Card className="w-full p-8">
          <h1 className="text-3xl font-bold">Promise not found.</h1>
          <p className="mt-2 text-white/65">It may have been deleted, hidden, or simply lost in the political void.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Back home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <Seo title={promise.title} description={promise.description} path={`/promise/${promise.id}`} />

      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
        <Button variant="outline"><Share2 size={16} /> Share card</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{promise.status}</Badge>
              <Badge className="bg-brand-yellow/10 text-brand-yellow">{promise.category}</Badge>
              <Badge className="bg-white/5 text-white/70">{promise.district}</Badge>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">{promise.title}</h1>
            <p className="max-w-3xl text-lg leading-8 text-white/70">{promise.description}</p>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/70">
              {completionText}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Votes', formatCompactNumber(promise.votes)],
                ['Likes', formatCompactNumber(promise.likes)],
                ['Comments', formatCompactNumber(promise.commentsCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/45"><ShieldAlert size={14} /> Timeline</div>
              <div className="space-y-3">
                {promise.timeline.map((step) => (
                  <div key={step.label} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                    <span>{step.label}</span>
                    <span className={step.done ? 'text-brand-green' : 'text-white/35'}>{step.done ? 'Done' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              <Button onClick={() => votePromise(promise.id)}><Vote size={16} /> Vote first</Button>
              <Button variant="outline" onClick={() => navigate('/submit')}><MessageSquare size={16} /> Add another Vakdhanam</Button>
            </div>
            <div className="text-sm text-white/45">Source: <a href={promise.sourceLink} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">manifesto proof</a></div>
          </CardFooter>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Discussion</p>
              <h2 className="mt-2 text-2xl font-bold">Public comments</h2>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Drop your take. Soft account optional, chaos mandatory." />
              <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                <span>{profile ? `Posting as ${profile.username}` : 'Posting anonymously with a stable local identity.'}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    addComment({ promiseId: promise.id, content: sanitizeText(content) });
                    setContent('');
                  }}
                  disabled={!content.trim()}
                >
                  <Send size={14} /> Post
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/35">
                    <span>{comment.userId}</span>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="mt-3 leading-7 text-white/80">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/55">
                  No comments yet. Either everyone is thinking, or nobody has signed in.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
