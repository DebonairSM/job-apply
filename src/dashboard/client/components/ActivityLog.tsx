import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useActivity } from '../hooks/useActivity';
import { ActivityEntry } from '../lib/types';

export function ActivityLog() {
  const [limit, setLimit] = useState(100);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showScreenshots, setShowScreenshots] = useState(false);

  const { data: activities, isLoading, error } = useActivity(limit);
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter activities based on selected filters
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    
    return activities.filter(activity => {
      if (filterType !== 'all' && activity.type !== filterType) return false;
      if (filterStatus !== 'all' && activity.job_status !== filterStatus) return false;
      return true;
    });
  }, [activities, filterType, filterStatus]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: filteredActivities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height per item
    overscan: 5, // Render 5 extra items outside viewport
  });

  const getActivityIcon = (type: ActivityEntry['type'], success?: boolean) => {
    switch (type) {
      case 'job_created':
        return '🆕';
      case 'job_updated':
        return '📝';
      case 'run_success':
        return '✅';
      case 'run_error':
        return '❌';
      default:
        return success ? '✅' : '❌';
    }
  };

  const getActivityColor = (type: ActivityEntry['type'], success?: boolean) => {
    switch (type) {
      case 'job_created':
        return 'text-blue-600 bg-blue-50';
      case 'job_updated':
        return 'text-purple-600 bg-purple-50';
      case 'run_success':
        return 'text-green-600 bg-green-50';
      case 'run_error':
        return 'text-red-600 bg-red-50';
      default:
        return success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusColors = {
      queued: 'bg-gray-100 text-gray-800',
      applied: 'bg-green-100 text-green-800',
      interview: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      skipped: 'bg-yellow-100 text-yellow-800',
      reported: 'bg-purple-100 text-purple-800'
    };
    
    return status ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    ) : null;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Only show "Just now" if it's actually within the last minute
    if (diffMs < 60000) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const extractRelativePath = (fullPath: string) => {
    // Extract relative path from full path
    // Handle both Windows and Unix paths
    // e.g., "C:\git\job-apply\artifacts\c516075e8caa57df0a8e9abeaa440e72\step-0.png" 
    // becomes "c516075e8caa57df0a8e9abeaa440e72/step-0.png"
    const artifactsIndex = fullPath.indexOf('artifacts');
    if (artifactsIndex !== -1) {
      const relativePath = fullPath.substring(artifactsIndex + 9); // 9 = length of "artifacts"
      // Convert backslashes to forward slashes for web URLs
      return relativePath.replace(/\\/g, '/');
    }
    return fullPath;
  };

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Activity Log</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading activity: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Activity Log</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showScreenshots}
              onChange={(e) => setShowScreenshots(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Screenshots</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
          >
            <option value="all">All Types</option>
            <option value="job_created">Job Created</option>
            <option value="job_updated">Job Updated</option>
            <option value="run_success">Run Success</option>
            <option value="run_error">Run Error</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Job Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
            <option value="skipped">Skipped</option>
            <option value="reported">Reported</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 w-full text-sm sm:text-base"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading activity...</p>
          </div>
        ) : !filteredActivities.length ? (
          <div className="p-8 text-center text-gray-500">No activity found</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`border-b border-gray-100 p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                  activity.type === 'run_error' ? 'bg-red-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-lg ${getActivityColor(activity.type, activity.success)}`}>
                    {getActivityIcon(activity.type, activity.success)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {activity.job_title && activity.job_company 
                          ? `${activity.job_title} at ${activity.job_company}`
                          : activity.job_id
                        }
                      </span>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {getStatusBadge(activity.job_status)}
                        {activity.job_rank && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Rank: {activity.job_rank}
                          </span>
                        )}
                        {activity.applied_method && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.applied_method === 'automatic' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {activity.applied_method}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-600 mb-2">
                      {activity.message}
                    </div>

                    {activity.step && (
                      <div className="text-xs text-gray-500 mb-2">
                        Step: <span className="font-mono">{activity.step}</span>
                        {activity.duration_ms && (
                          <span className="ml-2">({formatDuration(activity.duration_ms)})</span>
                        )}
                      </div>
                    )}

                    {activity.rejection_reason && (
                      <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                        <strong>Rejection Reason:</strong> {activity.rejection_reason}
                      </div>
                    )}

                    {activity.fit_reasons && (
                      <div className="text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded mb-2">
                        <strong>Fit Reasons:</strong> {activity.fit_reasons}
                      </div>
                    )}

                    {/* Screenshot */}
                    {showScreenshots && activity.screenshot_path && (
                      <div className="mt-2">
                        <img
                          src={`/artifacts/${extractRelativePath(activity.screenshot_path)}`}
                          alt="Screenshot"
                          className="max-w-xs max-h-32 rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => window.open(`/artifacts/${extractRelativePath(activity.screenshot_path)}`, '_blank')}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredActivities && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredActivities.length} of {activities?.length || 0} activities
        </div>
      )}
    </div>
  );
}

