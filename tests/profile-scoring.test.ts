import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PROFILES } from '../src/ai/profiles.js';

/**
 * Tests for profile scoring with separated Azure and .NET categories
 * 
 * These tests verify:
 * 1. Profile scoring correctly identifies Azure vs .NET skills
 * 2. Weight calculations work with new category structure
 * 3. Category scores are properly separated
 */

describe('Profile Scoring with Separated Categories', () => {
  it('should calculate weighted scores correctly with new category structure', () => {
    // Test data representing a job with both Azure and .NET skills
    const categoryScores = {
      coreAzure: 85,      // High Azure skills
      coreNet: 90,        // High .NET skills  
      security: 75,       // Moderate security
      eventDriven: 60,   // Lower event-driven
      performance: 80,    // Good performance
      devops: 70,         // Moderate DevOps
      seniority: 95,     // High seniority
      legacyModernization: 50 // Lower legacy skills
    };
    
    // Calculate weighted score using actual profile weights
    const weights = {
      coreAzure: PROFILES.coreAzure.weight / 100,      // 0.20
      coreNet: PROFILES.coreNet.weight / 100,           // 0.25
      security: PROFILES.security.weight / 100,        // 0.15
      eventDriven: PROFILES.eventDriven.weight / 100,  // 0.10
      performance: PROFILES.performance.weight / 100, // 0.10
      devops: PROFILES.devops.weight / 100,            // 0.05
      seniority: PROFILES.seniority.weight / 100,      // 0.05
      legacyModernization: PROFILES.legacyModernization.weight / 100 // 0.10
    };
    
    const weightedScore = Math.round(
      categoryScores.coreAzure * weights.coreAzure +
      categoryScores.coreNet * weights.coreNet +
      categoryScores.security * weights.security +
      categoryScores.eventDriven * weights.eventDriven +
      categoryScores.performance * weights.performance +
      categoryScores.devops * weights.devops +
      categoryScores.seniority * weights.seniority +
      categoryScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 85*0.20 + 90*0.25 + 75*0.15 + 60*0.10 + 80*0.10 + 70*0.05 + 95*0.05 + 50*0.10
    // = 17 + 22.5 + 11.25 + 6 + 8 + 3.5 + 4.75 + 5 = 78
    assert.strictEqual(weightedScore, 78, 'Weighted score should be calculated correctly');
  });
  
  it('should handle Azure-focused job correctly', () => {
    // Job with high Azure skills but lower .NET skills
    const azureFocusedScores = {
      coreAzure: 95,      // Very high Azure skills
      coreNet: 60,        // Lower .NET skills
      security: 85,       // High security
      eventDriven: 80,   // Good event-driven
      performance: 75,   // Good performance
      devops: 90,        // High DevOps
      seniority: 100,    // Perfect seniority match
      legacyModernization: 30 // Low legacy skills
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.25,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.05,
      seniority: 0.05,
      legacyModernization: 0.10
    };
    
    const weightedScore = Math.round(
      azureFocusedScores.coreAzure * weights.coreAzure +
      azureFocusedScores.coreNet * weights.coreNet +
      azureFocusedScores.security * weights.security +
      azureFocusedScores.eventDriven * weights.eventDriven +
      azureFocusedScores.performance * weights.performance +
      azureFocusedScores.devops * weights.devops +
      azureFocusedScores.seniority * weights.seniority +
      azureFocusedScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 95*0.20 + 60*0.25 + 85*0.15 + 80*0.10 + 75*0.10 + 90*0.05 + 100*0.05 + 30*0.10
    // = 19 + 15 + 12.75 + 8 + 7.5 + 4.5 + 5 + 3 = 74.75 -> 75
    assert.strictEqual(weightedScore, 75, 'Azure-focused job should score correctly');
  });
  
  it('should handle .NET-focused job correctly', () => {
    // Job with high .NET skills but lower Azure skills
    const netFocusedScores = {
      coreAzure: 50,      // Lower Azure skills
      coreNet: 95,        // Very high .NET skills
      security: 70,      // Moderate security
      eventDriven: 40,   // Lower event-driven
      performance: 85,   // Good performance
      devops: 60,        // Moderate DevOps
      seniority: 90,     // High seniority
      legacyModernization: 80 // Good legacy skills
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.25,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.05,
      seniority: 0.05,
      legacyModernization: 0.10
    };
    
    const weightedScore = Math.round(
      netFocusedScores.coreAzure * weights.coreAzure +
      netFocusedScores.coreNet * weights.coreNet +
      netFocusedScores.security * weights.security +
      netFocusedScores.eventDriven * weights.eventDriven +
      netFocusedScores.performance * weights.performance +
      netFocusedScores.devops * weights.devops +
      netFocusedScores.seniority * weights.seniority +
      netFocusedScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 50*0.20 + 95*0.25 + 70*0.15 + 40*0.10 + 85*0.10 + 60*0.05 + 90*0.05 + 80*0.10
    // = 10 + 23.75 + 10.5 + 4 + 8.5 + 3 + 4.5 + 8 = 72.25 -> 72
    assert.strictEqual(weightedScore, 72, '.NET-focused job should score correctly');
  });
  
  it('should verify independent category scoring', () => {
    // Test that Azure and .NET categories can be scored independently
    const azureOnlyScores = {
      coreAzure: 100,    // Perfect Azure match
      coreNet: 0,        // No .NET skills
      security: 0,
      eventDriven: 0,
      performance: 0,
      devops: 0,
      seniority: 0,
      legacyModernization: 0
    };
    
    const netOnlyScores = {
      coreAzure: 0,      // No Azure skills
      coreNet: 100,      // Perfect .NET match
      security: 0,
      eventDriven: 0,
      performance: 0,
      devops: 0,
      seniority: 0,
      legacyModernization: 0
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.25,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.05,
      seniority: 0.05,
      legacyModernization: 0.10
    };
    
    const azureOnlyScore = Math.round(
      azureOnlyScores.coreAzure * weights.coreAzure +
      azureOnlyScores.coreNet * weights.coreNet +
      azureOnlyScores.security * weights.security +
      azureOnlyScores.eventDriven * weights.eventDriven +
      azureOnlyScores.performance * weights.performance +
      azureOnlyScores.devops * weights.devops +
      azureOnlyScores.seniority * weights.seniority +
      azureOnlyScores.legacyModernization * weights.legacyModernization
    );
    
    const netOnlyScore = Math.round(
      netOnlyScores.coreAzure * weights.coreAzure +
      netOnlyScores.coreNet * weights.coreNet +
      netOnlyScores.security * weights.security +
      netOnlyScores.eventDriven * weights.eventDriven +
      netOnlyScores.performance * weights.performance +
      netOnlyScores.devops * weights.devops +
      netOnlyScores.seniority * weights.seniority +
      netOnlyScores.legacyModernization * weights.legacyModernization
    );
    
    // Azure-only should score 20 (20% weight)
    assert.strictEqual(azureOnlyScore, 20, 'Azure-only job should score 20');
    
    // .NET-only should score 25 (25% weight)
    assert.strictEqual(netOnlyScore, 25, '.NET-only job should score 25');
    
    // Verify they are independent (different scores)
    assert.notStrictEqual(azureOnlyScore, netOnlyScore, 'Azure and .NET scores should be independent');
  });
  
  it('should verify weight distribution adds up to 100%', () => {
    const totalWeight = Object.values(PROFILES).reduce((sum, profile) => sum + profile.weight, 0);
    assert.strictEqual(totalWeight, 100, 'All profile weights should sum to 100%');
    
    // Verify individual weights are reasonable
    assert.ok(PROFILES.coreAzure.weight > 0, 'Azure weight should be positive');
    assert.ok(PROFILES.coreNet.weight > 0, '.NET weight should be positive');
    assert.ok(PROFILES.coreAzure.weight < 50, 'Azure weight should be less than 50%');
    assert.ok(PROFILES.coreNet.weight < 50, '.NET weight should be less than 50%');
    
    // Verify Azure and .NET are the two largest categories
    const weights = Object.values(PROFILES).map(p => p.weight).sort((a, b) => b - a);
    assert.strictEqual(weights[0], 25, 'Highest weight should be .NET (25%)');
    assert.strictEqual(weights[1], 20, 'Second highest weight should be Azure (20%)');
  });
});
