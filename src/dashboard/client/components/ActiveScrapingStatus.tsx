import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from './Icon';

interface ActiveRun {
  id: number;
  started_at: string;
  status: 'in_progress' | 'completed' | 'stopped' | 'error';
  profiles_scraped: number;
  profiles_added: number;
  last_profile_url?: string;
  filter_titles?: string;
  max_profiles?: number;
  error_message?: string;
  process_id?: number;
  last_activity_at?: string;
}

export function ActiveScrapingStatus() {
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  // Fetch active runs every 2 seconds
  const { data: activeRuns = [], refetch } = useQuery({
    queryKey: ['active-scraping-runs'],
    queryFn: async () => {
      const response = await api.get('/leads/runs/active');
      return response.data as ActiveRun[];
    },
    refetchInterval: 2000,
    staleTime: 0
  });

  // Auto-expand the first run when it appears
  useEffect(() => {
    if (activeRuns.length > 0 && expandedRuns.size === 0) {
      setExpandedRuns(new Set([activeRuns[0].id]));
    }
  }, [activeRuns, expandedRuns.size]);

  if (activeRuns.length === 0) {
    return null;
  }

  const toggleExpand = (runId: number) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };

  const calculateTimeElapsed = (startedAt: string): string => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    // Handle negative values (clock skew or invalid timestamp)
    if (diffSec < 0) {
      return '0s';
    }
    
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const calculateProgress = (run: ActiveRun): number => {
    if (!run.max_profiles || run.max_profiles === 0) return 0;
    return Math.min(100, (run.profiles_scraped / run.max_profiles) * 100);
  };

  const isStalled = (run: ActiveRun): boolean => {
    if (!run.last_activity_at) return false;
    const lastActivity = new Date(run.last_activity_at);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > 5;
  };

  const handleStopScraping = async (runId: number) => {
    if (!confirm('Are you sure you want to stop this scraping run? It can be resumed later.')) {
      return;
    }
    
    try {
      const response = await api.post(`/leads/runs/${runId}/stop`);
      alert(response.data.message || 'Scraping stopped successfully!');
      refetch(); // Refresh to remove from active list
    } catch (error) {
      console.error('Error stopping scrape:', error);
      alert('Failed to stop scraping. The process may have already ended.');
    }
  };

  return (
    <div className="space-y-3">
      {activeRuns.map((run) => {
        const progress = calculateProgress(run);
        const timeElapsed = calculateTimeElapsed(run.started_at);
        const stalled = isStalled(run);
        const isExpanded = expandedRuns.has(run.id);

        return (
          <div key={run.id} className="bg-blue-50 border-2 border-blue-300 rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Icon icon="sync" size={28} className="text-blue-600 animate-spin" />
                    {stalled && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      Scraping in Progress... Run #{run.id}
                      {stalled && (
                        <span className="ml-2 text-sm font-normal text-yellow-700">(Possibly Stalled)</span>
                      )}
                    </h3>
                    <p className="text-sm text-blue-700">Time elapsed: {timeElapsed}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStopScraping(run.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Icon icon="stop" size={18} />
                    <span>Stop</span>
                  </button>
                  <button
                    onClick={() => toggleExpand(run.id)}
                    className="p-2 hover:bg-blue-100 rounded-md transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <Icon icon={isExpanded ? "expand_less" : "expand_more"} size={24} className="text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="px-4 py-3 space-y-3">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Profiles Scraped</p>
                  <p className="text-xl font-bold text-gray-900">
                    {run.profiles_scraped}
                    {run.max_profiles && <span className="text-sm text-gray-500">/{run.max_profiles}</span>}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">New Leads Added</p>
                  <p className="text-xl font-bold text-green-600">{run.profiles_added}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Success Rate</p>
                  <p className="text-xl font-bold text-blue-600">
                    {run.profiles_scraped > 0 
                      ? Math.round((run.profiles_added / run.profiles_scraped) * 100) 
                      : 0}%
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Progress</p>
                  <p className="text-xl font-bold text-purple-600">
                    {progress.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {run.max_profiles && (
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
                  {run.filter_titles && (
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Title Filters:</p>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(run.filter_titles).map((title: string, idx: number) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {run.last_profile_url && (
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Last Processed Profile:</p>
                      <a 
                        href={run.last_profile_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                      >
                        {run.last_profile_url}
                      </a>
                    </div>
                  )}
                  
                  {run.last_activity_at && (
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Last Activity:</p>
                      <p className="text-xs text-gray-600">
                        {new Date(run.last_activity_at).toLocaleString()}
                        {stalled && (
                          <span className="ml-2 text-yellow-700 font-medium">
                            (No activity for 5+ minutes - may be stuck)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {run.process_id && (
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Process ID:</p>
                      <p className="text-xs text-gray-600 font-mono">{run.process_id}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

