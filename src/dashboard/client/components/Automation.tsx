import React, { useState, useEffect, useRef } from 'react';
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
import { SkippedJobsPanel } from './SkippedJobsPanel';
import { useToast } from '../contexts/ToastContext';

type CommandType = 'search' | 'apply';

const PROFILE_OPTIONS = [
  { value: 'all', label: 'Run All Profiles' },
  { value: '', label: 'None (use keywords)' },
  { value: 'core', label: 'Core Azure/Cloud' },
  { value: 'backend', label: 'Backend' },
  { value: 'core-net', label: 'Core .NET' },
  { value: 'legacy-modernization', label: 'Legacy Modernization' },
  { value: 'contract', label: 'Contract' },
  { value: 'aspnet-simple', label: 'ASP.NET (simple)' },
  { value: 'csharp-azure-no-frontend', label: 'C# + Azure (no Angular/React)' },
  { value: 'az204-csharp', label: 'AZ-204 + C#' },
  { value: 'ai-enhanced-net', label: 'AI-Enhanced .NET' },
  { value: 'legacy-web', label: 'Legacy Web (.NET Framework, WebForms, jQuery)' },
];

// Extract all actual profile values (excluding 'all' and empty string)
const ALL_PROFILES = PROFILE_OPTIONS
  .filter(opt => opt.value && opt.value !== 'all')
  .map(opt => opt.value as string);

const DATE_OPTIONS = [
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
];

const LOCATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Greater Tampa Bay Area', label: 'Greater Tampa Bay Area' },
  { value: 'Greater Orlando Area', label: 'Greater Orlando Area' },
  { value: 'Greater Roanoke Area', label: 'Greater Roanoke Area' },
  { value: 'Wesley Chapel, FL', label: 'Wesley Chapel, FL' },
];

const RADIUS_STOPS = [5, 10, 25, 50, 100];

