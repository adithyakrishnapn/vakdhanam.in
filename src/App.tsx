import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Seo } from '@/components/seo/Seo';
import { useAppStore } from '@/store/useAppStore';

const HomePage = lazy(() => import('@/pages/HomePage'));
const PromisePage = lazy(() => import('@/pages/PromisePage'));
const SubmitPage = lazy(() => import('@/pages/SubmitPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const LoginPage = lazy(() => import('@/pages/AuthPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function ThemeSync() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}

export default function App() {
  const location = useLocation();
  const init = useAppStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <ThemeSync />
      <Seo
        title="Promises fade. Internet remembers."
        description="Vakdhanam.in is Kerala's viral civic accountability platform for tracking promises, votes, comments, and public pressure."
      />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="min-h-screen w-full max-w-[100vw] overflow-x-hidden"
        >
          <Suspense
            fallback={
              <div className="grid min-h-screen place-items-center px-6 text-center text-white/70">
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">Loading promises politicians forgot...</div>
                  <div className="text-2xl font-bold text-white">Fact checking speeches...</div>
                </div>
              </div>
            }
          >
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/promise/:id" element={<PromisePage />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/me" element={<DashboardPage />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
    </>
  );
}
