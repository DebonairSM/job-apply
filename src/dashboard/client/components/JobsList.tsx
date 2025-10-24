import { useState, useEffect } from 'react';
import { useJobs } from '../hooks/useJobs';
import { api } from '../lib/api';
import { Job } from '../lib/types';

const statusColors = {
  queued: 'bg-yellow-100 text-yellow-800',
  applied: 'bg-green-100 text-green-800',
  interview: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
  reported: 'bg-purple-100 text-purple-800'
};

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

  // Client-side filtering for additional filters
  const filteredJobs = data?.jobs.filter(job => {
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <div className="flex gap-3">
          {clickedJobId && (
            <button
              onClick={clearHighlight}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>✨</span>
              Clear Highlight
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>📥</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
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
              className="border border-gray-300 rounded-lg px-4 py-2"
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
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Search (Title/Company)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs..."
              className="border border-gray-300 rounded-lg px-4 py-2 w-full"
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
        ) : !filteredJobs.length ? (
          <div className="p-8 text-center text-gray-500">
            {data?.jobs.length ? 'No jobs match your filters' : 'No jobs found'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job: Job) => (
                <tr 
                  key={job.id} 
                  className={`hover:bg-gray-50 ${
                    clickedJobId === job.id 
                      ? 'bg-cyan-100 border-2 border-cyan-400 shadow-lg shadow-cyan-200' 
                      : ''
                  }`}
                >
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredJobs.length} of {data.total} jobs
          {filteredJobs.length < data.jobs.length && (
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

