import { useCallback, useMemo, useState } from 'react';
import type { FeedMode } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { Flame, Search, Filter, Sparkles, ArrowRight, ShieldCheck, MessageSquare, ArrowUpDown, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessagePopup } from '@/components/ui/message-popup';
import { useAppStore, categoryOptions, districtOptions } from '@/store/useAppStore';
import { formatCompactNumber } from '@/lib/format';
import PromiseCard from '@/components/promise/PromiseCard';
import { Seo } from '@/components/seo/Seo';

const heroCopy = 'ഓർമ്മയുണ്ടോ ഈ വാഗ്ദാനം?';

export default function HomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const promises = useAppStore((state) => state.promises);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [district, setDistrict] = useState('All');
  const [feedMode, setFeedMode] = useState<FeedMode>('trending');

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategory('All');
    setDistrict('All');
    setFeedMode('trending');
  }, []);
  const loading = useAppStore((state) => state.loading);
  const firebaseReady = useAppStore((state) => state.firebaseReady);
  const authSession = useAppStore((state) => state.authSession);
  const profile = useAppStore((state) => state.profile);

  const showPopup = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setPopup({ open: true, title, message, variant });
  };

  const normalize = (value: string) => value.trim().toLowerCase();

  const keralaDistricts = useMemo(
    () => new Set(districtOptions.filter((option) => option !== 'All' && option !== 'Kerala').map(normalize)),
    [],
  );

  const matchesDistrict = (promiseDistrict: string, selected: string) => {
    if (selected === 'All') {
      return true;
    }
    const normalizedPromiseDistrict = normalize(promiseDistrict);
    const normalizedSelected = normalize(selected);
    if (normalizedSelected === 'kerala') {
      return normalizedPromiseDistrict === 'kerala' || keralaDistricts.has(normalizedPromiseDistrict);
    }
    return normalizedPromiseDistrict === normalizedSelected;
  };

  const matchesCategory = (entry: (typeof promises)[number], selected: string) => {
    if (selected === 'All') {
      return true;
    }
    const selectedCategory = normalize(selected);
    return [entry.category, entry.minister ?? ''].some((value) => normalize(String(value)) === selectedCategory);
  };

  const matchesSearch = (entry: (typeof promises)[number], query: string) => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return true;
    }
    const haystack = [
      entry.title,
      entry.description,
      entry.category,
      entry.district,
      entry.minister ?? '',
      entry.status,
      String(entry.electionYear),
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  };

  const feedTitle = useMemo(() => {
    switch (feedMode) {
      case 'votes':
        return 'Most voted promises';
      case 'recent':
        return 'Recent promises';
      case 'completed':
        return 'Completed promises';
      default:
        return 'Trending promises';
    }
  }, [feedMode]);

  const filtered = useMemo(() => {
    let items = [...promises];
    if (searchQuery.trim()) {
      items = items.filter((entry) => matchesSearch(entry, searchQuery));
    }
    if (category !== 'All') {
      items = items.filter((entry) => matchesCategory(entry, category));
    }
    if (district !== 'All') {
      items = items.filter((entry) => matchesDistrict(entry.district, district));
    }
    switch (feedMode) {
      case 'votes':
        return items.sort((a, b) => b.votes - a.votes);
      case 'recent':
        return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      case 'completed':
        return items.filter((entry) => entry.status === 'Completed').sort((a, b) => b.votes - a.votes || b.trendScore - a.trendScore);
      default:
        return items.sort((a, b) => b.trendScore - a.trendScore);
    }
  }, [promises, searchQuery, category, district, feedMode, keralaDistricts]);

  const topThree = filtered.slice(0, 3);
  const trimmedSearch = searchQuery.trim();

  const searchInput = (placeholder: string, className?: string) => (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/35" size={18} />
      <Input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={placeholder}
        aria-label="Search promises"
        className="relative z-20 w-full pl-11"
      />
    </div>
  );

  return (
    <div className="relative w-full max-w-[100vw] overflow-x-hidden">
      <Seo
        title="Vakdhanam.in"
        description="Track election promises, vote on what should happen first, and keep political memory alive."
      />
      <div className="pointer-events-none absolute inset-0 soft-grid opacity-20" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-hero-grid opacity-80" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left self-start">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-brand-ink shadow-glow">
                <Flame size={20} />
              </span>
              <span>
                <span className="block font-display text-lg font-bold tracking-tight">Vakdhanam.in</span>
                <span className="hidden text-[11px] uppercase tracking-[0.3em] text-white/45 sm:block">Promises fade. Internet remembers.</span>
              </span>
            </button>

            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex">
            {searchInput('Search promises, ministers, districts, or the lies people remember', 'w-full max-w-lg')}
          </div>

          <div className="hidden items-center gap-2 md:flex md:w-auto md:justify-end">
            {authSession ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/me')}>
                {authSession.displayName}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Login</Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/register')}>Register</Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/submit')}>Submit promise</Button>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={mobileMenuOpen ? 'open' : 'closed'}
          variants={{
            open: { height: 'auto', opacity: 1 },
            closed: { height: 0, opacity: 0 },
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="overflow-hidden md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-4">
            {searchInput('Search promises, ministers, districts...')}

            <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl">
              {authSession ? (
                <Button variant="ghost" className="justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/me'); }}>
                  {authSession.displayName}
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>Login</Button>
                  <Button variant="outline" className="justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>Register</Button>
                </>
              )}
              <Button variant="outline" className="justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/submit'); }}>Submit promise</Button>
            </div>
          </div>
        </motion.div>
      </header>

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
        <section className="grid min-w-0 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="relative min-w-0 overflow-hidden border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 sm:p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-brand-green/10 blur-3xl" />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-accent/40 bg-accent/10 text-accent">Live public memory</Badge>
              </div>
              <div className="space-y-4">
                <p className="font-malayalam text-2xl font-semibold text-white/85 md:text-3xl">{heroCopy}</p>
                <h1 className="max-w-3xl break-words font-display text-3xl font-bold leading-[0.95] tracking-tight text-balance text-white sm:text-4xl md:text-7xl">
                  Keep politicians on a public receipt trail.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/70 md:text-lg">
                  Vote on which promise should be fulfilled first, react like the internet always does, and let the community decide which manifesto line deserves to age badly next.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/submit')}><Sparkles size={18} /> Submit a Vakdhanam</Button>
                <Button variant="outline" onClick={() => document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' })}>
                  <ArrowDownIcon /> Explore feed
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Tracked promises', formatCompactNumber(promises.length)],
                  ['Votes cast', formatCompactNumber(promises.reduce((sum, item) => sum + item.votes, 0))],
                  ['Comments', formatCompactNumber(promises.reduce((sum, item) => sum + item.commentsCount, 0))],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
                  </div>
                ))}
              </div>
              {!firebaseReady && (
                <div className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 text-sm text-brand-yellow">
                  Backend account service is not connected yet. Check your .env values.
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-5">
              <CardContent className="space-y-4 px-0 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Live poll</p>
                    <h2 className="text-xl font-bold">Which Vakdhanam should happen first?</h2>
                  </div>
                  <ShieldCheck className="text-accent" />
                </div>
                {topThree.map((item, index) => (
                  <div key={item.id} className="space-y-2 rounded-2xl border border-white/8 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="line-clamp-1 font-medium">{index + 1}. {item.title}</span>
                      <span className="text-white/50">{Math.max(20, 64 - index * 14)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent via-white to-brand-green" style={{ width: `${Math.max(20, 64 - index * 14)}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="relative border-b border-white/10 bg-gradient-to-r from-white/10 to-transparent p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Meme banner</p>
                <h3 className="mt-2 text-2xl font-bold">Loading promises politicians forgot...</h3>
              </div>
              <div className="grid gap-3 p-5">
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  Fact checking speeches one district at a time.
                </div>
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  Searching manifestos so you do not have to open that PDF again.
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-8 min-w-0 space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-accent" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Search</p>
            </div>
            {searchInput('Search by title, district, sector, or status...')}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-accent" />
              <p className="text-xs uppercase tracking-[0.3em] text-white/45 font-semibold">Sector</p>
            </div>
            <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoryOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={category === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(option)}
                  className={`shrink-0 ${category === option ? '' : 'hover:bg-white/10'}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-brand-yellow" />
              <p className="text-xs uppercase tracking-[0.3em] text-white/45 font-semibold">Location</p>
            </div>
            <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none">
              {districtOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={district === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDistrict(option)}
                  className={`shrink-0 ${district === option ? '' : 'hover:bg-white/10'}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {(trimmedSearch || category !== 'All' || district !== 'All') && (
            <div className="border-t border-white/5 pt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearFilters();
                  showPopup('Filters cleared', 'Sector, place, and sort reset to default.', 'success');
                }}
                className="text-xs"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </section>

        <section id="feed" className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[1fr_0.35fr]">
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Public feed</p>
                <h2 className="text-2xl font-bold sm:text-3xl">{feedTitle}</h2>
                <p className="mt-1 text-sm text-white/50">
                  {filtered.length} {filtered.length === 1 ? 'promise' : 'promises'}
                  {trimmedSearch && ` matching "${trimmedSearch}"`}
                  {(category !== 'All' || district !== 'All') && ` · ${category !== 'All' ? category : 'All sectors'} · ${district !== 'All' ? district : 'All places'}`}
                </p>
              </div>
              <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none sm:w-auto sm:flex-wrap sm:overflow-visible">
                {[
                  ['Trending', 'trending'],
                  ['Votes', 'votes'],
                  ['Recent', 'recent'],
                  ['Completed', 'completed'],
                ].map(([label, value]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={feedMode === value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFeedMode(value as FeedMode)}
                    className={`shrink-0 sm:shrink ${feedMode === value ? '' : 'hover:bg-white/10'}`}
                  >
                    <ArrowUpDown size={14} /> {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid min-w-0 gap-4">
              {loading && (
                <Card className="p-10 text-center text-white/60">
                  Loading promises politicians forgot...
                </Card>
              )}
              {filtered.map((item, index) => (
                <motion.div key={item.id} className="min-w-0 w-full" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                  <PromiseCard
                    promise={item}
                    onFeedback={(feedback) => showPopup(feedback.title, feedback.message, feedback.variant)}
                  />
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <Card className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/8 text-accent">
                    <MessageSquare />
                  </div>
                  <h3 className="text-xl font-bold">
                    {trimmedSearch ? 'No promises match your search.' : 'Nothing matches this filter yet.'}
                  </h3>
                  <p className="mt-2 text-white/60">
                    {trimmedSearch
                      ? 'Try fewer words, another spelling, or clear search to see the full feed.'
                      : 'Try another district or bring a fresh Vakdhanam into the arena.'}
                  </p>
                  <div className="mt-5">
                    <Button variant="outline" onClick={clearFilters}>Reset filters</Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <Card className="p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Why this exists</p>
              <div className="mt-3 space-y-3 text-sm leading-7 text-white/70">
                <p>Democracy, but with receipts.</p>
                <p>Fast public voting with local identity, server-side moderation, and no direct client writes for sensitive actions.</p>
                <p>Built to feel like a feed people actually want to revisit.</p>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Most voted today</p>
              <div className="mt-4 space-y-3">
                {promises
                  .slice()
                  .sort((a, b) => b.votes - a.votes)
                  .slice(0, 4)
                  .map((item) => (
                    <button key={item.id} onClick={() => navigate(`/promise/${item.id}`)} className="w-full rounded-2xl border border-white/8 bg-white/5 p-3 text-left transition hover:border-accent/40 hover:bg-white/8">
                      <div className="text-sm font-semibold line-clamp-2">{item.title}</div>
                      <div className="mt-1 text-xs text-white/45">{item.district} · {formatCompactNumber(item.votes)} votes</div>
                    </button>
                  ))}
              </div>
            </Card>
          </aside>
        </section>
      </main>
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

function ArrowDownIcon() {
  return <ArrowRight size={18} className="rotate-90" />;
}
