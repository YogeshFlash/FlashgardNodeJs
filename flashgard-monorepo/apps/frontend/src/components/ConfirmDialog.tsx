import React from 'react';
import { AlertCircle, X, Loader2, RotateCcw, CheckCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'primary' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  variant?: ConfirmVariant;
  errorMessage?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  isLoading = false,
  variant = 'danger',
  errorMessage,
}) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      iconColor: 'text-red-600',
      btn: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    },
    primary: {
      icon: RotateCcw,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      btn: 'bg-[var(--color-accent)] hover:bg-amber-600 shadow-amber-200',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    }
  }[variant];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="relative p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 leading-relaxed mb-4">
            {message}
          </p>

          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold active:scale-95 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${config.btn}`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
