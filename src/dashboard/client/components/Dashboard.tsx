import { useStats } from '../hooks/useStats';
import { useRuns } from '../hooks/useRuns';
import { StatCard } from './StatCard';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: runsData, isLoading: runsLoading } = useRuns({ limit: 10 });

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

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      {/* Recent Activity */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        
        {runsLoading ? (
          <div>Loading activity...</div>
        ) : !runsData?.runs.length ? (
          <div className="text-gray-500 text-center py-8">No activity yet</div>
        ) : (
          <div className="space-y-3">
            {runsData.runs.map((run) => (
              <div 
                key={run.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-2xl ${run.ok ? '✅' : '❌'}`}>
                    {run.ok ? '✅' : '❌'}
                  </span>
                  <div>
                    <p className="font-medium">{run.step}</p>
                    <p className="text-sm text-gray-500">Job: {run.job_id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

