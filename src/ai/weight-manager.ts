import { PROFILES, TechnicalProfile } from './profiles.js';
import { 
  getCurrentWeightAdjustments, 
  saveWeightAdjustment,
  WeightAdjustment,
  getDb
} from '../lib/db.js';

export interface WeightAdjustments {
  [category: string]: number;  // Adjustment delta from base weight
}

// Cache for current weights to avoid repeated database queries
let weightCache: Record<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute

// Get active weights with adjustments applied
export function getActiveWeights(): Record<string, number> {
  const now = Date.now();
  
  // Use cache if it's still valid
  if (weightCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return weightCache;
  }
  
  // Load base weights from profiles
  const baseWeights: Record<string, number> = {};
  Object.entries(PROFILES).forEach(([key, profile]) => {
    baseWeights[key] = profile.weight;
  });
  
  // Get adjustments from database
  const adjustments = getCurrentWeightAdjustments();
  
  // Apply adjustments to base weights
  const adjustedWeights: Record<string, number> = {};
  Object.entries(baseWeights).forEach(([category, baseWeight]) => {
    const adjustment = adjustments[category] || 0;
    adjustedWeights[category] = baseWeight + adjustment;
  });
  
  // Normalize weights to ensure they sum to 100%
  const normalizedWeights = normalizeWeights(adjustedWeights);
  
  // Update cache
  weightCache = normalizedWeights;
  cacheTimestamp = now;
  
  return normalizedWeights;
}

// Apply a weight adjustment and persist to database
export function applyWeightAdjustment(
  category: string, 
  adjustment: number, 
  reason: string,
  rejectionId?: string
): void {
  // Get current weights
  const currentWeights = getActiveWeights();
  const oldWeight = currentWeights[category];
  
  // Clamp adjustment to reasonable bounds (-10 to +10 percentage points)
  const clampedAdjustment = Math.max(-10, Math.min(10, adjustment));
  const newWeight = oldWeight + clampedAdjustment;
  
  // Ensure final weight is not negative (minimum 0.1%)
  const finalNewWeight = Math.max(0.1, newWeight);
  const finalAdjustment = finalNewWeight - oldWeight;
  
  // Save adjustment to database
  saveWeightAdjustment({
    profile_category: category,
    old_weight: oldWeight,
    new_weight: finalNewWeight,
    reason: reason,
    rejection_id: rejectionId
  });
  
  // Invalidate cache to force reload
  weightCache = null;
  
  console.log(`📊 Weight adjustment: ${category} ${oldWeight}% → ${finalNewWeight}% (${finalAdjustment > 0 ? '+' : ''}${finalAdjustment}%) - ${reason}`);
}

// Normalize weights to ensure they sum to 100%
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
  if (Math.abs(totalWeight - 100) < 0.01) {
    // Already normalized
    return weights;
  }
  
  // Normalize by scaling all weights proportionally
  const normalizedWeights: Record<string, number> = {};
  Object.entries(weights).forEach(([category, weight]) => {
    normalizedWeights[category] = (weight / totalWeight) * 100;
  });
  
  return normalizedWeights;
}

// Export adjusted profiles for use by ranker
export function exportAdjustedProfiles(): Record<string, TechnicalProfile> {
  const adjustedWeights = getActiveWeights();
  
  const adjustedProfiles: Record<string, TechnicalProfile> = {};
  Object.entries(PROFILES).forEach(([key, profile]) => {
    adjustedProfiles[key] = {
      ...profile,
      weight: adjustedWeights[key]
    };
  });
  
  return adjustedProfiles;
}

// Get weight adjustment summary for dashboard
export function getWeightAdjustmentSummary(): {
  baseWeights: Record<string, number>;
  adjustedWeights: Record<string, number>;
  adjustments: Record<string, number>;
  totalAdjustment: number;
} {
  const baseWeights: Record<string, number> = {};
  Object.entries(PROFILES).forEach(([key, profile]) => {
    baseWeights[key] = profile.weight;
  });
  
  const adjustedWeights = getActiveWeights();
  const dbAdjustments = getCurrentWeightAdjustments();
  
  const totalAdjustment = Object.values(dbAdjustments).reduce((sum, adj) => sum + adj, 0);
  
  return {
    baseWeights,
    adjustedWeights,
    adjustments: dbAdjustments,
    totalAdjustment
  };
}

// Reset all weight adjustments to base weights
export function resetWeightAdjustments(): void {
  const database = getDb();
  
  // Clear all weight adjustments
  database.prepare('DELETE FROM weight_adjustments').run();
  
  // Invalidate cache
  weightCache = null;
  
  console.log('🔄 Reset all weight adjustments to base weights');
}

// Get weight adjustment history
export function getWeightAdjustmentHistory(limit: number = 20): WeightAdjustment[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM weight_adjustments 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit) as WeightAdjustment[];
}

// Validate that weights are reasonable
export function validateWeights(weights: Record<string, number>): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check total weight
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    issues.push(`Total weight is ${totalWeight.toFixed(2)}%, expected 100%`);
  }
  
  // Check for negative weights
  Object.entries(weights).forEach(([category, weight]) => {
    if (weight < 0) {
      issues.push(`Category ${category} has negative weight: ${weight}%`);
    }
    if (weight > 50) {
      issues.push(`Category ${category} has very high weight: ${weight}%`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Get learning statistics
export function getLearningStats(): {
  totalAdjustments: number;
  categoriesAdjusted: string[];
  averageAdjustment: number;
  lastAdjustment?: string;
} {
  const database = getDb();
  
  const totalAdjustments = database.prepare(`
    SELECT COUNT(*) as count FROM weight_adjustments
  `).get() as { count: number };
  
  const categoriesAdjusted = database.prepare(`
    SELECT DISTINCT profile_category FROM weight_adjustments
  `).all() as Array<{ profile_category: string }>;
  
  const averageAdjustment = database.prepare(`
    SELECT AVG(new_weight - old_weight) as avg FROM weight_adjustments
  `).get() as { avg: number };
  
  const lastAdjustment = database.prepare(`
    SELECT created_at FROM weight_adjustments 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get() as { created_at: string } | undefined;
  
  return {
    totalAdjustments: totalAdjustments.count,
    categoriesAdjusted: categoriesAdjusted.map(c => c.profile_category),
    averageAdjustment: averageAdjustment.avg || 0,
    lastAdjustment: lastAdjustment?.created_at
  };
}
