/**
 * Test bonus-only category behavior
 * 
 * This test verifies that categories with empty mustHave arrays (like frontendFrameworks)
 * act as "bonus-only" - they boost scores when present but don't penalize when absent.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Bonus-Only Category Scoring', () => {
  it('should redistribute weight when bonus category scores 0', () => {
    // Simulate profile weights: core profile
    const profileWeights = {
      coreAzure: 33,
      seniority: 17,
      coreNet: 30,
      frontendFrameworks: 10,  // Bonus-only category
      legacyModernization: 10,
      legacyWeb: 0
    };

    // Job with NO frontend (frontend scores 0)
    const categoryScores = {
      coreAzure: 80,
      seniority: 90,
      coreNet: 95,
      frontendFrameworks: 0,  // Missing frontend - should NOT penalize
      legacyModernization: 10,
      legacyWeb: 20
    };

    // Identify bonus categories with zero scores
    const BONUS_ONLY_CATEGORIES = ['frontendFrameworks'];
    let redistributedWeight = 0;
    const bonusCategories: Record<string, boolean> = {};
    
    Object.entries(profileWeights).forEach(([key, weight]) => {
      const score = categoryScores[key as keyof typeof categoryScores];
      
      if (BONUS_ONLY_CATEGORIES.includes(key) && score === 0 && weight > 0) {
        bonusCategories[key] = true;
        redistributedWeight += weight;
      }
    });

    // Calculate final weights after redistribution
    const finalWeights: Record<string, number> = {};
    const requiredCategoriesWeight = 100 - redistributedWeight;
    
    Object.entries(profileWeights).forEach(([key, weight]) => {
      if (bonusCategories[key]) {
        finalWeights[key] = 0;
      } else if (requiredCategoriesWeight > 0) {
        finalWeights[key] = weight + (weight / requiredCategoriesWeight) * redistributedWeight;
      } else {
        finalWeights[key] = weight;
      }
    });

    // Calculate fit score
    let fitScoreWithoutFrontend = 0;
    Object.entries(finalWeights).forEach(([key, weight]) => {
      const normalizedWeight = weight / 100;
      const score = categoryScores[key as keyof typeof categoryScores];
      fitScoreWithoutFrontend += score * normalizedWeight;
    });

    console.log('\n=== Test: Job WITHOUT Frontend ===');
    console.log('Category Scores:', categoryScores);
    console.log('Bonus Categories Detected:', Object.keys(bonusCategories));
    console.log('Redistributed Weight:', redistributedWeight + '%');
    console.log('Final Weights:', finalWeights);
    console.log('Fit Score:', fitScoreWithoutFrontend.toFixed(2));

    // Verify weight redistribution happened
    assert.strictEqual(finalWeights.frontendFrameworks, 0);
    assert.strictEqual(redistributedWeight, 10);
    
    // Verify other categories received the redistributed weight
    assert.ok(finalWeights.coreAzure > 33);
    assert.ok(finalWeights.seniority > 17);
    assert.ok(finalWeights.coreNet > 30);
    
    // Now test with frontend present (should boost score)
    const categoryScoresWithFrontend = {
      ...categoryScores,
      frontendFrameworks: 80  // Has frontend - should BOOST score
    };

    // Reset for second calculation
    const bonusCategories2: Record<string, boolean> = {};
    let redistributedWeight2 = 0;
    
    Object.entries(profileWeights).forEach(([key, weight]) => {
      const score = categoryScoresWithFrontend[key as keyof typeof categoryScoresWithFrontend];
      
      if (BONUS_ONLY_CATEGORIES.includes(key) && score === 0 && weight > 0) {
        bonusCategories2[key] = true;
        redistributedWeight2 += weight;
      }
    });

    // Calculate final weights (no redistribution this time)
    const finalWeights2: Record<string, number> = {};
    const requiredCategoriesWeight2 = 100 - redistributedWeight2;
    
    Object.entries(profileWeights).forEach(([key, weight]) => {
      if (bonusCategories2[key]) {
        finalWeights2[key] = 0;
      } else if (requiredCategoriesWeight2 > 0) {
        finalWeights2[key] = weight + (weight / requiredCategoriesWeight2) * redistributedWeight2;
      } else {
        finalWeights2[key] = weight;
      }
    });

    let fitScoreWithFrontend = 0;
    Object.entries(finalWeights2).forEach(([key, weight]) => {
      const normalizedWeight = weight / 100;
      const score = categoryScoresWithFrontend[key as keyof typeof categoryScoresWithFrontend];
      fitScoreWithFrontend += score * normalizedWeight;
    });

    console.log('\n=== Test: Job WITH Frontend ===');
    console.log('Category Scores:', categoryScoresWithFrontend);
    console.log('Bonus Categories Detected:', Object.keys(bonusCategories2));
    console.log('Redistributed Weight:', redistributedWeight2 + '%');
    console.log('Final Weights:', finalWeights2);
    console.log('Fit Score:', fitScoreWithFrontend.toFixed(2));

    // Verify NO redistribution when frontend is present
    assert.strictEqual(Object.keys(bonusCategories2).length, 0);
    assert.strictEqual(redistributedWeight2, 0);
    assert.strictEqual(finalWeights2.frontendFrameworks, 10);
    
    // Verify score WITH frontend is higher than WITHOUT
    assert.ok(fitScoreWithFrontend > fitScoreWithoutFrontend);
    
    console.log('\n=== Comparison ===');
    console.log(`Score WITHOUT frontend: ${fitScoreWithoutFrontend.toFixed(2)}`);
    console.log(`Score WITH frontend: ${fitScoreWithFrontend.toFixed(2)}`);
    console.log(`Difference: +${(fitScoreWithFrontend - fitScoreWithoutFrontend).toFixed(2)} (boost from frontend)`);
  });

  it('should handle old behavior for comparison', () => {
    // OLD BEHAVIOR: Direct multiplication (frontend absence penalizes)
    const profileWeights = {
      coreAzure: 33,
      seniority: 17,
      coreNet: 30,
      frontendFrameworks: 10,
      legacyModernization: 10,
      legacyWeb: 0
    };

    const categoryScores = {
      coreAzure: 80,
      seniority: 90,
      coreNet: 95,
      frontendFrameworks: 0,  // Missing frontend
      legacyModernization: 10,
      legacyWeb: 20
    };

    let oldFitScore = 0;
    Object.entries(profileWeights).forEach(([key, weight]) => {
      const normalizedWeight = weight / 100;
      const score = categoryScores[key as keyof typeof categoryScores];
      oldFitScore += score * normalizedWeight;
    });

    console.log('\n=== OLD BEHAVIOR (for comparison) ===');
    console.log('Fit Score (old logic):', oldFitScore.toFixed(2));
    console.log('This score is LOWER because frontend absence penalized the job');
    
    // Old behavior would give lower score because 0 * 10% = 0 contribution
    assert.ok(oldFitScore < 85);  // Penalized by missing frontend
  });
});

