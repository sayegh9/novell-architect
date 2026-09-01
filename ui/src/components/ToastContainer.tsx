import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, detail?: string, duration?: number) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, detail?: string, duration: number = 3500) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, message, detail, duration };
      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, detail?: string) => toast('success', msg, detail), [toast]);
  const error = useCallback((msg: string, detail?: string) => toast('error', msg, detail, 5000), [toast]);
  const info = useCallback((msg: string, detail?: string) => toast('info', msg, detail), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full select-none">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 flex items-start gap-3 ${
                isSuccess
                  ? 'bg-emerald-950/80 dark:bg-emerald-950/80 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                  : isError
                  ? 'bg-rose-950/80 dark:bg-rose-950/80 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                  : 'bg-[#121622]/90 dark:bg-[#121622]/90 border-slate-700/60 text-slate-100 shadow-black/60'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-snug">{t.message}</div>
                {t.detail && <div className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{t.detail}</div>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="opacity-60 hover:opacity-100 text-current transition-opacity p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
