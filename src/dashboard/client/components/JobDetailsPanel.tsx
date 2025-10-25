import { useState } from 'react';
import { Job } from '../lib/types';
import { CompleteDataModal } from './CompleteDataModal';
import { JobDescriptionPanel } from './JobDescriptionPanel';
import { ChipList } from './ChipList';
import { CategoryScores } from './CategoryScoreBar';
import { DataQualityBadge } from './DataQualityBadge';
import { formatDate, formatRelativeTime } from '../lib/dateUtils';
import { CoverLetterModal } from './CoverLetterModal';
import { HeadlineSummaryModal } from './HeadlineSummaryModal';

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
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [showHeadlineSummary, setShowHeadlineSummary] = useState(false);

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

  const formatDateLocal = (dateString: string | undefined): string => {
    return formatRelativeTime(dateString);
  };

  const dataQualityFields = assessDataQuality();
  const categoryScores = formatJsonField(job.category_scores);
  const missingKeywords = formatJsonField(job.missing_keywords);
  const fitReasons = formatJsonField(job.fit_reasons);
  const mustHaves = formatJsonField(job.must_haves);
  const blockers = formatJsonField(job.blockers);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-t-2 border-gray-300 p-4 sm:p-6">
      {/* Header with Title and Data Quality Badge */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">Job Analysis</h3>
          <DataQualityBadge 
            fields={dataQualityFields}
            onClick={() => setShowCompleteData(true)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCoverLetterModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-all hover:shadow-md flex items-center gap-2 text-sm"
          >
            <span>📝</span>
            <span>Generate Cover Letter</span>
          </button>
          <button
            onClick={() => setShowHeadlineSummary(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-all hover:shadow-md flex items-center gap-2 text-sm"
          >
            <span>📋</span>
            <span>Headline Summary</span>
          </button>
          <button
            onClick={() => setShowCompleteData(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-all hover:shadow-md flex items-center gap-2 text-sm"
          >
            <span>🔍</span>
            <span className="hidden sm:inline">View All Data</span>
            <span className="sm:hidden">Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Job Information */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">ℹ️</span>
              Job Information
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job URL</label>
                <div className="mt-1">
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs break-all underline"
                  >
                    {job.url}
                  </a>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Posted Date</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDateLocal(job.posted_date)}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</label>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDateLocal(job.created_at)}
                </div>
              </div>
              
              {job.status_updated_at && job.status_updated_at !== job.created_at && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status Updated</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatDateLocal(job.status_updated_at)}
                  </div>
                </div>
              )}
            </div>
            
            {job.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDescriptionPanel(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-all hover:shadow-md flex items-center justify-center gap-2 text-sm w-full"
                >
                  <span>📄</span>
                  <span>View Full Description</span>
                </button>
              </div>
            )}
          </div>

          {/* Application Details in Left Column */}
          {(job.applied_method || job.rejection_reason) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-purple-600">📋</span>
                Application Details
              </h4>
              <div className="space-y-3">
                {job.applied_method && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied Method</label>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        job.applied_method === 'manual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {job.applied_method === 'manual' ? '✅ Manual' : '🤖 Automatic'}
                      </span>
                    </div>
                  </div>
                )}
                
                {job.rejection_reason && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rejection Reason</label>
                    <div className="mt-1 text-sm text-gray-900 bg-red-50 p-3 rounded-md border border-red-200">
                      {job.rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle Column - AI Analysis */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-600">🤖</span>
              AI Analysis
            </h4>
            <div className="space-y-4">
              {/* Fit Reasons */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Fit Reasons
                </label>
                <ChipList 
                  items={Array.isArray(fitReasons) ? fitReasons : (fitReasons ? [fitReasons] : [])}
                  variant="fit"
                />
              </div>

              {/* Must Haves */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Must Haves
                </label>
                <ChipList 
                  items={Array.isArray(mustHaves) ? mustHaves : (mustHaves ? [mustHaves] : [])}
                  variant="must-have"
                />
              </div>

              {/* Blockers */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Blockers
                </label>
                <ChipList 
                  items={Array.isArray(blockers) ? blockers : (blockers ? [blockers] : [])}
                  variant="blocker"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Performance Metrics */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-orange-600">📊</span>
              Performance Metrics
            </h4>
            <div className="space-y-4">
              {/* Category Scores */}
              {categoryScores && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">
                    Category Scores
                  </label>
                  <CategoryScores scores={categoryScores} />
                </div>
              )}

              {/* Missing Keywords */}
              {missingKeywords && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Missing Keywords
                  </label>
                  <ChipList 
                    items={Array.isArray(missingKeywords) ? missingKeywords : [missingKeywords]}
                    variant="missing"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job Description Panel */}
      <JobDescriptionPanel
        isOpen={showDescriptionPanel}
        onClose={() => setShowDescriptionPanel(false)}
        title={job.title}
        company={job.company}
        description={job.description || ''}
        job={job}
      />

      {/* Complete Data Modal */}
      <CompleteDataModal
        jobId={job.id}
        jobTitle={job.title}
        isOpen={showCompleteData}
        onClose={() => setShowCompleteData(false)}
      />

      {/* Cover Letter Modal */}
      <CoverLetterModal
        job={job}
        isOpen={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
      />

      {/* Headline Summary Modal */}
      <HeadlineSummaryModal
        job={job}
        isOpen={showHeadlineSummary}
        onClose={() => setShowHeadlineSummary(false)}
      />
    </div>
  );
}
