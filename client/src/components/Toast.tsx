import { createPortal } from 'react-dom';
import { useToast, type ToastKind } from '@/context/ToastContext';
import s from './Toast.module.css';

const ICONS: Record<ToastKind, string> = {
  error: 'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  success: 'fa-circle-check',
  info: 'fa-circle-info',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return createPortal(
    <div className={s.stack} aria-live="assertive" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`${s.toast} ${s[t.kind]}`} role="alert">
          <i className={`fa-solid ${ICONS[t.kind]}`} aria-hidden="true" />
          <span className={s.msg}>{t.message}</span>
          <button className={s.close} onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
