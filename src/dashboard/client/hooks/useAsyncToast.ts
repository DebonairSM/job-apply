/**
 * Async Toast Hook
 * 
 * Wraps async operations with automatic toast notifications
 * Simplifies error handling and success messaging
 */

import { useToast } from '../contexts/ToastContext';

interface AsyncToastOptions<T> {
  /**
   * The async function to execute
   */
  operation: () => Promise<T>;
  
  /**
   * Success message to display (optional)
   * If omitted, no success toast is shown
   */
  successMessage?: string;
  
  /**
   * Error message prefix (optional)
   * Default: "Operation failed"
   */
  errorPrefix?: string;
  
  /**
   * Callback after successful operation (optional)
   */
  onSuccess?: (result: T) => void;
  
  /**
   * Callback after failed operation (optional)
   */
  onError?: (error: Error) => void;
  
  /**
   * Show loading toast during operation (optional)
   * Default: false
   */
  showLoading?: boolean;
  
  /**
   * Loading message to display (optional)
   * Only used if showLoading is true
   */
  loadingMessage?: string;
}

/**
 * Hook that wraps async operations with automatic toast notifications
 * Handles success and error cases with appropriate toast messages
 * 
 * @example
 * const executeWithToast = useAsyncToast();
 * 
 * await executeWithToast({
 *   operation: () => updateProfile(data),
 *   successMessage: 'Profile updated!',
 *   errorPrefix: 'Failed to update profile'
 * });
 */
export function useAsyncToast() {
  const { success, error, info } = useToast();
  
  return async <T>(options: AsyncToastOptions<T>): Promise<T | null> => {
    const {
      operation,
      successMessage,
      errorPrefix = 'Operation failed',
      onSuccess,
      onError,
      showLoading = false,
      loadingMessage = 'Processing...'
    } = options;
    
    try {
      // Show loading toast if requested
      if (showLoading && loadingMessage) {
        info(loadingMessage, 2000);
      }
      
      // Execute the operation
      const result = await operation();
      
      // Show success toast if message provided
      if (successMessage) {
        success(successMessage);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
      
    } catch (err) {
      // Format error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const fullMessage = `${errorPrefix}: ${errorMessage}`;
      
      // Show error toast
      error(fullMessage);
      
      // Call error callback if provided
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      return null;
    }
  };
}

/**
 * Hook for simpler async operations that just need success/error toasts
 * Uses default error prefix and doesn't support callbacks
 * 
 * @example
 * const showResult = useSimpleToast();
 * 
 * await showResult(
 *   () => deleteItem(id),
 *   'Item deleted successfully'
 * );
 */
export function useSimpleToast() {
  const executeWithToast = useAsyncToast();
  
  return async <T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorPrefix?: string
  ): Promise<T | null> => {
    return executeWithToast({
      operation,
      successMessage,
      errorPrefix
    });
  };
}

