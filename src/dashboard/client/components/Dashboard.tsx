import { useStats } from '../hooks/useStats';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { useProfileAnalytics } from '../hooks/useProfileAnalytics';
import { StatCard } from './StatCard';
import { ProfilePerformanceChart } from './ProfilePerformanceChart';
import { formatRelativeTime } from '../lib/dateUtils';
import { Icon } from './Icon';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(10);
  const { data: profileAnalytics, isLoading: profileAnalyticsLoading } = useProfileAnalytics();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3">
          <Icon icon="progress-activity" size={32} className="text-blue-600 animate-spin" />
          <span className="text-lg text-gray-600">Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Jobs" 
          value={stats?.total || 0} 
          icon="inventory"
          color="blue"
        />
        <StatCard 
          title="Queued" 
          value={stats?.queued || 0} 
          icon="schedule"
          color="amber"
        />
        <StatCard 
          title="Applied" 
          value={stats?.applied || 0} 
          icon="check-circle"
          color="green"
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats?.successRate || 0}%`} 
          icon="trending-up"
          color="purple"
        />
      </div>

      {/* Error Summary */}
      {activity && activity.some(job => job.status === 'skipped' && job.rejection_reason?.includes('Error')) && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon icon="error" size={24} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-red-900">Recent Errors</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {activity
                .filter(job => job.status === 'skipped' && job.rejection_reason?.includes('Error'))
                .slice(0, 3)
                .map((job) => (
                  <div key={job.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <Icon icon="cancel" size={20} className="text-red-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{job.title} at {job.company}</p>
                      <p className="text-xs text-red-700 mt-1">{job.rejection_reason}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Application Method Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Icon icon="category" size={24} className="text-gray-600" />
          Application Methods
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard 
            title="Manual Applications" 
            value={stats?.totalManual || 0} 
            icon="touch-app"
            color="blue"
          />
          <StatCard 
            title="Automatic Applications" 
            value={stats?.totalAutomatic || 0} 
            icon="smart-toy"
            color="green"
          />
        </div>
      </div>

      {/* Application Trends */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Icon icon="calendar-month" size={24} className="text-gray-600" />
          Application Activity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Applied Today" 
            value={stats?.appliedToday || 0} 
            icon="today"
            color="green"
          />
          <StatCard 
            title="Applied This Week" 
            value={stats?.appliedThisWeek || 0} 
            icon="date-range"
            color="blue"
          />
          <StatCard 
            title="Applied This Month" 
            value={stats?.appliedThisMonth || 0} 
            icon="calendar-today"
            color="purple"
          />
        </div>
      </div>

      {/* Profile Performance Analytics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon icon="insights" size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Profile Performance</h2>
                <p className="text-sm text-gray-600">Which search profiles find the best jobs</p>
              </div>
            </div>
            {!profileAnalyticsLoading && profileAnalytics?.profiles && (
              <span className="text-sm text-gray-500">{profileAnalytics.profiles.length} profiles</span>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {profileAnalyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Icon icon="progress-activity" size={28} className="text-purple-600 animate-spin" />
                <span className="text-gray-600">Loading profile analytics...</span>
              </div>
            </div>
          ) : !profileAnalytics?.profiles?.length ? (
            <div className="text-center py-12">
              <Icon icon="inbox" size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No profile data available yet</p>
              <p className="text-sm text-gray-400 mt-2">Run job searches to see profile performance</p>
            </div>
          ) : (
            <ProfilePerformanceChart profiles={profileAnalytics.profiles} />
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Icon icon="assessment" size={24} className="text-gray-600" />
          Job Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Interview" 
            value={stats?.interview || 0} 
            icon="event-available"
            color="green"
          />
          <StatCard 
            title="Rejected" 
            value={stats?.rejected || 0} 
            icon="cancel"
            color="red"
          />
          <StatCard 
            title="Skipped" 
            value={stats?.skipped || 0} 
            icon="skip-next"
            color="gray"
          />
          <StatCard 
            title="Curated" 
            value={stats?.curated || 0} 
            icon="star"
            color="amber"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon icon="history" size={24} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            {!activityLoading && activity?.length > 0 && (
              <span className="text-sm text-gray-500">{activity.length} items</span>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Icon icon="progress-activity" size={28} className="text-blue-600 animate-spin" />
                <span className="text-gray-600">Loading activity...</span>
              </div>
            </div>
          ) : !activity?.length ? (
            <div className="text-center py-12">
              <Icon icon="inbox" size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((job) => {
                const getStatusConfig = () => {
                  if (job.status === 'applied' && job.applied_method === 'manual') {
                    return { icon: 'check-circle', color: 'text-green-600', bg: 'bg-green-50', label: 'Applied (Manual)' };
                  }
                  if (job.status === 'applied' && job.applied_method === 'automatic') {
                    return { icon: 'smart-toy', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Applied (Auto)' };
                  }
                  if (job.status === 'rejected') {
                    return { icon: 'cancel', color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' };
                  }
                  if (job.status === 'interview') {
                    return { icon: 'event-available', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Interview' };
                  }
                  if (job.status === 'queued') {
                    return { icon: 'schedule', color: 'text-amber-600', bg: 'bg-amber-50', label: 'Queued' };
                  }
                  if (job.status === 'skipped') {
                    return { icon: 'skip-next', color: 'text-gray-600', bg: 'bg-gray-50', label: 'Skipped' };
                  }
                  if (job.status === 'reported') {
                    return { icon: 'flag', color: 'text-orange-600', bg: 'bg-orange-50', label: 'Reported' };
                  }
                  return { icon: 'help', color: 'text-gray-600', bg: 'bg-gray-50', label: 'Unknown' };
                };
                
                const config = getStatusConfig();
                const timestamp = job.status_updated_at || job.created_at;
                const label = job.status_updated_at ? 'Action' : 'Found';
                
                return (
                  <div 
                    key={job.id} 
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon icon={config.icon} size={20} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-sm text-gray-600 truncate">{job.company}</p>
                      {job.rejection_reason && (
                        <div className="flex items-start gap-1 mt-1">
                          <Icon icon="info" size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700">{job.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">{config.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {timestamp ? `${label}: ${formatRelativeTime(timestamp)}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

