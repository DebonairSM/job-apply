/**
 * Constants for AI-assisted development.
 * Using const objects with 'as const' creates type-safe string unions
 * that prevent typos and enable autocomplete.
 */

export const JobStatus = {
  QUEUED: 'queued',
  APPLIED: 'applied',
  INTERVIEW: 'interview',
  REJECTED: 'rejected',
  SKIPPED: 'skipped',
  REPORTED: 'reported',
} as const;

export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];

export const ApplicationMethod = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
} as const;

export type ApplicationMethodType = typeof ApplicationMethod[keyof typeof ApplicationMethod];

export const DatePostedFilter = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type DatePostedFilterType = typeof DatePostedFilter[keyof typeof DatePostedFilter];

export const ATSPlatform = {
  LINKEDIN: 'linkedin',
  GREENHOUSE: 'greenhouse',
  LEVER: 'lever',
  WORKDAY: 'workday',
  GENERIC: 'generic',
} as const;

export type ATSPlatformType = typeof ATSPlatform[keyof typeof ATSPlatform];

