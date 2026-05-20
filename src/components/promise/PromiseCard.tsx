import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, MessageCircle, Vote, Share2, Smile, MapPin, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatCompactNumber } from '@/lib/format';
import type { PromiseItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  promise: PromiseItem;
}

const statusClass: Record<PromiseItem['status'], string> = {
  Pending: 'bg-brand-yellow/15 text-brand-yellow',
  'In Progress': 'bg-blue-500/15 text-blue-300',
  Completed: 'bg-brand-green/15 text-brand-green',
  Failed: 'bg-brand-red/15 text-brand-red',
};

export default function PromiseCard({ promise }: Props) {
  const navigate = useNavigate();
  const likePromise = useAppStore((state) => state.likePromise);
  const dislikePromise = useAppStore((state) => state.dislikePromise);
  const votePromise = useAppStore((state) => state.votePromise);

  return (
    <Card className={`overflow-hidden ${promise.pinned ? 'ring-1 ring-accent/40' : ''}`}>
      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusClass[promise.status]}>{promise.status}</Badge>
              {promise.verified && <Badge className="border-brand-green/30 bg-brand-green/10 text-brand-green">Verified</Badge>}
              {promise.pinned && <Badge className="border-accent/30 bg-accent/10 text-accent">Pinned</Badge>}
            </div>
            <button onClick={() => navigate(`/promise/${promise.id}`)} className="text-left">
              <h3 className="text-2xl font-bold leading-tight text-white hover:text-accent">{promise.title}</h3>
            </button>
            <p className="max-w-3xl text-sm leading-7 text-white/65">{promise.description}</p>
          </div>
          <button onClick={() => navigate(`/promise/${promise.id}`)} className="rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:border-accent/40 hover:text-white">
            <Link2 size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1"><MapPin size={12} /> {promise.district}</span>
          <span className="rounded-full bg-white/5 px-3 py-1">{promise.category}</span>
          <span className="rounded-full bg-white/5 px-3 py-1">{promise.minister ?? 'Cabinet watch'}</span>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/8 bg-black/25 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
            <span>Progress</span>
            <span>{promise.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-accent via-white to-brand-green" initial={{ width: 0 }} animate={{ width: `${promise.progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
          {[
            [<ArrowUp key="up" size={16} />, formatCompactNumber(promise.likes)],
            [<ArrowDown key="down" size={16} />, formatCompactNumber(promise.dislikes)],
            [<MessageCircle key="comments" size={16} />, formatCompactNumber(promise.commentsCount)],
            [<Vote key="vote" size={16} />, formatCompactNumber(promise.votes)],
          ].map(([icon, value]) => (
            <span key={String(value)} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-2">
              {icon} {value}
            </span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => likePromise(promise.id)}><ArrowUp size={14} /> Like</Button>
          <Button variant="outline" size="sm" onClick={() => dislikePromise(promise.id)}><ArrowDown size={14} /> Dislike</Button>
          <Button variant="outline" size="sm" onClick={() => votePromise(promise.id)}><Vote size={14} /> Vote</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/promise/${promise.id}`)}><MessageCircle size={14} /> Discuss</Button>
          <Button variant="ghost" size="sm"><Share2 size={14} /> Share</Button>
          <Button variant="ghost" size="sm"><Smile size={14} /> Meme react</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
