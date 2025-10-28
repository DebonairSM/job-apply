import React from 'react';
import { TerminalLog } from './TerminalLog';
import {
  useAutomationStatus,
  useStartAutomation,
  useStopAutomation,
  useAutomationLogs,
  SearchOptions,
  ApplyOptions,
} from '../hooks/useAutomation';
import { usePersistedAutomationSettings } from '../hooks/usePersistedAutomationSettings';

type CommandType = 'search' | 'apply';

const PROFILE_OPTIONS = [
  { value: '', label: 'None (use keywords)' },
  { value: 'core', label: 'Core Azure/Cloud' },
  { value: 'security', label: 'Security' },
  { value: 'event-driven', label: 'Event-Driven' },
  { value: 'performance', label: 'Performance' },
  { value: 'devops', label: 'DevOps' },
  { value: 'backend', label: 'Backend' },
  { value: 'core-net', label: 'Core .NET' },
  { value: 'legacy-modernization', label: 'Legacy Modernization' },
  { value: 'contract', label: 'Contract' },
];

const DATE_OPTIONS = [
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
];

export function Automation() {
  const {
    // State values
    command,
    profile,
    keywords,
    location,
    remote,
    datePosted,
    minScore,
    maxPages,
    startPage,
    updateDescriptions,
    easyOnly,
    externalOnly,
    jobId,
    dryRun,
    isLoaded,
    
    // Setters
    setCommand,
    setProfile,
    setKeywords,
    setLocation,
    setRemote,
    setDatePosted,
    setMinScore,
    setMaxPages,
    setStartPage,
    setUpdateDescriptions,
    setEasyOnly,
    setExternalOnly,
    setJobId,
    setDryRun,
    clearSettings,
  } = usePersistedAutomationSettings();

  const { data: status, isLoading: statusLoading } = useAutomationStatus();
  const startMutation = useStartAutomation();
  const stopMutation = useStopAutomation();
  const { logs, isConnected, clearLogs } = useAutomationLogs();

  const isRunning = status?.status === 'running';
  const isStopping = status?.status === 'stopping';
  const isIdle = status?.status === 'idle';

  // Don't render until settings are loaded to prevent flashing
  if (!isLoaded) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    if (command === 'search') {
      // Validate search options
      if (!profile && !keywords) {
        alert('Please select a profile or enter keywords');
        return;
      }

      const searchOptions: SearchOptions = {};
      
      if (profile) {
        searchOptions.profile = profile as any;
      } else if (keywords) {
        searchOptions.keywords = keywords;
      }
      
      if (location) searchOptions.location = location;
      if (remote && !profile) searchOptions.remote = remote;
      if (datePosted) searchOptions.datePosted = datePosted;
      if (minScore !== 70) searchOptions.minScore = minScore;
      if (maxPages !== 5) searchOptions.maxPages = maxPages;
      if (startPage !== 1) searchOptions.startPage = startPage;
      if (updateDescriptions) searchOptions.updateDescriptions = updateDescriptions;

      startMutation.mutate({
        command: 'search',
        options: searchOptions,
      }, {
        onError: (error: Error) => {
          console.error('[Automation] Search failed:', error.message);
          alert(`Failed to start search: ${error.message}`);
        }
      });
    } else {
      // Log the raw state values first
      console.log('[Automation] Raw state:', { easyOnly, externalOnly, jobId, dryRun });
      
      // Require explicit filter selection
      if (!easyOnly && !externalOnly && !jobId) {
        console.log('[Automation] BLOCKING - No filter selected!');
        console.log('[Automation] State check: easyOnly=%s, externalOnly=%s, jobId=%s', 
          easyOnly, externalOnly, jobId);
        alert(
          '❌ No filter selected\n\n' +
          'Please select one of:\n' +
          '• Easy Apply only\n' +
          '• External ATS only\n' +
          '• Specific Job ID'
        );
        return;
      }
      
      console.log('[Automation] Validation passed - proceeding with filter:', 
        easyOnly ? 'easy' : externalOnly ? 'external' : 'jobId=' + jobId);
      
      const applyOptions: ApplyOptions = {};
      
      if (easyOnly) {
        applyOptions.easy = true;
        console.log('[Automation] Setting easy = true');
      }
      if (externalOnly) {
        applyOptions.external = true;
        console.log('[Automation] Setting external = true');
      }
      if (jobId) {
        applyOptions.jobId = jobId;
        console.log('[Automation] Setting jobId =', jobId);
      }
      if (dryRun) {
        applyOptions.dryRun = true;
        console.log('[Automation] Setting dryRun = true');
      }

      console.log('[Automation] Final options being sent:', JSON.stringify(applyOptions));

      startMutation.mutate({
        command: 'apply',
        options: applyOptions,
      }, {
        onError: (error: Error) => {
          console.error('[Automation] Start failed:', error.message);
          alert(`Failed to start: ${error.message}`);
        }
      });
    }
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const getStatusBadge = () => {
    if (statusLoading) {
      return <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">Loading...</span>;
    }

    switch (status?.status) {
      case 'idle':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">● Idle</span>;
      case 'running':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm animate-pulse">● Running</span>;
      case 'stopping':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">● Stopping</span>;
      case 'error':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">● Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Automation Control</h1>
        <p className="text-gray-600">Run search and apply commands with live output monitoring</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="xl:col-span-5">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 xl:mb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {getStatusBadge()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={!isIdle || startMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {startMutation.isPending ? 'Starting...' : 'Start'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning || stopMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {stopMutation.isPending ? 'Stopping...' : 'Stop'}
            </button>
          </div>
        </div>

        {/* Command Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Command</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="search"
                checked={command === 'search'}
                onChange={(e) => setCommand(e.target.value as CommandType)}
                disabled={!isIdle}
                className="text-blue-600"
              />
              <span className="text-gray-700">Search</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="apply"
                checked={command === 'apply'}
                onChange={(e) => setCommand(e.target.value as CommandType)}
                disabled={!isIdle}
                className="text-blue-600"
              />
              <span className="text-gray-700">Apply</span>
            </label>
          </div>
        </div>

        {/* Configuration Panel */}
        {command === 'search' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Search Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile
                </label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {PROFILE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords {!profile && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={!isIdle || !!profile}
                  placeholder="e.g., Senior .NET Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isIdle}
                  placeholder="e.g., United States"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Posted
                </label>
                <select
                  value={datePosted}
                  onChange={(e) => setDatePosted(e.target.value as any)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {DATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Pages
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 1)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Page
                </label>
                <input
                  type="number"
                  min="1"
                  value={startPage}
                  onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remote}
                  onChange={(e) => setRemote(e.target.checked)}
                  disabled={!isIdle || !!profile}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Remote only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDescriptions}
                  onChange={(e) => setUpdateDescriptions(e.target.checked)}
                  disabled={!isIdle}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Update missing descriptions</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Apply Configuration</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Job ID (optional)
                </label>
                <input
                  type="text"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  disabled={!isIdle}
                  placeholder="Enter job ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={easyOnly}
                  onChange={(e) => setEasyOnly(e.target.checked)}
                  disabled={!isIdle}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Easy Apply only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={externalOnly}
                  onChange={(e) => setExternalOnly(e.target.checked)}
                  disabled={!isIdle}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">External ATS only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  disabled={!isIdle}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Dry run (don't submit)</span>
              </label>
            </div>

            {/* Active Filters Summary */}
            {command === 'apply' && !jobId && (
              <div className={`mt-3 p-3 border rounded-lg ${
                !easyOnly && !externalOnly 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className={`text-sm font-medium mb-1 ${
                  !easyOnly && !externalOnly 
                    ? 'text-red-900' 
                    : 'text-blue-900'
                }`}>
                  Active Filter: (easyOnly={String(easyOnly)}, externalOnly={String(externalOnly)})
                </div>
                <div className="text-sm">
                  {easyOnly && !externalOnly && <span className="text-blue-800">✓ Easy Apply jobs only</span>}
                  {!easyOnly && externalOnly && <span className="text-blue-800">✓ External ATS jobs only</span>}
                  {easyOnly && externalOnly && <span className="text-blue-800">✓ Both filters (Easy Apply priority)</span>}
                  {!easyOnly && !externalOnly && (
                    <span className="text-red-700 font-semibold">
                      ❌ No filter selected - Click Start will show error
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>

        {/* Terminal Display */}
        <div className="xl:col-span-7">
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
            <TerminalLog
              logs={logs}
              isConnected={isConnected}
              onClear={clearLogs}
              canClear={isIdle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

