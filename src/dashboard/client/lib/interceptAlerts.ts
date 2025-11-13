/**
 * Alert Interceptor
 * 
 * Intercepts native browser alerts and replaces them with modern toast notifications.
 * Handles alerts from both the application and external sources (like Sunny MCP integration).
 * 
 * This provides a consistent, modern notification experience throughout the application
 * without the tacky native browser alert dialogs.
 */

import { Toast } from '../contexts/ToastContext';

interface ToastMethods {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

interface AlertInterceptorOptions {
  /**
   * Toast notification methods from ToastContext
   * Should be the methods from useToast() hook
   */
  toast: ToastMethods;
  
  /**
   * Whether to log intercepted alerts to console for debugging
   * Default: false in production, true in development
   */
  debug?: boolean;
}

/**
 * Setup alert interceptor to replace native browser alerts with toast notifications
 * Call this once when the app initializes
 * 
 * @param options - Configuration for the alert interceptor
 * @returns Cleanup function to restore original alert behavior
 * 
 * @example
 * const toast = useToast();
 * const cleanup = setupAlertInterceptor({ toast });
 * // Later, when unmounting:
 * cleanup();
 */
export function setupAlertInterceptor(options: AlertInterceptorOptions): () => void {
  const { toast, debug = import.meta.env.DEV } = options;
  
  // Store original alert function
  const originalAlert = window.alert;
  
  // Replace with our interceptor
  window.alert = function(message?: unknown) {
    const messageStr = String(message || '');
    
    if (debug) {
      console.log('[Alert Interceptor] Caught alert:', messageStr);
    }
    
    // Determine toast type based on message content
    const type = determineToastType(messageStr);
    
    // Show toast using appropriate method
    switch (type) {
      case 'success':
        toast.success(messageStr, 5000);
        break;
      case 'error':
        toast.error(messageStr, 5000);
        break;
      case 'warning':
        toast.warning(messageStr, 5000);
        break;
      case 'info':
      default:
        toast.info(messageStr, 5000);
        break;
    }
  };
  
  // Return cleanup function
  return () => {
    window.alert = originalAlert;
  };
}

/**
 * Determine appropriate toast type based on message content
 * Looks for keywords to classify as success, error, warning, or info
 */
function determineToastType(message: string): Toast['type'] {
  const lowerMessage = message.toLowerCase();
  
  // Success indicators
  if (
    lowerMessage.includes('success') ||
    lowerMessage.includes('complete') ||
    lowerMessage.includes('done') ||
    lowerMessage.includes('saved') ||
    lowerMessage.includes('created') ||
    lowerMessage.includes('updated') ||
    lowerMessage.includes('branched successfully')
  ) {
    return 'success';
  }
  
  // Error indicators
  if (
    lowerMessage.includes('error') ||
    lowerMessage.includes('fail') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('wrong') ||
    lowerMessage.includes('denied')
  ) {
    return 'error';
  }
  
  // Warning indicators
  if (
    lowerMessage.includes('warning') ||
    lowerMessage.includes('careful') ||
    lowerMessage.includes('caution') ||
    lowerMessage.includes('attention')
  ) {
    return 'warning';
  }
  
  // Default to info
  return 'info';
}

/**
 * Parse multi-line alert messages into cleaner format
 * Handles messages like "Project branched successfully! 0 user stories copied."
 */
export function formatAlertMessage(message: string): string {
  // Split on common separators
  const lines = message.split(/[!\n]/).filter(line => line.trim());
  
  // If we have multiple lines, format them nicely
  if (lines.length > 1) {
    const mainMessage = lines[0].trim();
    const details = lines.slice(1).map(line => line.trim()).filter(Boolean);
    
    if (details.length > 0) {
      return `${mainMessage}. ${details.join('. ')}`;
    }
  }
  
  return message.trim();
}

