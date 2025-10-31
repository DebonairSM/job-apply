import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export function Toast({ id, type, message, duration = 5000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`${typeStyles[type]} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-in`}>
      <span className="text-xl flex-shrink-0">{icons[type]}</span>
      <p className="flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string; duration?: number }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-slide-in">
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}

export interface UseToastReturn {
  toasts: Array<{ id: string; type: ToastType; message: string; duration?: number }>;
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string; duration?: number }>>([]);

  const showToast = (type: ToastType, message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, showToast, dismissToast };
}
