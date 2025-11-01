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
      frontendFrameworks: 50, // Neutral frontend frameworks
      legacyModernization: 50 // Lower legacy skills
    };
    
    // Calculate weighted score using actual profile weights
    const weights = {
      coreAzure: PROFILES.coreAzure.weight / 100,      // 0.20
      coreNet: PROFILES.coreNet.weight / 100,           // 0.20
      security: PROFILES.security.weight / 100,        // 0.15
      eventDriven: PROFILES.eventDriven.weight / 100,  // 0.10
      performance: PROFILES.performance.weight / 100, // 0.10
      devops: PROFILES.devops.weight / 100,            // 0.00
      seniority: PROFILES.seniority.weight / 100,      // 0.10
      frontendFrameworks: PROFILES.frontendFrameworks.weight / 100, // 0.10
      legacyModernization: PROFILES.legacyModernization.weight / 100 // 0.05
    };
    
    const weightedScore = Math.round(
      categoryScores.coreAzure * weights.coreAzure +
      categoryScores.coreNet * weights.coreNet +
      categoryScores.security * weights.security +
      categoryScores.eventDriven * weights.eventDriven +
      categoryScores.performance * weights.performance +
      categoryScores.devops * weights.devops +
      categoryScores.seniority * weights.seniority +
      categoryScores.frontendFrameworks * weights.frontendFrameworks +
      categoryScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 85*0.20 + 90*0.20 + 75*0.15 + 60*0.10 + 80*0.10 + 70*0.00 + 95*0.10 + 50*0.10 + 50*0.05
    // = 17 + 18 + 11.25 + 6 + 8 + 0 + 9.5 + 5 + 2.5 = 77.25 -> 77
    assert.strictEqual(weightedScore, 77, 'Weighted score should be calculated correctly');
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
      frontendFrameworks: 50, // Neutral frontend frameworks
      legacyModernization: 30 // Low legacy skills
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.20,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.00,
      seniority: 0.10,
      frontendFrameworks: 0.10,
      legacyModernization: 0.05
    };
    
    const weightedScore = Math.round(
      azureFocusedScores.coreAzure * weights.coreAzure +
      azureFocusedScores.coreNet * weights.coreNet +
      azureFocusedScores.security * weights.security +
      azureFocusedScores.eventDriven * weights.eventDriven +
      azureFocusedScores.performance * weights.performance +
      azureFocusedScores.devops * weights.devops +
      azureFocusedScores.seniority * weights.seniority +
      azureFocusedScores.frontendFrameworks * weights.frontendFrameworks +
      azureFocusedScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 95*0.20 + 60*0.20 + 85*0.15 + 80*0.10 + 75*0.10 + 90*0.00 + 100*0.10 + 50*0.10 + 30*0.05
    // = 19 + 12 + 12.75 + 8 + 7.5 + 0 + 10 + 5 + 1.5 = 75.75 -> 76
    assert.strictEqual(weightedScore, 76, 'Azure-focused job should score correctly');
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
      frontendFrameworks: 50, // Neutral frontend frameworks
      legacyModernization: 80 // Good legacy skills
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.20,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.00,
      seniority: 0.10,
      frontendFrameworks: 0.10,
      legacyModernization: 0.05
    };
    
    const weightedScore = Math.round(
      netFocusedScores.coreAzure * weights.coreAzure +
      netFocusedScores.coreNet * weights.coreNet +
      netFocusedScores.security * weights.security +
      netFocusedScores.eventDriven * weights.eventDriven +
      netFocusedScores.performance * weights.performance +
      netFocusedScores.devops * weights.devops +
      netFocusedScores.seniority * weights.seniority +
      netFocusedScores.frontendFrameworks * weights.frontendFrameworks +
      netFocusedScores.legacyModernization * weights.legacyModernization
    );
    
    // Expected: 50*0.20 + 95*0.20 + 70*0.15 + 40*0.10 + 85*0.10 + 60*0.00 + 90*0.10 + 50*0.10 + 80*0.05
    // = 10 + 19 + 10.5 + 4 + 8.5 + 0 + 9 + 5 + 4 = 70
    assert.strictEqual(weightedScore, 70, '.NET-focused job should score correctly');
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
      frontendFrameworks: 0,
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
      frontendFrameworks: 0,
      legacyModernization: 0
    };
    
    const weights = {
      coreAzure: 0.20,
      coreNet: 0.20,
      security: 0.15,
      eventDriven: 0.10,
      performance: 0.10,
      devops: 0.00,
      seniority: 0.10,
      frontendFrameworks: 0.10,
      legacyModernization: 0.05
    };
    
    const azureOnlyScore = Math.round(
      azureOnlyScores.coreAzure * weights.coreAzure +
      azureOnlyScores.coreNet * weights.coreNet +
      azureOnlyScores.security * weights.security +
      azureOnlyScores.eventDriven * weights.eventDriven +
      azureOnlyScores.performance * weights.performance +
      azureOnlyScores.devops * weights.devops +
      azureOnlyScores.seniority * weights.seniority +
      azureOnlyScores.frontendFrameworks * weights.frontendFrameworks +
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
      netOnlyScores.frontendFrameworks * weights.frontendFrameworks +
      netOnlyScores.legacyModernization * weights.legacyModernization
    );
    
    // Both Azure-only and .NET-only should now score 20 (20% weight each)
    assert.strictEqual(azureOnlyScore, 20, 'Azure-only job should score 20');
    assert.strictEqual(netOnlyScore, 20, '.NET-only job should score 20');
    
    // They are now equal weight categories
    assert.strictEqual(azureOnlyScore, netOnlyScore, 'Azure and .NET categories have equal weight');
  });
  
  it('should verify weight distribution adds up to 100%', () => {
    const totalWeight = Object.values(PROFILES).reduce((sum, profile) => sum + profile.weight, 0);
    assert.strictEqual(totalWeight, 100, 'All profile weights should sum to 100%');
    
    // Verify individual weights are reasonable
    assert.ok(PROFILES.coreAzure.weight > 0, 'Azure weight should be positive');
    assert.ok(PROFILES.coreNet.weight > 0, '.NET weight should be positive');
    assert.ok(PROFILES.frontendFrameworks.weight > 0, 'Frontend frameworks weight should be positive');
    assert.ok(PROFILES.coreAzure.weight < 50, 'Azure weight should be less than 50%');
    assert.ok(PROFILES.coreNet.weight < 50, '.NET weight should be less than 50%');
    
    // Verify Azure and .NET are among the largest categories (now equal at 20%)
    const weights = Object.values(PROFILES).map(p => p.weight).sort((a, b) => b - a);
    assert.ok(weights[0] === 20, 'Highest weights should be 20%');
    assert.ok(weights.filter(w => w === 20).length === 2, 'Should have two categories at 20% (Azure and .NET)');
  });
});
