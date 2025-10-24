import { useState } from 'react';
import { Job } from '../lib/types';
import { CompleteDataModal } from './CompleteDataModal';
import { JobDescriptionPanel } from './JobDescriptionPanel';
import { ChipList } from './ChipList';
import { CategoryScores } from './CategoryScoreBar';
import { DataQualityBadge } from './DataQualityBadge';

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
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(false);

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
  const categoryScores = formatJsonField(job.category_scores);
  const missingKeywords = formatJsonField(job.missing_keywords);
  const fitReasons = formatJsonField(job.fit_reasons);
  const mustHaves = formatJsonField(job.must_haves);
  const blockers = formatJsonField(job.blockers);

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6">
      {/* Header with Title and Data Quality Badge */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Job Analysis</h3>
          <DataQualityBadge 
            fields={dataQualityFields}
            onClick={() => setShowCompleteData(true)}
          />
        </div>
        <button
          onClick={() => setShowCompleteData(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>🔍</span>
          View All Data
        </button>
      </div>

      <div className="space-y-6">
        {/* Key Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Job Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            
            {job.status_updated_at && job.status_updated_at !== job.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-600">Status Updated</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(job.status_updated_at)}
                </div>
              </div>
            )}
          </div>
          
          {job.description && (
            <div className="mt-4">
              <button
                onClick={() => setShowDescriptionPanel(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>📄</span>
                View Full Description
              </button>
            </div>
          )}
        </div>

        {/* AI Analysis Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-md font-semibold text-gray-800 mb-4">AI Analysis</h4>
          <div className="space-y-4">
            {/* Fit Reasons */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Fit Reasons</label>
              <ChipList 
                items={Array.isArray(fitReasons) ? fitReasons : (fitReasons ? [fitReasons] : [])}
                variant="fit"
              />
            </div>

            {/* Must Haves */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Must Haves</label>
              <ChipList 
                items={Array.isArray(mustHaves) ? mustHaves : (mustHaves ? [mustHaves] : [])}
                variant="must-have"
              />
            </div>

            {/* Blockers */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Blockers</label>
              <ChipList 
                items={Array.isArray(blockers) ? blockers : (blockers ? [blockers] : [])}
                variant="blocker"
              />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Performance Metrics</h4>
          <div className="space-y-4">
            {/* Category Scores */}
            {categoryScores && (
              <div>
                <CategoryScores scores={categoryScores} />
              </div>
            )}

            {/* Missing Keywords */}
            {missingKeywords && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Missing Keywords</label>
                <ChipList 
                  items={Array.isArray(missingKeywords) ? missingKeywords : [missingKeywords]}
                  variant="missing"
                />
              </div>
            )}
          </div>
        </div>

        {/* Application Details */}
        {(job.applied_method || job.rejection_reason) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Application Details</h4>
            <div className="space-y-3">
              {job.applied_method && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Applied Method</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      job.applied_method === 'manual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {job.applied_method === 'manual' ? '🤖 Manual' : '⚡ Automatic'}
                    </span>
                  </div>
                </div>
              )}
              
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
        )}
      </div>

      {/* Job Description Panel */}
      <JobDescriptionPanel
        isOpen={showDescriptionPanel}
        onClose={() => setShowDescriptionPanel(false)}
        title={job.title}
        company={job.company}
        description={job.description || ''}
      />

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
