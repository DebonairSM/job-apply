import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

/**
 * ConfirmDialog Provider Component
 * Manages confirmation dialogs across the application
 * Replaces browser's native confirm() with a modern modal
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      await options.onConfirm();
    }
    setIsOpen(false);
    setOptions(null);
  };

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    setIsOpen(false);
    setOptions(null);
  };

  const value: ConfirmDialogContextValue = {
    confirm,
  };

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {isOpen && options && (
        <ConfirmDialog
          {...options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

/**
 * Hook to access confirmation dialog
 * Use this to trigger confirmation modals from anywhere in the app
 * 
 * @example
 * const { confirm } = useConfirm();
 * confirm({
 *   title: 'Delete Lead',
 *   message: 'Are you sure you want to delete this lead?',
 *   confirmLabel: 'Delete',
 *   confirmVariant: 'danger',
 *   onConfirm: async () => {
 *     await deleteLeadApi(leadId);
 *   }
 * });
 */
export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
}

/**
 * Internal ConfirmDialog Component
 * Displays the actual modal dialog
 */
interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmClick = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  // Get button styles based on variant
  const getConfirmButtonClass = () => {
    const baseClass = 'px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (confirmVariant) {
      case 'danger':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700`;
      case 'warning':
        return `${baseClass} bg-yellow-600 text-white hover:bg-yellow-700`;
      case 'primary':
      default:
        return `${baseClass} bg-purple-600 text-white hover:bg-purple-700`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={isProcessing ? undefined : onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slide-in-right">
        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          {title}
        </h2>
        
        {/* Message */}
        <p className="text-gray-700 mb-6 leading-relaxed">
          {message}
        </p>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isProcessing}
            className={getConfirmButtonClass()}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

