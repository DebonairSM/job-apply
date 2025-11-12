/**
 * Error Handling Utilities
 * 
 * Helper functions for safely extracting error messages from unknown error types.
 * Follows the error handling guidelines from docs/shared/error-handling.ANSWERS.md
 */

/**
 * API Error Response Interface
 * Standard error shape returned by our Express API
 */
interface ApiErrorResponse {
  error: string;
  details?: string;
  message?: string;
}

/**
 * Axios Error Interface (subset we care about)
 */
interface AxiosLikeError {
  response?: {
    data?: unknown;
  };
  message?: string;
}

/**
 * Safely extract error message from unknown error type
 * Checks for Axios errors, Error instances, and plain objects
 * 
 * @param error - Unknown error from catch block or error handler
 * @param defaultMessage - Fallback message if extraction fails
 * @returns Human-readable error message
 */
export function extractErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  // Check if it's an Error instance
  if (error instanceof Error) {
    return error.message;
  }
  
  // Check if it's an object (potential Axios error)
  if (error && typeof error === 'object') {
    // Try to extract Axios error response
    const axiosError = error as AxiosLikeError;
    if (axiosError.response?.data) {
      const responseData = axiosError.response.data;
      
      // Check if response data matches our API error format
      if (isApiErrorResponse(responseData)) {
        return responseData.error || responseData.message || defaultMessage;
      }
      
      // If response data is a string, use it
      if (typeof responseData === 'string') {
        return responseData;
      }
    }
    
    // Try to extract message property from any object
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  
  // Check if it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback to default message
  return defaultMessage;
}

/**
 * Type guard to check if object matches ApiErrorResponse shape
 */
function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('error' in obj || 'message' in obj)
  );
}

/**
 * Extract detailed error info including API details field
 * Returns an object with both error and details if available
 */
export function extractErrorDetails(error: unknown): { error: string; details?: string } {
  const message = extractErrorMessage(error);
  
  // Try to extract details field from API error
  if (error && typeof error === 'object') {
    const axiosError = error as AxiosLikeError;
    const responseData = axiosError.response?.data;
    
    if (responseData && typeof responseData === 'object' && 'details' in responseData) {
      const details = responseData.details;
      if (typeof details === 'string') {
        return { error: message, details };
      }
    }
  }
  
  return { error: message };
}

/**
 * Log error with context
 * Provides consistent error logging format
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
  
  // Log stack trace if available
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

