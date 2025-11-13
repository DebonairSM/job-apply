import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { api } from '../lib/api';
import { Job } from '../lib/types';
import { JobDetailsPanel } from './JobDetailsPanel';
import { SkippedJobsPanel } from './SkippedJobsPanel';
import { formatRelativeTime } from '../lib/dateUtils';
import { formatRank } from '../lib/formatUtils';
import { useToast } from '../contexts/ToastContext';
import { Icon } from './Icon';

const statusColors = {
  queued: 'bg-yellow-100 text-yellow-800',
  applied: 'bg-green-100 text-green-800',
  interview: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800',
  reported: 'bg-purple-100 text-purple-800'
};

type SortField = 'title' | 'company' | 'rank' | 'status' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';

export function JobsList() {
  const { success, error } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [easyApplyFilter, setEasyApplyFilter] = useState<string>('');
  const [appliedMethodFilter, setAppliedMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [curatedFilter, setCuratedFilter] = useState<string>('');
  const [minRank, setMinRank] = useState<number>(0);
  const [updatingJobIds, setUpdatingJobIds] = useState<Set<string>>(new Set());
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionSuggestions, setRejectionSuggestions] = useState<{ reason: string; count: number }[]>([]);
  const [suggestionSearch, setSuggestionSearch] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [promptData, setPromptData] = useState<{ prompt: string; jobIds: string[]; count: number } | null>(null);
  const [clickedJobId, setClickedJobId] = useState<string | null>(null);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSkippedPanel, setShowSkippedPanel] = useState<boolean>(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const targetJobId = searchParams.get('jobId');
  
  const { data, isLoading, refetch } = useJobs({
    status: statusFilter || undefined,
    easyApply: easyApplyFilter === 'true' ? true : easyApplyFilter === 'false' ? false : undefined,
    curated: curatedFilter === 'true' ? true : curatedFilter === 'false' ? false : undefined,
    limit: 1000,
    search: searchQuery || undefined
  });

  // Load clicked job ID and expanded state from localStorage on component mount
  useEffect(() => {
    const savedClickedJobId = localStorage.getItem('clickedJobId');
    const savedExpandedJobIds = localStorage.getItem('expandedJobIds');
    
    if (savedClickedJobId) {
      setClickedJobId(savedClickedJobId);
    }
    
    if (savedExpandedJobIds) {
      try {
        const parsedIds = JSON.parse(savedExpandedJobIds);
        if (Array.isArray(parsedIds)) {
          setExpandedJobIds(new Set(parsedIds));
        }
      } catch (error) {
        console.warn('Failed to parse expanded job IDs from localStorage:', error);
      }
    }
  }, []);

  // Handle navigation from ActivityLog
  useEffect(() => {
    if (targetJobId) {
      setClickedJobId(targetJobId);
      setExpandedJobIds(prev => new Set(prev).add(targetJobId));
      // Clear the jobId param from URL after handling it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('jobId');
      setSearchParams(newParams, { replace: true });
    }
  }, [targetJobId, searchParams, setSearchParams]);

  // Save clicked job ID to localStorage when it changes
  useEffect(() => {
    if (clickedJobId) {
      localStorage.setItem('clickedJobId', clickedJobId);
    } else {
      localStorage.removeItem('clickedJobId');
    }
  }, [clickedJobId]);

  // Save expanded job IDs to localStorage when they change
  useEffect(() => {
    if (expandedJobIds.size > 0) {
      localStorage.setItem('expandedJobIds', JSON.stringify(Array.from(expandedJobIds)));
    } else {
      localStorage.removeItem('expandedJobIds');
    }
  }, [expandedJobIds]);

  // Determine if any filter/search is active
  const hasActiveFilters = !!(
    statusFilter || 
    easyApplyFilter || 
    appliedMethodFilter || 
    searchQuery || 
    curatedFilter ||
    minRank > 0
  );

  // Client-side filtering and sorting
  const filteredAndSortedJobs = data?.jobs.filter(job => {
    // When "All Statuses" is selected (statusFilter is empty), show all statuses EXCEPT skipped
    // This includes: queued, applied, interview, rejected, reported
    if (statusFilter === '' && job.status === 'skipped') {
      return false;
    }
    // Hide rejected jobs older than 1 day ONLY if no filters are active
    if (!hasActiveFilters && job.status === 'rejected' && job.status_updated_at) {
      const statusUpdateTime = new Date(job.status_updated_at).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (statusUpdateTime < oneDayAgo) {
        return false;
      }
    }

    // Applied method filter
    if (appliedMethodFilter) {
      if (appliedMethodFilter === 'manual' && job.applied_method !== 'manual') return false;
      if (appliedMethodFilter === 'automatic' && job.applied_method !== 'automatic') return false;
    }
    
    // Search filter is now handled server-side, so no client-side filtering needed here
    // (keeping this comment for clarity - search is done in database query)
    
    // Rank filter
    if (minRank > 0 && (job.rank || 0) < minRank) return false;
    
    return true;
  }).sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'company':
        aValue = a.company.toLowerCase();
        bValue = b.company.toLowerCase();
        break;
      case 'rank':
        aValue = a.rank || 0;
        bValue = b.rank || 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'type':
        aValue = a.easy_apply ? 'easy' : 'external';
        bValue = b.easy_apply ? 'easy' : 'external';
        break;
      case 'date':
        aValue = new Date(a.created_at || '').getTime();
        bValue = new Date(b.created_at || '').getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
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
      error('Failed to mark job as applied');
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleToggleCurated = async (jobId: string) => {
    setUpdatingJobIds(prev => new Set(prev).add(jobId));
    try {
      await api.toggleJobCurated(jobId);
      await refetch();
    } catch (error) {
      console.error('Failed to toggle job curated:', error);
      error('Failed to toggle job curated');
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleRejectClick = async (jobId: string) => {
    setRejectingJobId(jobId);
    setRejectionReason('');
    // Load rejection suggestions for dropdown
    try {
      const suggestions = await api.getRejectionSuggestions();
      setRejectionSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load rejection suggestions:', error);
      setRejectionSuggestions([]);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingJobId) {
      return;
    }
    
    setUpdatingJobIds(prev => new Set(prev).add(rejectingJobId));
    try {
      // Rejection reason is optional - pass empty string if not provided
      await api.updateJobStatus(rejectingJobId, 'rejected', undefined, rejectionReason.trim() || undefined);
      await refetch();
      setRejectingJobId(null);
      setRejectionReason('');
      setRejectionSuggestions([]);
      setSuggestionSearch('');
      // Clear highlight if this was the highlighted job
      if (clickedJobId === rejectingJobId) {
        clearHighlight();
      }
    } catch (error) {
      console.error('Failed to reject job:', error);
      error('Failed to reject job');
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(rejectingJobId);
        return next;
      });
    }
  };

  const handleGeneratePrompt = async () => {
    try {
      const data = await api.getRejectionPrompt();
      setPromptData(data);
      setShowPromptModal(true);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      error('Failed to generate rejection prompt');
    }
  };

  const handleCopyPrompt = async () => {
    if (!promptData) return;
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptData.prompt);
        success('Prompt copied to clipboard!');
        return;
      }
      
      // Fallback: use old execCommand method
      const textArea = document.createElement('textarea');
      textArea.value = promptData.prompt;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          success('Prompt copied to clipboard!');
        } else {
          throw new Error('execCommand copy failed');
        }
      } catch (err) {
        document.body.removeChild(textArea);
        throw err;
      }
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      error('Failed to copy to clipboard. Please manually copy the text from the prompt field.');
    }
  };

  const handleMarkAsProcessed = async () => {
    if (!promptData || promptData.jobIds.length === 0) return;
    try {
      await api.markRejectionsProcessed(promptData.jobIds);
      setShowPromptModal(false);
      setPromptData(null);
      await refetch();
      success(`Marked ${promptData.jobIds.length} rejection(s) as processed`);
    } catch (error) {
      console.error('Failed to mark rejections as processed:', error);
      error('Failed to mark rejections as processed');
    }
  };

  const getStatusDisplay = (job: Job) => {
    if (job.status === 'applied' && job.applied_method) {
      return job.applied_method === 'manual' 
        ? 'Applied (Manual)' 
        : 'Applied (Auto)';
    }
    return job.status;
  };

  const getStatusIcon = (job: Job) => {
    if (job.status === 'applied' && job.applied_method === 'manual') {
      return 'check-circle';
    }
    if (job.status === 'applied' && job.applied_method === 'automatic') {
      return 'smart-toy';
    }
    if (job.status === 'queued') return 'schedule';
    if (job.status === 'rejected') return 'cancel';
    if (job.status === 'interview') return 'event-available';
    if (job.status === 'skipped') return 'skip-next';
    if (job.status === 'reported') return 'flag';
    return 'help';
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
    // Also expand the job when clicked for better UX
    setExpandedJobIds(prev => new Set(prev).add(jobId));
  };

  const clearHighlight = () => {
    setClickedJobId(null);
    // Also collapse all jobs when clearing highlight
    setExpandedJobIds(new Set());
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const expandAllJobs = () => {
    const allJobIds = new Set(filteredAndSortedJobs.map(job => job.id));
    setExpandedJobIds(allJobIds);
  };

  const collapseAllJobs = () => {
    setExpandedJobIds(new Set());
  };

  const toggleAllJobs = () => {
    // If any visible jobs are expanded, collapse all
    // Otherwise expand all
    if (hasAnyExpanded) {
      collapseAllJobs();
    } else {
      expandAllJobs();
    }
  };

  // Check if any visible jobs are expanded
  const hasAnyExpanded = filteredAndSortedJobs.some(job => expandedJobIds.has(job.id));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Icon icon="swap-vert" size={18} className="text-gray-400" />;
    }
    
    return sortDirection === 'asc' ? (
      <Icon icon="arrow-upward" size={18} className="text-blue-600" />
    ) : (
      <Icon icon="arrow-downward" size={18} className="text-blue-600" />
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Jobs</h1>
          {expandedJobIds.size > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              {expandedJobIds.size} expanded
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setShowSkippedPanel(prev => !prev)}
            className={`${
              showSkippedPanel 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-gray-500 hover:bg-gray-600'
            } text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base shadow-sm`}
          >
            <Icon icon={showSkippedPanel ? 'visibility-off' : 'visibility'} size={20} />
            <span className="hidden sm:inline">{showSkippedPanel ? 'Show Regular' : 'Show Skipped'}</span>
            <span className="sm:hidden">{showSkippedPanel ? 'Regular' : 'Skipped'}</span>
          </button>
          {clickedJobId && (
            <button
              onClick={clearHighlight}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base shadow-sm"
            >
              <Icon icon="highlight-off" size={20} />
              <span className="hidden sm:inline">Clear Highlight</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
          {filteredAndSortedJobs.length > 0 && !showSkippedPanel && (
            <button
              onClick={toggleAllJobs}
              className={`${
                hasAnyExpanded 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm sm:text-base shadow-sm`}
            >
              <Icon icon={hasAnyExpanded ? 'unfold-less' : 'unfold-more'} size={20} />
              <span className="hidden sm:inline">{hasAnyExpanded ? 'Collapse All' : 'Expand All'}</span>
              <span className="sm:hidden">{hasAnyExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          )}
          {!showSkippedPanel && (
            <>
              <button
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base shadow-sm"
              >
                <Icon icon="download" size={20} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
              <button
                onClick={handleGeneratePrompt}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base shadow-sm"
              >
                <Icon icon="psychology" size={20} />
                <span className="hidden sm:inline">Generate Rejection Prompt</span>
                <span className="sm:hidden">Prompt</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {!showSkippedPanel && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon icon="filter-list" size={24} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
          </div>
        <div className="space-y-4">
          {/* Primary Filter Row - Search and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Icon icon="search" size={18} className="text-gray-500" />
                Search Jobs
              </label>
              <div className="relative">
                <Icon icon="search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or company..."
                  className="border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="rejected">Rejected</option>
                <option value="skipped">Skipped</option>
                <option value="reported">Reported</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Row - Type, Application Method, and Curated */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Job Type</label>
              <select
                value={easyApplyFilter}
                onChange={(e) => setEasyApplyFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="true">Easy Apply</option>
                <option value="false">External</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Application Method</label>
              <select
                value={appliedMethodFilter}
                onChange={(e) => setAppliedMethodFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Curated</label>
              <select
                value={curatedFilter}
                onChange={(e) => setCuratedFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Curated Only</option>
                <option value="false">Not Curated</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium mb-2">
                  Min Rank: <span className="font-bold text-blue-600">{minRank}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minRank}
                    onChange={(e) => setMinRank(Number(e.target.value))}
                    className="flex-1 h-2.5 accent-blue-600"
                  />
                  {minRank > 0 && (
                    <button
                      onClick={() => setMinRank(0)}
                      className="text-xs text-gray-600 hover:text-gray-900 underline whitespace-nowrap"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Jobs Table */}
      {!showSkippedPanel && (
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Loading jobs...</div>
        ) : !filteredAndSortedJobs.length ? (
          <div className="p-8 text-center text-gray-500">
            {data?.jobs.length ? 'No jobs match your filters' : 'No jobs found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200 hidden sm:table-header-group">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <span title="Expand/Collapse">...</span>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-20"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold">Rank</span>
                    {getSortIcon('rank')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1">
                    Title
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    Company
                    {getSortIcon('company')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Type
                    {getSortIcon('type')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedJobs.map((job: Job) => {
                const isExpanded = expandedJobIds.has(job.id);
                return (
                  <React.Fragment key={job.id}>
                    <tr 
                      onClick={() => toggleJobExpansion(job.id)}
                      className={`hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                        clickedJobId === job.id 
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-400 shadow-lg shadow-cyan-200 ring-2 ring-cyan-200' 
                          : ''
                      }`}
                      title={isExpanded ? 'Click to collapse details' : 'Click to expand details'}
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJobExpansion(job.id);
                          }}
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors mx-auto ${
                            clickedJobId === job.id 
                              ? 'bg-cyan-200 hover:bg-cyan-300' 
                              : 'hover:bg-gray-200'
                          }`}
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              clickedJobId === job.id ? 'text-cyan-700' : 'text-gray-600'
                            } ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center" data-label="Rank">
                        <div className="flex items-center justify-center">
                          <span className={`font-bold text-lg px-3 py-1 rounded-lg ${
                            (job.rank || 0) >= 90 ? 'bg-green-100 text-green-800' :
                            (job.rank || 0) >= 75 ? 'bg-blue-100 text-blue-800' :
                            (job.rank || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {formatRank(job.rank)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4" data-label="Title" onClick={(e) => e.stopPropagation()}>
                        <a 
                          href={job.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm break-words inline-flex items-center gap-1"
                          onClick={() => handleJobClick(job.id)}
                        >
                          {job.curated && <span className="text-yellow-500 text-lg">⭐</span>}
                          {job.title}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-sm break-words" data-label="Company">
                        {job.company}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap" data-label="Profile">
                        {job.profile ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                            {job.profile}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap" data-label="Status">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[job.status]}`}>
                          {getStatusDisplay(job)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs" data-label="Type">
                        {job.easy_apply ? '⚡ Easy Apply' : '🔗 External'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500" data-label="Date">
                        {formatRelativeTime(job.created_at)}
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1.5">
                          {(job.status === 'queued' || job.status === 'reported') && (
                            <>
                              <button
                                onClick={() => handleToggleCurated(job.id)}
                                disabled={updatingJobIds.has(job.id)}
                                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                {updatingJobIds.has(job.id) ? '...' : job.curated ? 'Unlike' : 'I Like It!'}
                              </button>
                              <button
                                onClick={() => handleMarkAsApplied(job.id)}
                                disabled={updatingJobIds.has(job.id)}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                {updatingJobIds.has(job.id) ? '...' : 'Applied'}
                              </button>
                              <button
                                onClick={() => handleRejectClick(job.id)}
                                disabled={updatingJobIds.has(job.id)}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                {updatingJobIds.has(job.id) ? '...' : 'Reject'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${job.id}-details`} className="sm:table-row">
                        <td colSpan={9} className="p-0 sm:px-6 sm:py-4">
                          <JobDetailsPanel job={job} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {/* Skipped Jobs Section */}
      {showSkippedPanel && (
        <SkippedJobsPanel isExpanded={true} onToggle={() => setShowSkippedPanel(prev => !prev)} />
      )}

      {!showSkippedPanel && data && data.total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSortedJobs.length} of {data.total} jobs
          {filteredAndSortedJobs.length < data.jobs.length && (
            <span className="text-gray-500"> (filtered from {data.jobs.length})</span>
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Reason for Rejection</h3>
            {rejectionSuggestions.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Frequent Reasons:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={suggestionSearch}
                    onChange={(e) => setSuggestionSearch(e.target.value)}
                    placeholder="Search frequent reasons..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {suggestionSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {rejectionSuggestions
                        .filter(s => s.reason.toLowerCase().includes(suggestionSearch.toLowerCase()))
                        .map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setRejectionReason(suggestion.reason);
                              setSuggestionSearch('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            {suggestion.reason} <span className="text-gray-500">({suggestion.count}x)</span>
                          </button>
                        ))}
                      {rejectionSuggestions.filter(s => s.reason.toLowerCase().includes(suggestionSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No matching reasons found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason (optional, e.g., 'Too junior', 'Wrong tech stack', 'No remote option')"
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32 resize-none"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectingJobId(null);
                  setRejectionReason('');
                  setRejectionSuggestions([]);
                  setSuggestionSearch('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Prompt Modal */}
      {showPromptModal && promptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold mb-2">Rejection Analysis Prompt</h3>
            <p className="text-sm text-gray-600 mb-4">
              {promptData.count} unprocessed rejection(s) included
            </p>
            <textarea
              value={promptData.prompt}
              readOnly
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 resize-none flex-1 font-mono text-sm cursor-text"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPromptModal(false);
                  setPromptData(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleCopyPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleMarkAsProcessed}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Mark as Processed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

