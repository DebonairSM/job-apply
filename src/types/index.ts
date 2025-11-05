/**
 * Central type definitions barrel export.
 * All type definitions from across the codebase are re-exported here
 * for easy discovery by AI and developers.
 */

// Dashboard and UI types
export type {
  JobStats,
  Job,
  RunLog,
  JobsResponse,
  RunsResponse,
  JobActivity,
  ActivityEntry,
  ProfileAnalytic,
  ProfileAnalyticsResponse,
} from '../dashboard/client/lib/types.js';

// CLI types
export type { SearchOptions } from '../cli/search.js';
export type { ApplyOptions } from '../cli/apply.js';

// Service types
export type {
  SearchResult,
  SearchDependencies,
  Job as ServiceJob,
  ApplyResult,
  ApplyDependencies,
} from '../services/types.js';

// Validation types
export type { RankOutput, MappingOutput, AnswersOutput } from '../lib/validation.js';

// Adapter types
export type { ATSAdapter } from '../adapters/base.js';

// AI/Profile types
export type { TechnicalProfile } from '../ai/profiles.js';
export type { Mapping, CanonicalKey } from '../ai/mapper.js';
export type { JobInput } from '../ai/ranker.js';

// Constants (also exports types)
export * from '../constants/index.js';

