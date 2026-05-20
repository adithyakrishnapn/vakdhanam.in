import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Upload, FileCheck2, ShieldCheck, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { promiseSubmissionSchema } from '@/lib/validator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Seo } from '@/components/seo/Seo';
import { useAppStore, districtOptions } from '@/store/useAppStore';
import { categories } from '@/data/mock';

type FormValues = z.infer<typeof promiseSubmissionSchema>;

export default function SubmitPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const submitPromise = useAppStore((state) => state.submitPromise);
  const authSession = useAppStore((state) => state.authSession);
  const loading = useAppStore((state) => state.loading);
  const isSubmitting = useAppStore((state) => state.isSubmitting);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(promiseSubmissionSchema),
    defaultValues: {
      title: '',
      description: '',
      sourceLink: '',
      screenshotUrl: '',
      electionYear: 2021,
      category: 'Governance',
      district: 'Thiruvananthapuram',
    },
  });

  useEffect(() => {
    if (!loading && !authSession) {
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`, { replace: true });
    }
  }, [authSession, loading, location.pathname, location.search, navigate]);

  if (!loading && !authSession) {
    return null;
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <Seo title="Submit a Vakdhanam" description="Submit a new political promise for admin review." path="/submit" />
      <Card>
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-brand-ink"><Upload /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Promise submission</p>
              <h1 className="text-3xl font-bold">Add a promise, not instant fame.</h1>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            {authSession
              ? `Signed in as ${authSession.displayName}. Your submission will go to the review queue.`
              : 'You need Google or email login to submit a promise. Soft profile is optional and only for reactions/comments.'}
          </div>

          <form
            className="grid gap-4"
            onSubmit={handleSubmit(async (values) => {
              setSubmitError('');
              try {
                await submitPromise({
                  ...values,
                  screenshotUrl: values.screenshotUrl?.trim() ? values.screenshotUrl.trim() : '',
                });
                setSuccess(true);
                navigate('/');
              } catch (error) {
                setSubmitError(error instanceof Error ? error.message : 'Submission failed');
              }
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input placeholder="Promise title" {...register('title')} />
                {errors.title && <p className="mt-2 text-xs text-danger">{errors.title.message}</p>}
              </div>
              <div>
                <Input placeholder="Source proof URL" {...register('sourceLink')} />
                {errors.sourceLink && <p className="mt-2 text-xs text-danger">{errors.sourceLink.message}</p>}
              </div>
            </div>
            <div>
              <Input placeholder="Optional screenshot URL (Imgur, Cloudinary, Drive public link, etc.)" {...register('screenshotUrl')} />
              {errors.screenshotUrl && <p className="mt-2 text-xs text-danger">{errors.screenshotUrl.message}</p>}
            </div>
            <div>
              <Textarea placeholder="Describe the promise with enough context that nobody can pretend it was vague." {...register('description')} />
              {errors.description && <p className="mt-2 text-xs text-danger">{errors.description.message}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input type="number" placeholder="Election year" {...register('electionYear', { valueAsNumber: true })} />
              <div className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-surface px-4 pr-11 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  {...register('category')}
                >
                  {categories.filter((value) => value !== 'All').map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" />
              </div>
              <div className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-surface px-4 pr-11 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  {...register('district')}
                >
                  {districtOptions.filter((value) => value !== 'All').map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45" />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/65">
              <div className="flex items-center gap-2 font-semibold text-white"><FileCheck2 size={16} /> Optional screenshot URL plus App Check gives you a low-cost submission flow.</div>
              <div className="mt-2 flex items-center gap-2 text-brand-green"><ShieldCheck size={16} /> Admin verification required before going live.</div>
            </div>

            <Button type="submit" disabled={isSubmitting || !authSession} className="w-full md:w-fit">
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Submit for review
            </Button>

            {submitError && <p className="text-sm text-danger">{submitError}</p>}
          </form>

          {success && <p className="text-sm text-brand-green">Submitted. The admin queue now has homework.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
