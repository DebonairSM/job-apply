/**
 * Timing Constants
 * 
 * Centralized timing values used across the application.
 * All values are in milliseconds unless otherwise noted.
 */

// Toast/Notification durations
export const TOAST_DURATION_MS = 2000;
export const NOTIFICATION_DISPLAY_DURATION_MS = 3000;

// Polling/Refresh intervals
export const FAST_REFRESH_INTERVAL_MS = 5000; // 5 seconds - for active operations
export const MEDIUM_REFRESH_INTERVAL_MS = 10000; // 10 seconds - for stats
export const SLOW_REFRESH_INTERVAL_MS = 30000; // 30 seconds - for background data

// Active scraping status refresh (needs to be fast to show real-time progress)
export const ACTIVE_SCRAPING_REFRESH_INTERVAL_MS = 2000; // 2 seconds

// Debounce delays
export const SEARCH_DEBOUNCE_MS = 300;
export const INPUT_DEBOUNCE_MS = 500;

// Animation durations
export const FADE_ANIMATION_MS = 200;
export const SLIDE_ANIMATION_MS = 300;

// Timeouts
export const API_TIMEOUT_MS = 30000; // 30 seconds
export const LLM_GENERATION_TIMEOUT_MS = 60000; // 60 seconds for AI operations

