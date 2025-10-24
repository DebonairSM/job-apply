import React, { useState, useEffect } from 'react';
import { useJobs } from '../hooks/useJobs';
import { api } from '../lib/api';
import { Job } from '../lib/types';
import { JobDetailsPanel } from './JobDetailsPanel';

const statusColors = {
  queued: 'bg-yellow-100 text-yellow-800',
  applied: 'bg-green-100 text-green-800',
  interview: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
  reported: 'bg-purple-100 text-purple-800'
};

type SortField = 'title' | 'company' | 'rank' | 'status' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';

export function JobsList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [easyApplyFilter, setEasyApplyFilter] = useState<string>('');
  const [appliedMethodFilter, setAppliedMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minRank, setMinRank] = useState<number>(0);
  const [updatingJobIds, setUpdatingJobIds] = useState<Set<string>>(new Set());
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [clickedJobId, setClickedJobId] = useState<string | null>(null);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const { data, isLoading, refetch } = useJobs({
    status: statusFilter || undefined,
    easyApply: easyApplyFilter === 'true' ? true : easyApplyFilter === 'false' ? false : undefined,
    limit: 100
  });

  // Load clicked job ID from localStorage on component mount
  useEffect(() => {
    const savedClickedJobId = localStorage.getItem('clickedJobId');
    if (savedClickedJobId) {
      setClickedJobId(savedClickedJobId);
    }
  }, []);

  // Save clicked job ID to localStorage when it changes
  useEffect(() => {
    if (clickedJobId) {
      localStorage.setItem('clickedJobId', clickedJobId);
    } else {
      localStorage.removeItem('clickedJobId');
    }
  }, [clickedJobId]);

  // Client-side filtering and sorting
  const filteredAndSortedJobs = data?.jobs.filter(job => {
    // Applied method filter
    if (appliedMethodFilter) {
      if (appliedMethodFilter === 'manual' && job.applied_method !== 'manual') return false;
      if (appliedMethodFilter === 'automatic' && job.applied_method !== 'automatic') return false;
    }
    
    // Search filter (title or company)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = job.title.toLowerCase().includes(query);
      const matchesCompany = job.company.toLowerCase().includes(query);
      if (!matchesTitle && !matchesCompany) return false;
    }
    
    // Rank filter
    if (minRank > 0 && (job.rank || 0) < minRank) return false;
    
    return true;
  }).sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'company':
        aValue = a.company.toLowerCase();
        bValue = b.company.toLowerCase();
        break;
      case 'rank':
        aValue = a.rank || 0;
        bValue = b.rank || 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'type':
        aValue = a.easy_apply ? 'easy' : 'external';
        bValue = b.easy_apply ? 'easy' : 'external';
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
  }) || [];

  const handleMarkAsApplied = async (jobId: string) => {
    setUpdatingJobIds(prev => new Set(prev).add(jobId));
    try {
      await api.updateJobStatus(jobId, 'applied', 'manual');
      await refetch();
      // Clear highlight if this was the highlighted job
      if (clickedJobId === jobId) {
        clearHighlight();
      }
    } catch (error) {
      console.error('Failed to update job:', error);
      alert('Failed to mark job as applied');
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleRejectClick = (jobId: string) => {
    setRejectingJobId(jobId);
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectingJobId || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setUpdatingJobIds(prev => new Set(prev).add(rejectingJobId));
    try {
      await api.updateJobStatus(rejectingJobId, 'rejected', undefined, rejectionReason);
      await refetch();
      setRejectingJobId(null);
      setRejectionReason('');
      // Clear highlight if this was the highlighted job
      if (clickedJobId === rejectingJobId) {
        clearHighlight();
      }
    } catch (error) {
      console.error('Failed to reject job:', error);
      alert('Failed to reject job');
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(rejectingJobId);
        return next;
      });
    }
  };

  const getStatusDisplay = (job: Job) => {
    if (job.status === 'applied' && job.applied_method) {
      return job.applied_method === 'manual' 
        ? '✅ Applied (Manual)' 
        : '🤖 Applied (Auto)';
    }
    return job.status;
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('format', 'csv');
    
    const url = `/api/jobs/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handleJobClick = (jobId: string) => {
    setClickedJobId(jobId);
  };

  const clearHighlight = () => {
    setClickedJobId(null);
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

  const expandAllJobs = () => {
    const allJobIds = new Set(filteredAndSortedJobs.map(job => job.id));
    setExpandedJobIds(allJobIds);
  };

  const collapseAllJobs = () => {
    setExpandedJobIds(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Jobs</h1>
          {expandedJobIds.size > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              {expandedJobIds.size} expanded
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {clickedJobId && (
            <button
              onClick={clearHighlight}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Clear Highlight</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
          {filteredAndSortedJobs.length > 0 && (
            <>
              <button
                onClick={expandAllJobs}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
              >
                <span>📖</span>
                <span className="hidden sm:inline">Expand All</span>
                <span className="sm:hidden">Expand</span>
              </button>
              <button
                onClick={collapseAllJobs}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
              >
                <span>📕</span>
                <span className="hidden sm:inline">Collapse All</span>
                <span className="sm:hidden">Collapse</span>
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
            >
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="rejected">Rejected</option>
              <option value="skipped">Skipped</option>
              <option value="reported">Reported</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Easy Apply</label>
            <select
              value={easyApplyFilter}
              onChange={(e) => setEasyApplyFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Application Method</label>
            <select
              value={appliedMethodFilter}
              onChange={(e) => setAppliedMethodFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
            >
              <option value="">All</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs..."
              className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Min Rank: {minRank}</label>
          <input
            type="range"
            min="0"
            max="100"
            value={minRank}
            onChange={(e) => setMinRank(Number(e.target.value))}
            className="flex-1 max-w-md"
          />
          {minRank > 0 && (
            <button
              onClick={() => setMinRank(0)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Loading jobs...</div>
        ) : !filteredAndSortedJobs.length ? (
          <div className="p-8 text-center text-gray-500">
            {data?.jobs.length ? 'No jobs match your filters' : 'No jobs found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1">
                    Title
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    Company
                    {getSortIcon('company')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-1">
                    Rank
                    {getSortIcon('rank')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {getSortIcon('type')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedJobs.map((job: Job) => {
                const isExpanded = expandedJobIds.has(job.id);
                return (
                  <React.Fragment key={job.id}>
                    <tr 
                      className={`hover:bg-gray-50 ${
                        clickedJobId === job.id 
                          ? 'bg-cyan-100 border-2 border-cyan-400 shadow-lg shadow-cyan-200' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleJobExpansion(job.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={job.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => handleJobClick(job.id)}
                        >
                          {job.title}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-lg">
                          {job.rank || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[job.status]}`}>
                          {getStatusDisplay(job)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.easy_apply ? '⚡ Easy Apply' : '🔗 External'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {job.created_at ? (() => {
                          // SQLite stores as 'YYYY-MM-DD HH:MM:SS' in UTC, need to append 'Z' for proper parsing
                          const timestamp = job.created_at.includes('Z') ? job.created_at : `${job.created_at}Z`;
                          return new Date(timestamp).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                        })() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {(job.status === 'queued' || job.status === 'reported') && (
                            <button
                              onClick={() => handleMarkAsApplied(job.id)}
                              disabled={updatingJobIds.has(job.id)}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                              {updatingJobIds.has(job.id) ? 'Updating...' : 'Mark Applied'}
                            </button>
                          )}
                          {(job.status === 'queued' || job.status === 'reported') && (
                            <button
                              onClick={() => handleRejectClick(job.id)}
                              disabled={updatingJobIds.has(job.id)}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                              {updatingJobIds.has(job.id) ? 'Updating...' : 'Reject'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${job.id}-details`}>
                        <td colSpan={8} className="p-0">
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

      {data && data.total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSortedJobs.length} of {data.total} jobs
          {filteredAndSortedJobs.length < data.jobs.length && (
            <span className="text-gray-500"> (filtered from {data.jobs.length})</span>
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Reason for Rejection</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason (e.g., 'Too junior', 'Wrong tech stack', 'No remote option')"
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32 resize-none"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectingJobId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

