import { ProfileAnalytic } from '../lib/types';
import { Icon } from './Icon';

interface ProfilePerformanceChartProps {
  profiles: ProfileAnalytic[];
}

export function ProfilePerformanceChart({ profiles }: ProfilePerformanceChartProps) {
  if (!profiles || profiles.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon icon="inbox" size={48} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No profile data available</p>
      </div>
    );
  }

  // Find max values for scaling bars
  const maxSuccessRate = Math.max(...profiles.map(p => Math.abs(p.net_success_rate)), 1);
  const maxFitScore = Math.max(...profiles.map(p => p.avg_fit_score), 1);
  const maxJobs = Math.max(...profiles.map(p => p.total_jobs), 1);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 50) return 'bg-green-500';
    if (rate >= 25) return 'bg-blue-500';
    if (rate >= 0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getSuccessRateTextColor = (rate: number) => {
    if (rate >= 50) return 'text-green-700';
    if (rate >= 25) return 'text-blue-700';
    if (rate >= 0) return 'text-amber-700';
    return 'text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-red-500"></div>
          <span>Net Success Rate (Applied - Rejected + 2×Interviews)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500"></div>
          <span>Avg Fit Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400"></div>
          <span>Total Jobs</span>
        </div>
      </div>

      {/* Profile Performance Bars */}
      <div className="space-y-4">
        {profiles.map((profile) => {
          const successRateWidth = Math.abs(profile.net_success_rate) / maxSuccessRate * 100;
          const fitScoreWidth = profile.avg_fit_score / maxFitScore * 100;
          const jobsWidth = profile.total_jobs / maxJobs * 100;
          
          return (
            <div key={profile.profile_key} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Profile Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{profile.profile_name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                    <span>{profile.total_jobs} jobs</span>
                    <span className="text-blue-600">{profile.applied} applied</span>
                    <span className="text-red-600">{profile.rejected} rejected</span>
                    {profile.interviews > 0 && (
                      <span className="text-purple-600">{profile.interviews} interviews</span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-2xl font-bold ${getSuccessRateTextColor(profile.net_success_rate)}`}>
                    {profile.net_success_rate > 0 ? '+' : ''}{profile.net_success_rate}%
                  </div>
                  <div className="text-xs text-gray-500">Net Success</div>
                </div>
              </div>

              {/* Metrics Bars */}
              <div className="space-y-2">
                {/* Net Success Rate Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Net Success Rate</span>
                    <span className={getSuccessRateTextColor(profile.net_success_rate)}>
                      {profile.net_success_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full ${getSuccessRateColor(profile.net_success_rate)} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.min(successRateWidth, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Average Fit Score Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Avg Fit Score</span>
                    <span className="text-purple-700">{profile.avg_fit_score}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(fitScoreWidth, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Total Jobs Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Total Jobs Found</span>
                    <span className="text-gray-700">{profile.total_jobs}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gray-400 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(jobsWidth, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Application Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Application Rate</span>
                    <span className="text-blue-700">{profile.application_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-blue-400 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(profile.application_rate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

