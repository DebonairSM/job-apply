import * as React from 'react';
import { Job } from '../lib/types';
import { highlightKeywords } from '../lib/highlightKeywords';

const { useEffect, useMemo } = React;

interface JobDescriptionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  company: string;
  description: string;
  job?: Job; // Optional full job object for highlighting
}

export function JobDescriptionPanel({ 
  isOpen, 
  onClose, 
  title, 
  company, 
  description,
  job
}: JobDescriptionPanelProps) {
  // Parse keywords from job data
  const { mustHaves, blockers } = useMemo(() => {
    if (!job) return { mustHaves: [], blockers: [] };
    
    const parseJsonField = (value: string | undefined): string[] => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    
    return {
      mustHaves: parseJsonField(job.must_haves),
      blockers: parseJsonField(job.blockers)
    };
  }, [job]);
  
  // Generate highlighted HTML
  const highlightedDescription = useMemo(() => {
    if (!description) return '';
    
    // Always apply highlighting (uses static keywords + AI data)
    return highlightKeywords(description, { mustHaves, blockers });
  }, [description, mustHaves, blockers]);
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } sm:w-full sm:max-w-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 id="panel-title" className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h2>
            <p className="text-sm text-gray-600 truncate">{company}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {description ? (
            <>
              {/* Legend for highlighting */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Keyword Highlighting:</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-4 h-4 bg-green-200 border border-green-300 rounded"></span>
                    <span className="text-gray-600">Microsoft Ecosystem Match</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-4 h-4 bg-red-200 border border-red-300 rounded"></span>
                    <span className="text-gray-600">Non-Microsoft / Prohibitive</span>
                  </div>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div 
                  className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightedDescription }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-gray-400 text-4xl mb-4">📄</div>
                <p className="text-gray-500 text-lg">No description available</p>
                <p className="text-gray-400 text-sm mt-2">
                  The job description could not be retrieved or is empty.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
