import React, { useState, useMemo } from 'react';
import { useJobs } from '../hooks/useJobs';
import { api } from '../lib/api';
import { Job } from '../lib/types';
import { formatRank } from '../lib/formatUtils';
import { formatRelativeTime } from '../lib/dateUtils';
import { JobDetailsPanel } from './JobDetailsPanel';
import { useToastContext } from '../contexts/ToastContext';

type SortField = 'rank' | 'title' | 'company' | 'date';
type SortDirection = 'asc' | 'desc';

interface SkippedJobsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function SkippedJobsPanel({ isExpanded, onToggle }: SkippedJobsPanelProps) {
  const { showToast } = useToastContext();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [profileFilter, setProfileFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [restoringJobIds, setRestoringJobIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useJobs({
    status: 'skipped',
    limit: 500 // Get more skipped jobs since they accumulate
  });

  const jobs = data?.jobs || [];

  // Extract unique profiles for filter
  const profiles = useMemo(() => {
    const profileSet = new Set<string>();
    jobs.forEach(job => {
      if (job.profile) {
        profileSet.add(job.profile);
      }
    });
    return Array.from(profileSet).sort();
  }, [jobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter((job: Job) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = job.title.toLowerCase().includes(query);
          const matchesCompany = job.company.toLowerCase().includes(query);
          if (!matchesTitle && !matchesCompany) return false;
        }

        // Profile filter
        if (profileFilter && job.profile !== profileFilter) {
          return false;
        }

        return true;
      })
      .sort((a: Job, b: Job) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'rank':
            aValue = a.rank || 0;
            bValue = b.rank || 0;
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'company':
            aValue = a.company.toLowerCase();
            bValue = b.company.toLowerCase();
            break;
          case 'date':
            aValue = new Date(a.created_at || '').getTime();
            bValue = new Date(b.created_at || '').getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [jobs, searchQuery, profileFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleRestoreToQueue = async (jobId: string) => {
    setRestoringJobIds(prev => new Set(prev).add(jobId));
    try {
      await api.updateJobStatus(jobId, 'queued');
      await refetch();
    } catch (error) {
      console.error('Failed to restore job to queue:', error);
      showToast('error', 'Failed to restore job to queue');
    } finally {
      setRestoringJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const expandAll = () => {
    setExpandedJobIds(new Set(filteredAndSortedJobs.map(job => job.id)));
  };

  const collapseAll = () => {
    setExpandedJobIds(new Set());
  };

  const hasAnyExpanded = filteredAndSortedJobs.some(job => expandedJobIds.has(job.id));

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Skipped Jobs</h2>
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
            {filteredAndSortedJobs.length}
            {filteredAndSortedJobs.length !== jobs.length && ` of ${jobs.length}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
            >
              Refresh
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeConfirmed={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or company..."
                  onClick={(e) => e.stopPropagation()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile</label>
                <select
                  value={profileFilter}
                  onChange={(e) => setProfileFilter(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Profiles</option>
                  {profiles.map(profile => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(searchQuery || profileFilter) && (
              <div className="mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    setProfileFilter('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          {filteredAndSortedJobs.length > 0 && (
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedJobs.length} skipped job{filteredAndSortedJobs.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAnyExpanded) {
                      collapseAll();
                    } else {
                      expandAll();
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  {hasAnyExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
            </div>
          )}

          {/* Jobs Table */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading skipped jobs...</div>
          ) : filteredAndSortedJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {jobs.length === 0 ? 'No skipped jobs found' : 'No jobs match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <span title="Expand/Collapse">...</span>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-20"
                      onClick={() => handleSort('rank')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">Rank</span>
                        {getSortIcon('rank')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        Title
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('company')}
                    >
                      <div className="flex items-center gap-1">
                        Company
                        {getSortIcon('company')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profile
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedJobs.map((job: Job) => {
                    const isExpanded = expandedJobIds.has(job.id);
                    return (
                      <React.Fragment key={job.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleJobExpansion(job.id);
                              }}
                              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors mx-auto"
                              title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <svg
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`font-bold text-lg px-3 py-1 rounded-lg ${
                              (job.rank || 0) >= 90 ? 'bg-green-100 text-green-800' :
                              (job.rank || 0) >= 75 ? 'bg-blue-100 text-blue-800' :
                              (job.rank || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {formatRank(job.rank)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm break-words"
                            >
                              {job.title}
                            </a>
                          </td>
                          <td className="px-4 py-4 text-sm break-words">
                            {job.company}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {job.profile ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                                {job.profile}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-xs">
                            {job.easy_apply ? '⚡ Easy Apply' : '🔗 External'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                            {formatRelativeTime(job.created_at)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreToQueue(job.id);
                              }}
                              disabled={restoringJobIds.has(job.id)}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              {restoringJobIds.has(job.id) ? '...' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 px-6 py-4">
                              <JobDetailsPanel job={job} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

