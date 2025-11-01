'use client';

import { useEffect } from 'react';

type ToastProps = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ type, title, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const iconStyles = {
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg max-w-md ${styles[type]}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${iconStyles[type]}`}>
          {icons[type]}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
