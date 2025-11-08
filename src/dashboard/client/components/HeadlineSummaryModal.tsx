import { useState, useEffect } from 'react';
import { Job } from '../lib/types';
import { useToastContext } from '../contexts/ToastContext';

interface HeadlineSummaryModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export function HeadlineSummaryModal({ job, isOpen, onClose }: HeadlineSummaryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [headlineSummary, setHeadlineSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { showToast } = useToastContext();

  useEffect(() => {
    // Auto-generate headline summary when modal opens
    if (isOpen && !headlineSummary && !isGenerating) {
      generateHeadlineSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const generateHeadlineSummary = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      // Generate a concise headline summary from job data
      const fitReasons = job.fit_reasons ? JSON.parse(job.fit_reasons) : [];
      const mustHaves = job.must_haves ? JSON.parse(job.must_haves) : [];
      const categoryScores = job.category_scores ? JSON.parse(job.category_scores) : {};

      const response = await fetch('/api/headline/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          description: job.description,
          fitReasons: fitReasons,
          mustHaves: mustHaves,
          categoryScores: categoryScores
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate headline summary');
      }

      const data = await response.json();
      setHeadlineSummary(data.headline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(headlineSummary);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = headlineSummary;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showToast('error', 'Failed to copy to clipboard. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-4 flex items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              Headline Summary: {job.title}
            </h2>
            <p className="text-sm text-gray-600 truncate">{job.company}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Generating headline summary...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button
                onClick={generateHeadlineSummary}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : headlineSummary ? (
            <div className="space-y-4">
                             <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                 <h3 className="text-lg font-semibold text-gray-900">Professional Headline</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <span>📋</span>
                    Copy
                  </button>
                  <button
                    onClick={generateHeadlineSummary}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <span>🔄</span>
                    Refresh
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="text-base sm:text-lg leading-relaxed text-gray-900">
                  {headlineSummary}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
