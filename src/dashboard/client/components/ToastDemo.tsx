import React from 'react';
import { useToast } from '../contexts/ToastContext';

/**
 * Toast Demo Component
 * Demonstrates the modern toast notification system
 * Can be added to Settings or any page to test notifications
 */
export function ToastDemo() {
  const { success, error, info, warning } = useToast();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Toast Notifications Demo
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Test the modern toast notification system. These replace old browser alerts with beautiful, animated notifications.
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => success('Operation completed successfully!')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Success Toast
        </button>
        
        <button
          onClick={() => error('Something went wrong. Please try again.')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Error Toast
        </button>
        
        <button
          onClick={() => info('Here is some helpful information for you.')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Info Toast
        </button>
        
        <button
          onClick={() => warning('Please review this before continuing.')}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
        >
          Warning Toast
        </button>
        
        <button
          onClick={() => {
            success('First notification', 10000);
            setTimeout(() => info('Second notification', 10000), 300);
            setTimeout(() => warning('Third notification', 10000), 600);
            setTimeout(() => error('Fourth notification', 10000), 900);
          }}
          className="col-span-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Multiple Toasts (Stacking Demo)
        </button>
        
        <button
          onClick={() => {
            // This will be intercepted and converted to a toast
            window.alert('This alert is automatically converted to a toast!');
          }}
          className="col-span-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Test Alert Interception
        </button>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> The alert interception automatically converts browser alerts 
          (including those from external services like Sunny MCP) into modern toast notifications.
        </p>
      </div>
    </div>
  );
}


