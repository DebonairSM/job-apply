import React, { useState, useRef } from 'react';
import { Icon } from './Icon';
import { LEAD_PROFILES } from '../../../ai/lead-profiles';

interface LeadScrapeModalProps {
  onClose: () => void;
  onStart: (config: ScrapeConfig) => Promise<void>;
}

export interface ScrapeConfig {
  degree: '1st' | '2nd' | '3rd';
  profile?: string;
  max: number;
  startPage?: number;
  resume?: number;
}

export function LeadScrapeModal({ onClose, onStart }: LeadScrapeModalProps) {
  const [degree, setDegree] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [profile, setProfile] = useState<string>('chiefs');
  const [max, setMax] = useState<number>(50);
  const [startPage, setStartPage] = useState<string>('');
  const [resume, setResume] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Use ref for synchronous lock (protects against React StrictMode double-invoke)
  const isSubmittingRef = useRef(false);

  const profileKeys = Object.keys(LEAD_PROFILES);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission with synchronous ref check
    if (isSubmittingRef.current || isStarting) {
      console.log('Already starting, ignoring duplicate submission (ref or state check)');
      return;
    }
    
    // Set synchronous lock IMMEDIATELY
    isSubmittingRef.current = true;
    
    setError('');
    
    // Validation
    if (max <= 0) {
      setError('Max profiles must be greater than 0');
      isSubmittingRef.current = false; // Reset lock on validation error
      return;
    }
    
    if (startPage && parseInt(startPage) <= 0) {
      setError('Start page must be greater than 0');
      isSubmittingRef.current = false; // Reset lock on validation error
      return;
    }
    
    if (resume && parseInt(resume) <= 0) {
      setError('Resume run ID must be greater than 0');
      isSubmittingRef.current = false; // Reset lock on validation error
      return;
    }

    const config: ScrapeConfig = {
      degree,
      profile: profile || undefined,
      max,
      startPage: startPage ? parseInt(startPage) : undefined,
      resume: resume ? parseInt(resume) : undefined,
    };

    try {
      setIsStarting(true);
      await onStart(config);
      // Success - modal will close, no need to reset ref
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
      setIsStarting(false);
      isSubmittingRef.current = false; // Reset lock on error so user can retry
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="people" size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Start Lead Scraping</h2>
              <p className="text-sm text-gray-600">Configure and start LinkedIn connection scraping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
            disabled={isStarting}
          >
            <Icon icon="close" size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-6">
            {/* Connection Degree */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Connection Degree <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="degree"
                    value="1st"
                    checked={degree === '1st'}
                    onChange={(e) => setDegree(e.target.value as '1st' | '2nd' | '3rd')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    disabled={isStarting}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">1st Degree Connections</div>
                    <div className="text-sm text-gray-600">People you are directly connected with</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="degree"
                    value="2nd"
                    checked={degree === '2nd'}
                    onChange={(e) => setDegree(e.target.value as '1st' | '2nd' | '3rd')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    disabled={isStarting}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">2nd Degree Connections</div>
                    <div className="text-sm text-gray-600">Friends of your connections (mutual connections)</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="degree"
                    value="3rd"
                    checked={degree === '3rd'}
                    onChange={(e) => setDegree(e.target.value as '1st' | '2nd' | '3rd')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    disabled={isStarting}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">3rd Degree Connections</div>
                    <div className="text-sm text-gray-600">Extended network (3+ connections away)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Profile Selection */}
            <div>
              <label htmlFor="profile" className="block text-sm font-semibold text-gray-900 mb-2">
                Lead Profile <span className="text-red-500">*</span>
              </label>
              <select
                id="profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStarting}
                required
              >
                {profileKeys.map((key) => {
                  const profileData = LEAD_PROFILES[key];
                  return (
                    <option key={key} value={key}>
                      {profileData.name} - {profileData.description}
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Filter connections by job titles matching this profile
              </p>
            </div>

            {/* Max Profiles */}
            <div>
              <label htmlFor="max" className="block text-sm font-semibold text-gray-900 mb-2">
                Max Profiles <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="max"
                value={max}
                onChange={(e) => setMax(parseInt(e.target.value) || 0)}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStarting}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of profiles to scrape (default: 50)
              </p>
            </div>

            {/* Advanced Options */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Advanced Options (Optional)</h3>
              
              <div className="space-y-4">
                {/* Start Page */}
                <div>
                  <label htmlFor="startPage" className="block text-sm font-medium text-gray-700 mb-2">
                    Start from Page
                  </label>
                  <input
                    type="number"
                    id="startPage"
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    min="1"
                    placeholder="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isStarting}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Skip earlier pages and start from this page number
                  </p>
                </div>

                {/* Resume Run ID */}
                <div>
                  <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
                    Resume Run ID
                  </label>
                  <input
                    type="number"
                    id="resume"
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    min="1"
                    placeholder="Enter run ID to resume"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isStarting}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Resume a previously interrupted scraping run
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <Icon icon="error" size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isStarting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isStarting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <Icon icon="sync" size={20} className="animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Icon icon="play_arrow" size={20} />
                  <span>Start Scraping</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

