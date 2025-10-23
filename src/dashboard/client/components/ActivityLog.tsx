import { useState } from 'react';
import { useRuns } from '../hooks/useRuns';

export function ActivityLog() {
  const [jobIdFilter, setJobIdFilter] = useState<string>('');
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useRuns({
    jobId: jobIdFilter || undefined,
    limit
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Activity Log</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job ID</label>
          <input
            type="text"
            value={jobIdFilter}
            onChange={(e) => setJobIdFilter(e.target.value)}
            placeholder="Filter by job ID..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-64"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Loading activity...</div>
        ) : !data?.runs.length ? (
          <div className="p-8 text-center text-gray-500">No activity found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Log
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.runs.map((run) => (
                <tr key={run.id} className={`hover:bg-gray-50 ${!run.ok ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-2xl">
                    {run.ok ? '✅' : '❌'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {run.job_id.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {run.step}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md truncate text-sm text-gray-600">
                      {run.log || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {run.screenshot_path ? (
                      <span className="text-blue-600">📸 Available</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {data.runs.length} activity logs
        </div>
      )}
    </div>
  );
}

