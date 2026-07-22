import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastKind = 'error' | 'warning' | 'success' | 'info';

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastCtx = {
  toasts: Toast[];
  showToast: (message: string, kind?: ToastKind) => void;
  showError: (message: string) => void;
  dismiss: (id: number) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

let _nextId = 1;
const TTL: Record<ToastKind, number> = { error: 6000, warning: 5000, success: 3500, info: 4000 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = _nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), TTL[kind]));
    },
    [dismiss],
  );

  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);

  return (
    <Ctx.Provider value={{ toasts, showToast, showError, dismiss }}>{children}</Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
