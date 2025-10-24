import { useStats } from '../hooks/useStats';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { StatCard } from './StatCard';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(10);

  if (statsLoading) {
    return <div className="p-8">Loading statistics...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Job Automation Dashboard</h1>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Jobs" 
          value={stats?.total || 0} 
          icon="📊"
          color="blue"
        />
        <StatCard 
          title="Queued" 
          value={stats?.queued || 0} 
          icon="⏳"
          color="yellow"
        />
        <StatCard 
          title="Applied" 
          value={stats?.applied || 0} 
          icon="✅"
          color="green"
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats?.successRate || 0}%`} 
          icon="🎯"
          color="purple"
        />
      </div>

      {/* Application Method Breakdown */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Application Methods</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Manual Applications" 
            value={stats?.totalManual || 0} 
            icon="✅"
            color="blue"
          />
          <StatCard 
            title="Automatic Applications" 
            value={stats?.totalAutomatic || 0} 
            icon="🤖"
            color="green"
          />
        </div>
      </div>

      {/* Application Trends */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Application Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Applied Today" 
            value={stats?.appliedToday || 0} 
            icon="📅"
            color="green"
          />
          <StatCard 
            title="Applied This Week" 
            value={stats?.appliedThisWeek || 0} 
            icon="📆"
            color="blue"
          />
          <StatCard 
            title="Applied This Month" 
            value={stats?.appliedThisMonth || 0} 
            icon="📊"
            color="purple"
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Job Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Interview" 
            value={stats?.interview || 0} 
            icon="💼"
            color="green"
          />
          <StatCard 
            title="Rejected" 
            value={stats?.rejected || 0} 
            icon="❌"
            color="red"
          />
          <StatCard 
            title="Skipped" 
            value={stats?.skipped || 0} 
            icon="⏭️"
            color="gray"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        
        {activityLoading ? (
          <div>Loading activity...</div>
        ) : !activity?.length ? (
          <div className="text-gray-500 text-center py-8">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {activity.map((job) => (
              <div 
                key={job.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {job.status === 'applied' && job.applied_method === 'manual' && '✅'}
                    {job.status === 'applied' && job.applied_method === 'automatic' && '🤖'}
                    {job.status === 'rejected' && '❌'}
                    {job.status === 'interview' && '🎯'}
                    {job.status === 'queued' && '⏳'}
                    {job.status === 'skipped' && '⏭️'}
                    {job.status === 'reported' && '📋'}
                  </span>
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.company}</p>
                    {job.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {job.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {job.status === 'applied' && job.applied_method === 'manual' && 'Applied (Manual)'}
                    {job.status === 'applied' && job.applied_method === 'automatic' && 'Applied (Auto)'}
                    {job.status === 'rejected' && 'Rejected'}
                    {job.status === 'interview' && 'Interview'}
                    {job.status === 'queued' && 'Queued'}
                    {job.status === 'skipped' && 'Skipped'}
                    {job.status === 'reported' && 'Reported'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(() => {
                      // Use action timestamp if available, otherwise use found timestamp
                      const timestamp = job.status_updated_at || job.created_at;
                      const label = job.status_updated_at ? 'Action' : 'Found';
                      
                      if (timestamp) {
                        const formattedTime = timestamp.includes('Z') ? timestamp : `${timestamp}Z`;
                        const date = new Date(formattedTime).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                        });
                        return `${label}: ${date}`;
                      }
                      return 'N/A';
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

