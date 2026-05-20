import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Vote, Send, ShieldAlert, Share2, ImageIcon, Link2, ArrowUp, ArrowDown, Smile } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatCompactNumber, formatRelativeTime } from '@/lib/format';
import { sanitizeText } from '@/lib/sanitize';
import { fetchPromiseCommentsOnce, fetchPromiseOnce, subscribePromiseById, subscribePromiseComments } from '@/lib/firebase-api';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { PromiseItem, CommentItem } from '@/types';

export default function PromisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const votePromise = useAppStore((state) => state.votePromise);
  const likePromise = useAppStore((state) => state.likePromise);
  const dislikePromise = useAppStore((state) => state.dislikePromise);
  const addComment = useAppStore((state) => state.addComment);
  const [content, setContent] = useState('');
  const [promise, setPromise] = useState<PromiseItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [enrichedScreenshotUrl, setEnrichedScreenshotUrl] = useState<string | null>(null);
  const [showMemeReacts, setShowMemeReacts] = useState(false);
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);

  const memeEmojis = ['😂', '🤦', '😤', '😡', '🙄', '😒', '👏', '🎉', '❤️', '🔥', '💯', '👌'];

  const completionText = useMemo(() => {
    if (!promise) return 'Promise not found';
    return `${promise.progress}% complete, ${promise.status.toLowerCase()} on paper and in public memory`;
  }, [promise]);

  const handleAnimatedClick = async (buttonId: string, action: () => Promise<void>) => {
    setAnimatingButton(buttonId);
    try {
      await action();
    } finally {
      setTimeout(() => setAnimatingButton(null), 600);
    }
  };

  const handleShare = async () => {
    if (!promise) return;
    const url = `${window.location.origin}/promise/${promise.id}`;
    const text = `Check out this promise: ${promise.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: promise.title,
          text: text,
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleMemeReact = async (emoji: string) => {
    console.log('Meme react:', emoji);
    setShowMemeReacts(false);
    // Here you could add actual tracking of meme reactions to Firebase if needed
  };

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

  // Fetch screenshot from submission if promise doesn't have one
  useEffect(() => {
    if (!id || promise?.screenshotUrl) {
      setEnrichedScreenshotUrl(null);
      return;
    }

    let alive = true;
    const fetchSubmissionScreenshot = async () => {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        
        const submissionSnap = await getDoc(doc(db, 'submissions', id));
        if (alive && submissionSnap.exists()) {
          const submissionData = submissionSnap.data() as any;
          if (submissionData?.screenshotUrl) {
            setEnrichedScreenshotUrl(submissionData.screenshotUrl);
          }
        }
      } catch (err) {
        // Silent fail - if we can't fetch the submission, just continue
      }
    };

    fetchSubmissionScreenshot();

    return () => {
      alive = false;
    };
  }, [id, promise?.screenshotUrl]);

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
        <Button
          variant="outline"
          onClick={() => handleAnimatedClick('share', handleShare)}
          className={animatingButton === 'share' ? 'animate-bounce' : ''}
        >
          <Share2 size={16} /> Share card
        </Button>
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

            {(promise.sourceLink || promise.screenshotUrl || enrichedScreenshotUrl) && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-white/45 font-semibold">
                  Verification & Evidence
                </div>

                {promise.sourceLink && (
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 size={16} className="text-accent" />
                    <span className="text-white/55 font-medium">Source link:</span>
                    <a
                      href={promise.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline underline-offset-4 hover:text-accent/85 break-all"
                    >
                      {promise.sourceLink}
                    </a>
                  </div>
                )}

                {(promise.screenshotUrl || enrichedScreenshotUrl) && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <ImageIcon size={14} className="text-brand-yellow" />
                      <span>Attached Screenshot:</span>
                    </div>
                    <div
                      onClick={() => setExpandedImage(promise.screenshotUrl || enrichedScreenshotUrl)}
                      className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-black/40 max-w-md"
                    >
                      <img
                        src={promise.screenshotUrl || enrichedScreenshotUrl || ''}
                        alt="Proof evidence screenshot"
                        className="max-h-[300px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
                          Click to elaborate image
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              <Button
                onClick={() => handleAnimatedClick('like', () => likePromise(promise.id))}
                className={animatingButton === 'like' ? 'animate-pulse' : ''}
              >
                <ArrowUp size={16} /> Like
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAnimatedClick('dislike', () => dislikePromise(promise.id))}
                className={animatingButton === 'dislike' ? 'animate-pulse' : ''}
              >
                <ArrowDown size={16} /> Dislike
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAnimatedClick('vote', () => votePromise(promise.id))}
                className={animatingButton === 'vote' ? 'animate-bounce' : ''}
              >
                <Vote size={16} /> Vote
              </Button>
            </div>
            <div className="flex gap-2 relative">
              <Button
                variant="ghost"
                onClick={() => navigate(`/promise/${promise.id}#comments`)}
              >
                <MessageSquare size={16} /> Discuss
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowMemeReacts(!showMemeReacts)}
                  className={showMemeReacts ? 'bg-white/10' : ''}
                >
                  <Smile size={16} /> React
                </Button>
                {showMemeReacts && (
                  <div className="absolute bottom-12 right-0 z-50 rounded-2xl border border-white/10 bg-black/95 p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 shadow-xl">
                    <div className="grid grid-cols-6 gap-2">
                      {memeEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleMemeReact(emoji)}
                          className="text-xl transition hover:scale-125 active:scale-150 duration-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button variant="ghost" onClick={() => navigate('/submit')}>
                <MessageSquare size={16} /> Add another
              </Button>
            </div>
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
