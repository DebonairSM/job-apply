import { useState } from 'react';
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
  const [updatingJobIds, setUpdatingJobIds] = useState<Set<string>>(new Set());
  
  const { data, isLoading, refetch } = useJobs({
    status: statusFilter || undefined,
    easyApply: easyApplyFilter === 'true' ? true : easyApplyFilter === 'false' ? false : undefined,
    limit: 100
  });

  const handleMarkAsApplied = async (jobId: string) => {
    setUpdatingJobIds(prev => new Set(prev).add(jobId));
    try {
      await api.updateJobStatus(jobId, 'applied', 'manual');
      await refetch();
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

  const getStatusDisplay = (job: Job) => {
    if (job.status === 'applied' && job.applied_method) {
      return job.applied_method === 'manual' 
        ? '✅ Applied (Manual)' 
        : '🤖 Applied (Auto)';
    }
    return job.status;
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Jobs</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
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
      </div>

      {/* Jobs Table */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Loading jobs...</div>
        ) : !data?.jobs.length ? (
          <div className="p-8 text-center text-gray-500">No jobs found</div>
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
              {data.jobs.map((job: Job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
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
                    {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.status === 'queued' && (
                      <button
                        onClick={() => handleMarkAsApplied(job.id)}
                        disabled={updatingJobIds.has(job.id)}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        {updatingJobIds.has(job.id) ? 'Updating...' : 'Mark Applied'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {data.jobs.length} of {data.total} jobs
        </div>
      )}
    </div>
  );
}

