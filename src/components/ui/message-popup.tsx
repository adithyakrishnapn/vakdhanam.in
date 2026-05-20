import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type MessagePopupVariant = 'success' | 'error' | 'info';

interface MessagePopupProps {
  open: boolean;
  title: string;
  message: string;
  variant?: MessagePopupVariant;
  onClose: () => void;
}

const variantStyles: Record<MessagePopupVariant, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-brand-green/30 bg-brand-green/10 text-white',
    icon: <CheckCircle2 className="text-brand-green" size={20} />,
  },
  error: {
    container: 'border-brand-red/30 bg-brand-red/10 text-white',
    icon: <AlertTriangle className="text-brand-red" size={20} />,
  },
  info: {
    container: 'border-white/15 bg-white/[0.06] text-white',
    icon: <Info className="text-accent" size={20} />,
  },
};

export function MessagePopup({ open, title, message, variant = 'info', onClose }: MessagePopupProps) {
  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-x-0 top-6 z-[100] flex justify-center px-4"
        >
          <div className={`w-full max-w-md rounded-3xl border p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${styles.container}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/20">
                {styles.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold tracking-wide">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/75">{message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/70 transition hover:bg-black/30 hover:text-white"
                    aria-label="Close message"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}