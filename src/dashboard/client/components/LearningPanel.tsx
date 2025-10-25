import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface LearningStats {
  totalRejections: number;
  activeAdjustments: Array<{ category: string; delta: number }>;
  topPatterns: Array<{ type: string; value: string; count: number }>;
  recentLearnings: Array<{
    timestamp: string;
    category: string;
    adjustment: number;
    reason: string;
  }>;
  filterStats: Array<{ type: string; count: number }>;
}

export function LearningPanel() {
  const [activeTab, setActiveTab] = useState<'adjustments' | 'patterns' | 'history'>('adjustments');

  const { data: learningStats, isLoading, error } = useQuery<LearningStats>({
    queryKey: ['learning-stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/learning');
      if (!response.ok) throw new Error('Failed to fetch learning stats');
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          Error loading learning statistics: {error.message}
        </div>
      </div>
    );
  }

  if (!learningStats) return null;

  const formatTimestamp = (timestamp: string) => {
    // Handle SQLite timestamp format (YYYY-MM-DD HH:MM:SS)
    // Add 'Z' to treat as UTC if no timezone info is present
    const normalizedTimestamp = timestamp.includes('T') || timestamp.includes('Z') 
      ? timestamp 
      : `${timestamp}Z`;
    
    return new Date(normalizedTimestamp).toLocaleString();
  };

  const formatAdjustment = (delta: number) => {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Rejection Learning System
          </h2>
          <div className="text-sm text-gray-500">
            {learningStats.totalRejections} total rejections analyzed
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'adjustments', label: 'Weight Adjustments', count: learningStats.activeAdjustments.length },
            { id: 'patterns', label: 'Rejection Patterns', count: learningStats.topPatterns.length },
            { id: 'history', label: 'Learning History', count: learningStats.recentLearnings.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'adjustments' && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Active Weight Adjustments
            </h3>
            {learningStats.activeAdjustments.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No weight adjustments yet. The system will learn from rejections to adjust scoring weights.
              </div>
            ) : (
              <div className="space-y-3">
                {learningStats.activeAdjustments.map((adjustment) => (
                  <div key={adjustment.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {adjustment.category.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      adjustment.delta > 0 ? 'text-green-600' : 
                      adjustment.delta < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatAdjustment(adjustment.delta)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Top Rejection Patterns
            </h3>
            {learningStats.topPatterns.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No rejection patterns identified yet.
              </div>
            ) : (
              <div className="space-y-2">
                {learningStats.topPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {pattern.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        "{pattern.value}"
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {pattern.count} occurrence{pattern.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Recent Learning Events
            </h3>
            {learningStats.recentLearnings.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No learning events yet.
              </div>
            ) : (
              <div className="space-y-3">
                {learningStats.recentLearnings.map((learning, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900 capitalize">
                        {learning.category.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className={`text-sm font-medium ${
                        learning.adjustment > 0 ? 'text-green-600' : 
                        learning.adjustment < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {formatAdjustment(learning.adjustment)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {learning.reason}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(learning.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Statistics */}
      {learningStats.filterStats.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {learningStats.filterStats.map((filter, index) => (
              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {filter.type.replace('_', ' ')} ({filter.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
