import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ToastProvider.css';

const ToastContext = createContext(null);
const TYPES = {
  success: { icon: CheckCircle2, label: 'Success', duration: 5000 },
  info: { icon: Info, label: 'Information', duration: 6000 },
  warning: { icon: AlertTriangle, label: 'Warning', duration: 0 },
  error: { icon: AlertCircle, label: 'Error', duration: 0 },
};

function Toast({ toast, dismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { icon: Icon, label, duration } = TYPES[toast.type];

  useEffect(() => {
    if (!duration || hovered || focused) return undefined;
    const timer = setTimeout(() => dismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [duration, hovered, focused, toast.id, dismiss]);

  return (
    <div className={`app-toast app-toast--${toast.type}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <Icon className="app-toast-icon" size={22} aria-hidden="true" />
      <div className="app-toast-message" role={toast.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
        <strong>{label}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" className="app-toast-close" aria-label={`Dismiss ${label.toLowerCase()} message`}
        onClick={() => dismiss(toast.id)}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const notify = useCallback((message, type = 'success') => {
    const safeType = Object.prototype.hasOwnProperty.call(TYPES, type) ? type : 'info';
    const toast = { id: ++nextId.current, message, type: safeType };
    // Repeated clicks should not produce a stack of identical announcements.
    setToasts((items) => [toast, ...items.filter((item) => item.message !== message)].slice(0, 3));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <section className="app-toast-stack" aria-label="Notifications">
        {toasts.map((toast) => <Toast key={toast.id} toast={toast} dismiss={dismiss} />)}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used inside ToastProvider');
  return notify;
}
