import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, LogOut, ShieldCheck, Loader2, Chrome, ArrowLeft } from 'lucide-react';
import { getRedirectResult, onAuthStateChanged, signInWithEmailAndPassword, signInWithRedirect, signOut, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessagePopup } from '@/components/ui/message-popup';
import { Seo } from '@/components/seo/Seo';
import { useAppStore } from '@/store/useAppStore';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';

export default function AuthPage() {
  const navigate = useNavigate();
  const authSession = useAppStore((state) => state.authSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    void getRedirectResult(auth).catch(() => undefined);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email ?? '');
      }
    });

    return unsubscribe;
  }, []);

  async function handleGoogleLogin() {
    const auth = getFirebaseAuth();
    if (!auth) {
      setPopup({ open: true, title: 'Account service missing', message: 'Firebase is not configured on this device.', variant: 'error' });
      return;
    }

    setBusy(true);
    setPopup({ open: false, title: '', message: '', variant: 'info' });
    try {
      setPopup({ open: true, title: 'Connecting to Google', message: 'Opening secure Google sign-in window...', variant: 'info' });
      await signInWithPopup(auth, getGoogleProvider());
      setPopup({ open: true, title: 'Login successful', message: 'Taking you to your dashboard.', variant: 'success' });
      window.setTimeout(() => navigate('/me', { replace: true }), 1000);
    } catch (popupError) {
      try {
        setPopup({ open: true, title: 'Redirecting', message: 'Opening full page Google sign-in...', variant: 'info' });
        await signInWithRedirect(auth, getGoogleProvider());
      } catch (redirectError) {
        const message = redirectError instanceof Error ? redirectError.message : 'Unable to log in with Google.';
        setPopup({ open: true, title: 'Google Login failed', message, variant: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (authSession) {
      setPopup({ open: true, title: 'Login successful', message: 'Taking you to your dashboard.', variant: 'success' });
      const timer = window.setTimeout(() => {
        navigate('/me', { replace: true });
      }, 1000);

      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [authSession, navigate]);

  async function handleEmailLogin() {
    const auth = getFirebaseAuth();
    if (!auth) return;

    setBusy(true);
    setPopup({ open: false, title: '', message: '', variant: 'info' });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPopup({ open: true, title: 'Login successful', message: 'Taking you to your dashboard.', variant: 'success' });
      window.setTimeout(() => navigate('/me', { replace: true }), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in right now.';
      setPopup({ open: true, title: 'Login failed', message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    const auth = getFirebaseAuth();
    if (!auth) return;

    setBusy(true);
    try {
      await signOut(auth);
      useAppStore.getState().signOutSession();
      setPopup({ open: true, title: 'Signed out', message: 'You are now logged out.', variant: 'success' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-6 md:py-12 space-y-4">
      <Seo title="Login" description="Login to submit promises and manage your own dashboard." path="/login" />
      
      <div className="flex justify-start">
        <Button variant="ghost" className="gap-2 text-white/60 hover:text-white" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Home
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Login</p>
            <h1 className="text-4xl font-bold">Welcome back.</h1>
            <p className="text-white/65">Light reactions and comments can stay anonymous. Use a signed-in account to submit promises and open your dashboard.</p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-green" /> Admin access comes from verified claims only.</div>
              <div className="flex items-center gap-2"><Mail size={16} className="text-white" /> Email sign-in and Google sign-in both unlock the same account.</div>
            </div>
            {authSession && (
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-white/80">
                Signed in as {authSession.displayName} · {authSession.emailVerified ? 'email verified' : 'email pending'} · role: {authSession.role}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
            <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleGoogleLogin} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Chrome size={16} />} Google login
              </Button>
              <Button variant="outline" onClick={handleEmailLogin} disabled={busy}>
                <Mail size={16} /> Email login
              </Button>
              <Button variant="ghost" onClick={handleLogout} disabled={busy || !authSession}>
                <LogOut size={16} /> Sign out
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/40">
              <span>Want a new account instead?</span>
              <Link to="/register" className="text-accent underline underline-offset-4">Register</Link>
            </div>
          </div>
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
