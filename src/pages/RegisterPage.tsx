import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, Chrome, ShieldCheck } from 'lucide-react';
import { createUserWithEmailAndPassword, getRedirectResult, onAuthStateChanged, sendEmailVerification, updateProfile, signInWithRedirect } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Seo } from '@/components/seo/Seo';
import { useAppStore } from '@/store/useAppStore';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authSession = useAppStore((state) => state.authSession);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    void getRedirectResult(auth).catch(() => undefined);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email ?? '');
        setUsername(user.displayName ?? user.email?.split('@')[0] ?? '');
      }
    });

    return unsubscribe;
  }, []);

  async function handleGoogleRegister() {
    const auth = getFirebaseAuth();
    if (!auth) {
      setMessage('Account service is not configured. Check your environment values.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await signInWithRedirect(auth, getGoogleProvider());
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailRegister() {
    const auth = getFirebaseAuth();
    if (!auth) return;

    setBusy(true);
    setMessage('');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const next = searchParams.get('next');
      const destination = next && next.startsWith('/') ? next : '/me';
      await updateProfile(result.user, { displayName: username });
      await sendEmailVerification(result.user);
      setMessage('Account created. Verification email sent.');
      navigate(destination, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <Seo title="Register" description="Create an account to submit promises and manage your own activity." path="/register" />
      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Register</p>
            <h1 className="text-4xl font-bold">Create your account.</h1>
            <p className="text-white/65">Use an account to submit promises, open your dashboard, and remove your own comments or pending submissions.</p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-green" /> Verified accounts can submit promises for review.</div>
              <div className="flex items-center gap-2"><Mail size={16} className="text-white" /> Email and Google both create a normal account.</div>
            </div>
            {authSession && (
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-white/80">
                Signed in as {authSession.displayName}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Display name" />
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
            <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleGoogleRegister} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Chrome size={16} />} Continue with Google
              </Button>
              <Button onClick={handleEmailRegister} disabled={busy || !username || !email || !password}>
                <Mail size={16} /> Create account
              </Button>
            </div>
            {message && <div className="text-sm text-white/65">{message}</div>}
            <div className="text-xs text-white/40">New accounts stay signed in on this device after registration.</div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/40">
              <span>Already have an account?</span>
              <Link to="/login" className="text-accent underline underline-offset-4">Login</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
