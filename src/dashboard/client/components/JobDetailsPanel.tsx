import { useState } from 'react';
import { Job } from '../lib/types';
import { CompleteDataModal } from './CompleteDataModal';

interface JobDetailsPanelProps {
  job: Job;
}

interface DataQualityField {
  name: string;
  value: any;
  hasValue: boolean;
  isComplete: boolean;
}

export function JobDetailsPanel({ job }: JobDetailsPanelProps) {
  const [showCompleteData, setShowCompleteData] = useState(false);
  // Data quality assessment
  const assessDataQuality = (): DataQualityField[] => {
    const parseJsonField = (value: string | undefined): any => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const fields: DataQualityField[] = [
      // Core job data
      {
        name: 'Job Description',
        value: job.description,
        hasValue: !!job.description,
        isComplete: !!(job.description && job.description.trim().length > 100)
      },
      {
        name: 'Posted Date',
        value: job.posted_date,
        hasValue: !!job.posted_date,
        isComplete: !!(job.posted_date && job.posted_date.trim().length > 0)
      },
      // AI analysis outputs
      {
        name: 'Fit Reasons',
        value: job.fit_reasons,
        hasValue: !!job.fit_reasons,
        isComplete: (() => {
          const parsed = parseJsonField(job.fit_reasons);
          return Array.isArray(parsed) ? parsed.length > 0 : !!(job.fit_reasons && job.fit_reasons.trim().length > 0);
        })()
      },
      {
        name: 'Must Haves',
        value: job.must_haves,
        hasValue: !!job.must_haves,
        isComplete: (() => {
          const parsed = parseJsonField(job.must_haves);
          return Array.isArray(parsed) ? parsed.length > 0 : !!(job.must_haves && job.must_haves.trim().length > 0);
        })()
      },
      {
        name: 'Blockers',
        value: job.blockers,
        hasValue: !!job.blockers,
        isComplete: (() => {
          const parsed = parseJsonField(job.blockers);
          return Array.isArray(parsed) ? parsed.length > 0 : !!(job.blockers && job.blockers.trim().length > 0);
        })()
      },
      {
        name: 'Category Scores',
        value: job.category_scores,
        hasValue: !!job.category_scores,
        isComplete: (() => {
          const parsed = parseJsonField(job.category_scores);
          return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
        })()
      },
      {
        name: 'Missing Keywords',
        value: job.missing_keywords,
        hasValue: !!job.missing_keywords,
        isComplete: (() => {
          const parsed = parseJsonField(job.missing_keywords);
          return Array.isArray(parsed) ? parsed.length > 0 : !!(job.missing_keywords && job.missing_keywords.trim().length > 0);
        })()
      },
      // Application tracking
      {
        name: 'Applied Method',
        value: job.applied_method,
        hasValue: !!job.applied_method,
        isComplete: !!(job.applied_method && job.applied_method.trim().length > 0)
      },
      {
        name: 'Rejection Reason',
        value: job.rejection_reason,
        hasValue: !!job.rejection_reason,
        isComplete: !!(job.rejection_reason && job.rejection_reason.trim().length > 0)
      }
    ];
    return fields;
  };

  const formatJsonField = (value: string | undefined): any => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not valid JSON
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const timestamp = dateString.includes('Z') ? dateString : `${dateString}Z`;
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const dataQualityFields = assessDataQuality();
  const missingFields = dataQualityFields.filter(field => !field.hasValue);
  const emptyFields = dataQualityFields.filter(field => field.hasValue && !field.isComplete);
  const completeFields = dataQualityFields.filter(field => field.isComplete);

  const categoryScores = formatJsonField(job.category_scores);
  const missingKeywords = formatJsonField(job.missing_keywords);

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6">
      {/* Header with View All Data button */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Job Analysis</h3>
        <button
          onClick={() => setShowCompleteData(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>🔍</span>
          View All Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Job Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2">
            Job Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Job URL</label>
              <div className="mt-1">
                <a 
                  href={job.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {job.url}
                </a>
              </div>
            </div>
            
            {job.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Job Description</label>
                <div className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                  <div className="whitespace-pre-wrap">{job.description}</div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Posted Date</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(job.posted_date)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(job.created_at)}
                </div>
              </div>
            </div>
            
            {job.status_updated_at && job.status_updated_at !== job.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-600">Status Updated</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(job.status_updated_at)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Application Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2">
            Application Details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Applied Method</label>
              <div className="mt-1 text-sm text-gray-900">
                {job.applied_method ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    job.applied_method === 'manual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {job.applied_method === 'manual' ? '🤖 Manual' : '⚡ Automatic'}
                  </span>
                ) : 'N/A'}
              </div>
            </div>
            
            {job.rejection_reason && (
              <div>
                <label className="text-sm font-medium text-gray-600">Rejection Reason</label>
                <div className="mt-1 text-sm text-gray-900 bg-red-50 p-3 rounded-lg border border-red-200">
                  {job.rejection_reason}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2">
            AI Analysis
          </h3>
          <div className="space-y-3">
            {dataQualityFields.map((field) => (
              <div key={field.name}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-600">{field.name}</label>
                  {field.isComplete ? (
                    <span className="text-green-600">✅</span>
                  ) : field.hasValue ? (
                    <span className="text-yellow-600">⚠️</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                </div>
                <div className="text-sm text-gray-900 bg-white p-3 rounded-lg border border-gray-200">
                  {field.value ? (
                    <div className="whitespace-pre-wrap">{field.value}</div>
                  ) : (
                    <span className="text-gray-500 italic">No data available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2">
            Data Quality
          </h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✅</span>
                <span 
                  className="text-sm font-medium text-gray-700 cursor-help"
                  title="Core job data: Job Description, Posted Date | AI analysis: Fit Reasons, Must Haves, Blockers, Category Scores, Missing Keywords | Application tracking: Applied Method, Rejection Reason"
                >
                  Complete Fields
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {completeFields.length} of {dataQualityFields.length} fields have data
              </div>
            </div>

            {missingFields.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600">❌</span>
                  <span 
                    className="text-sm font-medium text-gray-700 cursor-help"
                    title="Fit Reasons, Must Haves, Blockers, Category Scores, Missing Keywords"
                  >
                    Missing Fields
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {missingFields.map(field => field.name).join(', ')}
                </div>
              </div>
            )}

            {emptyFields.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600">ℹ️</span>
                  <span 
                    className="text-sm font-medium text-gray-700 cursor-help"
                    title="Fields that are empty but valid (e.g., no blockers found)"
                  >
                    Empty Fields
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {emptyFields.map(field => field.name).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Data Display */}
      {(categoryScores || missingKeywords) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
            Raw Data
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categoryScores && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Category Scores (JSON)</label>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(categoryScores, null, 2)}
                </pre>
              </div>
            )}
            {missingKeywords && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Missing Keywords (JSON)</label>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(missingKeywords, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Data Modal */}
      <CompleteDataModal
        jobId={job.id}
        jobTitle={job.title}
        isOpen={showCompleteData}
        onClose={() => setShowCompleteData(false)}
      />
    </div>
  );
}
