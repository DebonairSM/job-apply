import { useState } from 'react';
import { Job } from '../lib/types';
import { useToast } from '../contexts/ToastContext';

interface CoverLetterModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export function CoverLetterModal({ job, isOpen, onClose }: CoverLetterModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { error: showError } = useToast();

  const generateCoverLetter = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/cover-letter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          description: job.description,
          fitReasons: job.fit_reasons,
          mustHaves: job.must_haves,
          blockers: job.blockers,
          categoryScores: job.category_scores,
          missingKeywords: job.missing_keywords
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate cover letter');
      }

      const data = await response.json();
      setCoverLetter(data.coverLetter);
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
        await navigator.clipboard.writeText(coverLetter);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = coverLetter;
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
      showError('Failed to copy to clipboard. Please try again.');
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
              Cover Letter for {job.title}
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
          {!coverLetter ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Generate Personalized Cover Letter
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Create a realistic, professional cover letter tailored to this specific job posting using AI analysis.
                </p>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <button
                onClick={generateCoverLetter}
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate Cover Letter
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                <h3 className="text-lg font-semibold text-gray-900">Generated Cover Letter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <span>📋</span>
                    Copy
                  </button>
                  <button
                    onClick={() => setCoverLetter('')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <span>🔄</span>
                    Regenerate
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                    {coverLetter}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
