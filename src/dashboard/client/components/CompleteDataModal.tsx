import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { JsonViewer } from './JsonViewer';

interface CompleteDataModalProps {
  jobId: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteDataModal({ jobId, jobTitle, isOpen, onClose }: CompleteDataModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchCompleteData();
    }
  }, [isOpen, jobId]);

  const fetchCompleteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const completeData = await api.getCompleteJobData(jobId);
      setData(completeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllData = () => {
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId}-complete-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllData = async () => {
    if (!data) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = jsonString;
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
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-shrink">
            <h2 className="text-xl font-bold text-gray-900 truncate">Complete Job Data</h2>
            <p className="text-sm text-gray-600 truncate">{jobTitle}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0">
            {data && (
              <>
                <button
                  onClick={copyAllData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap text-sm sm:text-base"
                >
                  <span>📋</span>
                  <span className="hidden sm:inline">Copy All</span>
                  <span className="sm:hidden">Copy</span>
                </button>
                <button
                  onClick={downloadAllData}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap text-sm sm:text-base"
                >
                  <span>💾</span>
                  <span className="hidden sm:inline">Download All</span>
                  <span className="sm:hidden">Download</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm sm:text-base"
            >
              <span className="hidden sm:inline">✕ Close</span>
              <span className="sm:hidden">Close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading complete job data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <p className="text-red-800 font-medium">Error loading data</p>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchCompleteData}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Metadata Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Data Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Run Logs:</span>
                    <span className="ml-1 text-blue-700">{data.metadata.totalRunLogs}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Successful:</span>
                    <span className="ml-1 text-green-700">{data.metadata.successfulRuns}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Failed:</span>
                    <span className="ml-1 text-red-700">{data.metadata.failedRuns}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Has Screenshots:</span>
                    <span className="ml-1 text-blue-700">{data.metadata.hasScreenshots ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Job Data */}
              <JsonViewer 
                data={data.job} 
                title="Job Record" 
                defaultExpanded={true}
              />

              {/* Application Answers */}
              {data.answers && (
                <JsonViewer 
                  data={data.answers} 
                  title="Application Answers" 
                  defaultExpanded={false}
                />
              )}

              {/* Run Logs */}
              {data.runLogs && data.runLogs.length > 0 && (
                <JsonViewer 
                  data={data.runLogs} 
                  title={`Run Logs (${data.runLogs.length} entries)`} 
                  defaultExpanded={false}
                />
              )}

              {/* Label Mappings */}
              {data.labelMappings && data.labelMappings.length > 0 && (
                <JsonViewer 
                  data={data.labelMappings} 
                  title={`Label Mappings (${data.labelMappings.length} entries)`} 
                  defaultExpanded={false}
                />
              )}

              {/* Metadata */}
              <JsonViewer 
                data={data.metadata} 
                title="Metadata" 
                defaultExpanded={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