export function Automation() {
  const [isSkippedJobsExpanded, setIsSkippedJobsExpanded] = useState(false);
  const [profileQueue, setProfileQueue] = useState<string[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState<number>(-1);
  const isRunningAllProfilesRef = useRef(false);
  const isStartingProfileRef = useRef(false);
  const { warning, error: showError } = useToast();
  
  const {
    // State values
    command,
    profile,
    keywords,
    location,
    remote,
    hybrid,
    onsite,
    datePosted,
    minScore,
    maxPages,
    startPage,
    // optional fields
    radius,
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
    setHybrid,
    setOnsite,
    setDatePosted,
    setMinScore,
    setMaxPages,
    setStartPage,
    setRadius,
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

  // Clear the starting flag when status changes to running (profile actually started)
  useEffect(() => {
    if (isRunning && isStartingProfileRef.current) {
      console.log('[Automation] Profile started successfully, clearing starting flag');
      isStartingProfileRef.current = false;
    }
  }, [isRunning]);

  // Handle sequential profile execution when running all profiles
  useEffect(() => {
    // Only proceed if we're running all profiles and have a queue
    if (!isRunningAllProfilesRef.current || profileQueue.length === 0) {
      return;
    }

    // Prevent concurrent profile starts
    if (isStartingProfileRef.current) {
      console.log('[Automation] Already starting a profile, skipping...');
      return;
    }

    // Don't start next profile if one is already running or stopping
    if (isRunning || isStopping || status?.status === 'running' || status?.status === 'stopping') {
      console.log('[Automation] Profile is currently running/stopping, waiting for completion...', {
        isRunning,
        isStopping,
        status: status?.status
      });
      return;
    }

    console.log('[Automation] Profile queue effect:', {
      status: status?.status,
      isIdle,
      isRunning,
      currentProfileIndex,
      queueLength: profileQueue.length,
      isRunningAllProfiles: isRunningAllProfilesRef.current,
      isStarting: isStartingProfileRef.current
    });

    // If we're idle (not running, not stopping) and have profiles in queue, start the next one
    // Only proceed if status is explicitly 'idle' and not 'running'
    if (status?.status === 'idle' && !isRunning && currentProfileIndex < profileQueue.length - 1) {
      const nextIndex = currentProfileIndex + 1;
      const nextProfile = profileQueue[nextIndex];
      
      console.log(`[Automation] Starting next profile: ${nextProfile} (${nextIndex + 1} of ${profileQueue.length})`);
      
      // Mark that we're starting a profile to prevent concurrent starts
      isStartingProfileRef.current = true;
      setCurrentProfileIndex(nextIndex);
      
      // Build search options with the next profile
      const searchOptions: SearchOptions = {
        profile: nextProfile as any,
      };
      
      if (location) searchOptions.location = location;
      if (radius !== undefined && radius !== null && radius > 0) searchOptions.radius = radius;
      if (remote) searchOptions.remote = remote;
      if (hybrid) searchOptions.hybrid = hybrid;
      if (onsite) searchOptions.onsite = onsite;
      if (datePosted) searchOptions.datePosted = datePosted;
      searchOptions.minScore = minScore;
      searchOptions.maxPages = maxPages;
      searchOptions.startPage = startPage;

      console.log(`[Automation] Starting profile ${nextProfile} with options:`, searchOptions);

      startMutation.mutate({
        command: 'search',
        options: searchOptions,
      }, {
        onSuccess: () => {
          console.log(`[Automation] Successfully started profile ${nextProfile}`);
          // Flag will be cleared when status changes to 'running' (handled by separate useEffect)
        },
        onError: (error: Error) => {
          console.error(`[Automation] Profile ${nextProfile} failed:`, error.message);
          showError(`Failed to start profile ${nextProfile}: ${error.message}`);
          // Clear the starting flag on error so we can try the next profile
          isStartingProfileRef.current = false;
          // Continue with next profile even on error - the useEffect will trigger again when status becomes idle
        }
      });
    } else if (status?.status === 'idle' && !isRunning && currentProfileIndex === profileQueue.length - 1 && currentProfileIndex >= 0) {
      // All profiles completed
      console.log('[Automation] All profiles completed');
      isRunningAllProfilesRef.current = false;
      isStartingProfileRef.current = false;
      setProfileQueue([]);
      setCurrentProfileIndex(-1);
    }
  }, [status, isIdle, isRunning, isStopping, profileQueue, currentProfileIndex, location, radius, remote, hybrid, onsite, datePosted, minScore, maxPages, startPage, startMutation, showError]);

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
      // Validate search options (allow 'all' profile)
      if (profile !== 'all' && !profile && !keywords) {
        warning('Please select a profile or enter keywords');
        return;
      }

      // Handle "Run All Profiles" option
      if (profile === 'all') {
        if (ALL_PROFILES.length === 0) {
          warning('No profiles available to run');
          return;
        }
        
        // Initialize queue and start first profile
        isRunningAllProfilesRef.current = true;
        setProfileQueue(ALL_PROFILES);
        setCurrentProfileIndex(-1);
        
        // Start first profile immediately
        const firstProfile = ALL_PROFILES[0];
        const searchOptions: SearchOptions = {
          profile: firstProfile as any,
        };
        
        if (location) searchOptions.location = location;
        if (radius !== undefined && radius !== null && radius > 0) searchOptions.radius = radius;
        if (remote) searchOptions.remote = remote;
        if (hybrid) searchOptions.hybrid = hybrid;
        if (onsite) searchOptions.onsite = onsite;
        if (datePosted) searchOptions.datePosted = datePosted;
        searchOptions.minScore = minScore;
        searchOptions.maxPages = maxPages;
        searchOptions.startPage = startPage;

        console.log(`[Automation] Starting first profile: ${firstProfile} with options:`, searchOptions);
        isStartingProfileRef.current = true;
        setCurrentProfileIndex(0);
        startMutation.mutate({
          command: 'search',
          options: searchOptions,
        }, {
          onSuccess: () => {
            console.log(`[Automation] Successfully initiated first profile: ${firstProfile}`);
            // Flag will be cleared when status changes to 'running' (handled by separate useEffect)
          },
          onError: (error: Error) => {
            console.error(`[Automation] Profile ${firstProfile} failed:`, error.message);
            showError(`Failed to start profile ${firstProfile}: ${error.message}`);
            // Reset state on error so user can try again
            isRunningAllProfilesRef.current = false;
            isStartingProfileRef.current = false;
            setProfileQueue([]);
            setCurrentProfileIndex(-1);
          }
        });
        return;
      }

      // Single profile or keywords search
      const searchOptions: SearchOptions = {};
      
      if (profile) {
        searchOptions.profile = profile as any;
      } else if (keywords) {
        searchOptions.keywords = keywords;
      }
      
      if (location) searchOptions.location = location;
      if (radius !== undefined && radius !== null && radius > 0) searchOptions.radius = radius;
      if (remote) searchOptions.remote = remote;
      if (hybrid) searchOptions.hybrid = hybrid;
      if (onsite) searchOptions.onsite = onsite;
      if (datePosted) searchOptions.datePosted = datePosted;
      searchOptions.minScore = minScore;
      searchOptions.maxPages = maxPages;
      searchOptions.startPage = startPage;

      startMutation.mutate({
        command: 'search',
        options: searchOptions,
      }, {
        onError: (error: Error) => {
          console.error('[Automation] Search failed:', error.message);
          showError(`Failed to start search: ${error.message}`);
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
        warning('Please select one of: Easy Apply only, External ATS only, or Specific Job ID');
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
          showError(`Failed to start: ${error.message}`);
        }
      });
    }
  };

  const handleStop = () => {
    // Reset all profiles queue if running
    if (isRunningAllProfilesRef.current) {
      isRunningAllProfilesRef.current = false;
      isStartingProfileRef.current = false;
      setProfileQueue([]);
      setCurrentProfileIndex(-1);
    }
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
                  {profile === 'all' && profileQueue.length > 0 && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({currentProfileIndex >= 0 ? currentProfileIndex + 1 : 1} of {profileQueue.length}: {currentProfileIndex >= 0 ? profileQueue[currentProfileIndex] : profileQueue[0]})
                    </span>
                  )}
                </label>
                <select
                  value={profile}
                  onChange={(e) => {
                    // Reset all profiles state when changing away from 'all'
                    if (profile === 'all' && e.target.value !== 'all') {
                      isRunningAllProfilesRef.current = false;
                      isStartingProfileRef.current = false;
                      setProfileQueue([]);
                      setCurrentProfileIndex(-1);
                    }
                    setProfile(e.target.value);
                  }}
                  disabled={!isIdle || isRunningAllProfilesRef.current}
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
                  Keywords {!profile && profile !== 'all' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={!isIdle || (!!profile && profile !== 'all')}
                  placeholder="e.g., Senior .NET Developer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isIdle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {location === 'Wesley Chapel, FL' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Radius (mi) — best effort
                  </label>
                  <div className="px-2 py-3 border border-gray-200 rounded-lg">
                    <input
                      type="range"
                      min={0}
                      max={RADIUS_STOPS.length - 1}
                      step={1}
                      value={(() => {
                        const idx = RADIUS_STOPS.indexOf(radius ?? 25);
                        return idx >= 0 ? idx : 2; // default to 25mi
                      })()}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value) || 2;
                        setRadius(RADIUS_STOPS[idx]);
                      }}
                      disabled={!isIdle}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      {RADIUS_STOPS.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Type</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remote}
                      onChange={(e) => setRemote(e.target.checked)}
                      disabled={!isIdle}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm font-medium text-gray-700">Remote</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hybrid}
                      onChange={(e) => setHybrid(e.target.checked)}
                      disabled={!isIdle}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm font-medium text-gray-700">Hybrid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onsite}
                      onChange={(e) => setOnsite(e.target.checked)}
                      disabled={!isIdle}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <span className="text-sm font-medium text-gray-700">On-site</span>
                  </label>
                </div>
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
          <div className="bg-white rounded-lg shadow-md overflow-hidden h-full mb-6">
            <TerminalLog
              logs={logs}
              isConnected={isConnected}
              onClear={clearLogs}
              canClear={isIdle}
            />
          </div>
          
          {/* Skipped Jobs Panel */}
          <SkippedJobsPanel
            isExpanded={isSkippedJobsExpanded}
            onToggle={() => setIsSkippedJobsExpanded(!isSkippedJobsExpanded)}
          />
        </div>
      </div>
    </div>
  );
}

