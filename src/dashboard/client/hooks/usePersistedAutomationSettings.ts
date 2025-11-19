import { useState, useCallback, useEffect } from 'react';

export interface AutomationSettings {
  // Search settings
  profile: string;
  keywords: string;
  location: string;
  locationPreset?: string;
  radius?: number;
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  datePosted: 'day' | 'week' | 'month';
  minScore: number;
  maxPages: number;
  startPage: number;
  
  // Apply settings
  easyOnly: boolean;
  externalOnly: boolean;
  jobId: string;
  dryRun: boolean;
  
  // Command type
  command: 'search' | 'apply';
}

const DEFAULT_SETTINGS: AutomationSettings = {
  profile: '',
  keywords: '',
  location: '',
  locationPreset: '',
  radius: undefined as any,
  remote: true,
  hybrid: true,
  onsite: false,
  datePosted: 'day',
  minScore: 70,
  maxPages: 5,
  startPage: 1,
  easyOnly: false,
  externalOnly: false,
  jobId: '',
  dryRun: false,
  command: 'search',
};

const STORAGE_KEY = 'automation-settings';

export function usePersistedAutomationSettings() {
  const [settings, setSettingsState] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle any missing properties
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        
        // Migration: Handle old settings that only have 'remote' boolean
        // If hybrid/onsite are undefined in old settings, use defaults
        if (parsed.hybrid === undefined && parsed.onsite === undefined) {
          // Old format: migrate based on remote value
          // If remote was true, default to remote=true, hybrid=true, onsite=false (new defaults)
          // If remote was false, keep remote=false, but set hybrid=true, onsite=false (allow hybrid)
          merged.hybrid = DEFAULT_SETTINGS.hybrid;
          merged.onsite = DEFAULT_SETTINGS.onsite;
        }
        
        setSettingsState(merged);
      }
    } catch (error) {
      console.warn('Failed to load automation settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = useCallback((updates: Partial<AutomationSettings>) => {
    setSettingsState(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.warn('Failed to save automation settings:', error);
      }
      
      return newSettings;
    });
  }, []);

  // Clear all settings (reset to defaults)
  const clearSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear automation settings:', error);
    }
  }, []);

  // Individual setters for convenience
  const setProfile = useCallback((profile: string) => updateSettings({ profile }), [updateSettings]);
  const setKeywords = useCallback((keywords: string) => updateSettings({ keywords }), [updateSettings]);
  const setLocation = useCallback((location: string) => updateSettings({ location }), [updateSettings]);
  const setLocationPreset = useCallback((locationPreset: string | undefined) => updateSettings({ locationPreset }), [updateSettings]);
  const setRadius = useCallback((radius: number | undefined) => updateSettings({ radius }), [updateSettings]);
  const setRemote = useCallback((remote: boolean) => updateSettings({ remote }), [updateSettings]);
  const setHybrid = useCallback((hybrid: boolean) => updateSettings({ hybrid }), [updateSettings]);
  const setOnsite = useCallback((onsite: boolean) => updateSettings({ onsite }), [updateSettings]);
  const setDatePosted = useCallback((datePosted: 'day' | 'week' | 'month') => updateSettings({ datePosted }), [updateSettings]);
  const setMinScore = useCallback((minScore: number) => updateSettings({ minScore }), [updateSettings]);
  const setMaxPages = useCallback((maxPages: number) => updateSettings({ maxPages }), [updateSettings]);
  const setStartPage = useCallback((startPage: number) => updateSettings({ startPage }), [updateSettings]);
  const setEasyOnly = useCallback((easyOnly: boolean) => updateSettings({ easyOnly }), [updateSettings]);
  const setExternalOnly = useCallback((externalOnly: boolean) => updateSettings({ externalOnly }), [updateSettings]);
  const setJobId = useCallback((jobId: string) => updateSettings({ jobId }), [updateSettings]);
  const setDryRun = useCallback((dryRun: boolean) => updateSettings({ dryRun }), [updateSettings]);
  const setCommand = useCallback((command: 'search' | 'apply') => updateSettings({ command }), [updateSettings]);

  return {
    // State
    ...settings,
    isLoaded,
    
    // Actions
    updateSettings,
    clearSettings,
    
    // Individual setters
    setProfile,
    setKeywords,
    setLocation,
    setLocationPreset,
    setRadius,
    setRemote,
    setHybrid,
    setOnsite,
    setDatePosted,
    setMinScore,
    setMaxPages,
    setStartPage,
    setEasyOnly,
    setExternalOnly,
    setJobId,
    setDryRun,
    setCommand,
  };
}
