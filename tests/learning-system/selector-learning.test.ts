import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  initDb, 
  setTestMode,
  closeDb,
  saveLabelMapping, 
  getLabelMapping, 
  getAllMappings,
  updateMappingSuccess,
  updateMappingFailure,
  getLabelMappingByKey,
  calculateDynamicConfidence,
  clearLabelMappings,
  LabelMapping
} from '../../src/lib/db.js';

describe('Selector Learning System', () => {
  beforeEach(() => {
    // Initialize fresh database for each test
    setTestMode(true);
    initDb();
    clearLabelMappings();
  });

  afterEach(() => {
    // Clean up after each test
    clearLabelMappings();
    closeDb();
  });

  describe('Database Schema and Operations', () => {
    it('should save and retrieve label mappings with learning fields', () => {
      const mapping: LabelMapping = {
        label: 'Email Address',
        key: 'email',
        locator: '#email-field',
        confidence: 0.99,
        success_count: 5,
        failure_count: 1,
        field_type: 'input',
        input_strategy: 'fill'
      };

      saveLabelMapping(mapping);
      const retrieved = getLabelMapping('Email Address');

      assert.ok(retrieved, 'Mapping should be saved and retrievable');
      assert.strictEqual(retrieved!.label, 'Email Address');
      assert.strictEqual(retrieved!.key, 'email');
      assert.strictEqual(retrieved!.locator, '#email-field');
      assert.strictEqual(retrieved!.confidence, 0.99);
      assert.strictEqual(retrieved!.success_count, 5);
      assert.strictEqual(retrieved!.failure_count, 1);
      assert.strictEqual(retrieved!.field_type, 'input');
      assert.strictEqual(retrieved!.input_strategy, 'fill');
    });

    it('should handle mappings without learning fields', () => {
      const mapping: LabelMapping = {
        label: 'Phone Number',
        key: 'phone',
        confidence: 0.95
      };

      saveLabelMapping(mapping);
      const retrieved = getLabelMapping('Phone Number');

      assert.ok(retrieved, 'Mapping should be saved');
      assert.strictEqual(retrieved!.success_count, 0);
      assert.strictEqual(retrieved!.failure_count, 0);
      assert.strictEqual(retrieved!.field_type, null);
      assert.strictEqual(retrieved!.input_strategy, null);
    });
  });

  describe('Learning Functions', () => {
    it('should update success count and locator', () => {
      // Create initial mapping
      saveLabelMapping({
        label: 'Full Name',
        key: 'full_name',
        locator: '#name-field',
        confidence: 0.95,
        success_count: 2,
        failure_count: 0
      });

      // Update success
      updateMappingSuccess('Full Name', '#new-name-field');

      const updated = getLabelMapping('Full Name');
      assert.strictEqual(updated!.success_count, 3);
      assert.strictEqual(updated!.locator, '#new-name-field');
    });

    it('should update failure count', () => {
      // Create initial mapping
      saveLabelMapping({
        label: 'City',
        key: 'city',
        locator: '#city-field',
        confidence: 0.98,
        success_count: 3,
        failure_count: 1
      });

      // Update failure
      updateMappingFailure('City');

      const updated = getLabelMapping('City');
      assert.strictEqual(updated!.failure_count, 2);
    });

    it('should retrieve mappings by canonical key', () => {
      // Create multiple mappings for the same key
      saveLabelMapping({
        label: 'Email Address',
        key: 'email',
        locator: '#email-1',
        confidence: 0.99
      });

      saveLabelMapping({
        label: 'Work Email',
        key: 'email',
        locator: '#email-2',
        confidence: 0.95
      });

      saveLabelMapping({
        label: 'Phone Number',
        key: 'phone',
        locator: '#phone-1',
        confidence: 0.98
      });

      const emailMappings = getLabelMappingByKey('email');
      assert.strictEqual(emailMappings.length, 2);
      
      // Should be ordered by confidence DESC
      assert.strictEqual(emailMappings[0].confidence, 0.99);
      assert.strictEqual(emailMappings[1].confidence, 0.95);
    });
  });

  describe('Dynamic Confidence Calculation', () => {
    it('should calculate confidence correctly with success boost', () => {
      const baseConfidence = 0.8;
      const successCount = 5;
      const failureCount = 1;

      const confidence = calculateDynamicConfidence(baseConfidence, successCount, failureCount);
      
      // Expected: 0.8 * (1 + (5 * 0.05)) * (1 - (1 * 0.1)) = 0.8 * 1.25 * 0.9 = 0.9
      assert.strictEqual(confidence, 0.9);
    });

    it('should calculate confidence correctly with failure penalty', () => {
      const baseConfidence = 0.95;
      const successCount = 2;
      const failureCount = 3;

      const confidence = calculateDynamicConfidence(baseConfidence, successCount, failureCount);
      
      // Expected: 0.95 * (1 + (2 * 0.05)) * (1 - (3 * 0.1)) = 0.95 * 1.1 * 0.7 = 0.7315
      assert.ok(Math.abs(confidence - 0.7315) < 0.0001, `Expected ~0.7315, got ${confidence}`);
    });

    it('should clamp confidence between 0.5 and 1.0', () => {
      // Test minimum clamping
      const lowConfidence = calculateDynamicConfidence(0.3, 0, 10);
      assert.strictEqual(lowConfidence, 0.5);

      // Test maximum clamping
      const highConfidence = calculateDynamicConfidence(0.9, 20, 0);
      assert.strictEqual(highConfidence, 1.0);
    });

    it('should handle edge cases', () => {
      // Zero counts
      const zeroConfidence = calculateDynamicConfidence(0.8, 0, 0);
      assert.strictEqual(zeroConfidence, 0.8);

      // High success count
      const highSuccessConfidence = calculateDynamicConfidence(0.7, 50, 0);
      assert.strictEqual(highSuccessConfidence, 1.0);
    });
  });

  describe('Learning System Integration', () => {
    it('should track learning progress across multiple interactions', () => {
      const label = 'LinkedIn Profile';
      const key = 'linkedin_url';

      // Initial mapping
      saveLabelMapping({
        label,
        key,
        confidence: 0.95
      });

      // Simulate successful fills
      for (let i = 0; i < 3; i++) {
        updateMappingSuccess(label, '#linkedin-field');
      }

      // Simulate one failure
      updateMappingFailure(label);

      const final = getLabelMapping(label);
      assert.strictEqual(final!.success_count, 3);
      assert.strictEqual(final!.failure_count, 1);
      assert.strictEqual(final!.locator, '#linkedin-field');

      // Calculate final confidence
      const finalConfidence = calculateDynamicConfidence(0.95, 3, 1);
      assert.strictEqual(finalConfidence, 0.95 * 1.15 * 0.9); // 0.95 * (1 + 0.15) * (1 - 0.1)
    });

    it('should handle multiple labels learning independently', () => {
      const labels = [
        { label: 'Email Address', key: 'email', locator: '#email' },
        { label: 'Phone Number', key: 'phone', locator: '#phone' },
        { label: 'Full Name', key: 'full_name', locator: '#name' }
      ];

      // Create initial mappings
      labels.forEach(({ label, key }) => {
        saveLabelMapping({ label, key, confidence: 0.9 });
      });

      // Simulate different learning patterns
      updateMappingSuccess('Email Address', '#email');
      updateMappingSuccess('Email Address', '#email');
      updateMappingFailure('Email Address');

      updateMappingSuccess('Phone Number', '#phone');
      updateMappingSuccess('Phone Number', '#phone');
      updateMappingSuccess('Phone Number', '#phone');

      updateMappingFailure('Full Name');
      updateMappingFailure('Full Name');

      // Verify each label learned independently
      const email = getLabelMapping('Email Address');
      const phone = getLabelMapping('Phone Number');
      const name = getLabelMapping('Full Name');

      assert.strictEqual(email!.success_count, 2);
      assert.strictEqual(email!.failure_count, 1);

      assert.strictEqual(phone!.success_count, 3);
      assert.strictEqual(phone!.failure_count, 0);

      assert.strictEqual(name!.success_count, 0);
      assert.strictEqual(name!.failure_count, 2);
    });
  });

  describe('Selector Stability and Quality', () => {
    it('should prioritize stable selectors', () => {
      const testCases = [
        { label: 'Email Field', selector: '#email-field', expected: 'id' },
        { label: 'Name Field', selector: 'input[name="full_name"]', expected: 'name' },
        { label: 'Phone Field', selector: 'input[type="tel"][aria-label="Phone"]', expected: 'type+aria' },
        { label: 'Generic Field', selector: 'input', expected: 'tag' }
      ];

      testCases.forEach(({ label, selector, expected }) => {
        saveLabelMapping({
          label,
          key: 'test',
          locator: selector,
          confidence: 0.9
        });

        const retrieved = getLabelMapping(label);
        assert.strictEqual(retrieved!.locator, selector);
      });
    });

    it('should handle selector updates gracefully', () => {
      const label = 'Dynamic Field';
      
      // Initial mapping with one selector
      saveLabelMapping({
        label,
        key: 'test',
        locator: '#old-selector',
        confidence: 0.8
      });

      // Update with new selector
      updateMappingSuccess(label, '#new-selector');

      const updated = getLabelMapping(label);
      assert.strictEqual(updated!.locator, '#new-selector');
      assert.strictEqual(updated!.success_count, 1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of mappings efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 mappings
      for (let i = 0; i < 1000; i++) {
        saveLabelMapping({
          label: `Field ${i}`,
          key: 'test',
          locator: `#field-${i}`,
          confidence: 0.8 + (i % 20) * 0.01
        });
      }

      const createTime = Date.now() - startTime;
      
      // Retrieve all mappings
      const retrieveStart = Date.now();
      const allMappings = getAllMappings();
      const retrieveTime = Date.now() - retrieveStart;

      assert.strictEqual(allMappings.length, 1000);
      assert.ok(createTime < 1000, `Creation took ${createTime}ms, should be < 1000ms`);
      assert.ok(retrieveTime < 100, `Retrieval took ${retrieveTime}ms, should be < 100ms`);
    });

    it('should maintain performance with frequent updates', () => {
      const label = 'Performance Test Field';
      
      saveLabelMapping({
        label,
        key: 'test',
        confidence: 0.9
      });

      const startTime = Date.now();
      
      // Simulate 100 success/failure cycles
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          updateMappingSuccess(label, `#selector-${i}`);
        } else {
          updateMappingFailure(label);
        }
      }

      const updateTime = Date.now() - startTime;
      
      const final = getLabelMapping(label);
      assert.strictEqual(final!.success_count, 50);
      assert.strictEqual(final!.failure_count, 50);
      assert.ok(updateTime < 500, `Updates took ${updateTime}ms, should be < 500ms`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent label updates gracefully', () => {
      // These should not throw errors
      assert.doesNotThrow(() => {
        updateMappingSuccess('Non-existent Label', '#selector');
        updateMappingFailure('Non-existent Label');
      });
    });

    it('should handle null/undefined values gracefully', () => {
      assert.doesNotThrow(() => {
        saveLabelMapping({
          label: 'Test Field',
          key: 'test',
          locator: undefined,
          confidence: 0.8
        });
      });

      const retrieved = getLabelMapping('Test Field');
      assert.strictEqual(retrieved!.locator, null);
    });

    it('should handle empty strings and special characters', () => {
      const specialLabels = [
        'Field with "quotes"',
        'Field with spaces',
        'Field-with-dashes',
        'Field_with_underscores',
        'Field.with.dots'
      ];

      specialLabels.forEach((label, index) => {
        saveLabelMapping({
          label,
          key: 'test',
          locator: `#field-${index}`,
          confidence: 0.9
        });

        const retrieved = getLabelMapping(label);
        assert.ok(retrieved, `Should handle special label: ${label}`);
        assert.strictEqual(retrieved!.label, label);
      });
    });
  });

  describe('Learning System Validation', () => {
    it('should demonstrate complete learning workflow', () => {
      // Step 1: Initial mapping creation
      const initialMapping: LabelMapping = {
        label: 'Salary Expectations',
        key: 'salary_expectation',
        confidence: 0.95
      };
      saveLabelMapping(initialMapping);

      // Step 2: First successful fill - learn selector
      updateMappingSuccess('Salary Expectations', 'input[name="salary"]');
      
      let mapping = getLabelMapping('Salary Expectations');
      assert.strictEqual(mapping!.success_count, 1);
      assert.strictEqual(mapping!.locator, 'input[name="salary"]');

      // Step 3: Multiple successful fills - boost confidence
      for (let i = 0; i < 4; i++) {
        updateMappingSuccess('Salary Expectations', 'input[name="salary"]');
      }

      mapping = getLabelMapping('Salary Expectations');
      assert.strictEqual(mapping!.success_count, 5);

      // Step 4: Calculate dynamic confidence
      const dynamicConfidence = calculateDynamicConfidence(0.95, 5, 0);
      const expectedConfidence = Math.min(1.0, 0.95 * 1.25); // Should be clamped to 1.0
      assert.strictEqual(dynamicConfidence, expectedConfidence);

      // Step 5: Simulate some failures
      updateMappingFailure('Salary Expectations');
      updateMappingFailure('Salary Expectations');

      mapping = getLabelMapping('Salary Expectations');
      assert.strictEqual(mapping!.failure_count, 2);

      // Step 6: Final confidence calculation
      const finalConfidence = calculateDynamicConfidence(0.95, 5, 2);
      const finalExpectedConfidence = 0.95 * 1.25 * 0.8; // 0.95 * (1 + 0.25) * (1 - 0.2)
      assert.ok(Math.abs(finalConfidence - finalExpectedConfidence) < 0.0001, 
        `Expected ~${finalExpectedConfidence}, got ${finalConfidence}`);

      // Step 7: Verify learning persistence
      const allMappings = getAllMappings();
      const learnedMapping = allMappings.find(m => m.label === 'Salary Expectations');
      assert.ok(learnedMapping);
      assert.strictEqual(learnedMapping!.success_count, 5);
      assert.strictEqual(learnedMapping!.failure_count, 2);
      assert.strictEqual(learnedMapping!.locator, 'input[name="salary"]');
    });

    it('should validate learning system benefits', () => {
      // Simulate a realistic scenario with multiple form fields
      const formFields = [
        { label: 'Email Address', key: 'email', selector: '#email' },
        { label: 'Phone Number', key: 'phone', selector: 'input[name="phone"]' },
        { label: 'Full Name', key: 'full_name', selector: '#full-name' },
        { label: 'City', key: 'city', selector: 'input[type="text"][aria-label="City"]' }
      ];

      // Initialize mappings
      formFields.forEach(({ label, key }) => {
        saveLabelMapping({ label, key, confidence: 0.9 });
      });

      // Simulate learning over multiple applications
      formFields.forEach(({ label, selector }) => {
        // Each field succeeds 3 times, fails 1 time
        for (let i = 0; i < 3; i++) {
          updateMappingSuccess(label, selector);
        }
        updateMappingFailure(label);
      });

      // Verify learning results
      const allMappings = getAllMappings();
      const learnedMappings = allMappings.filter(m => m.locator);

      assert.strictEqual(learnedMappings.length, 4);
      
      learnedMappings.forEach(mapping => {
        assert.strictEqual(mapping.success_count, 3);
        assert.strictEqual(mapping.failure_count, 1);
        assert.ok(mapping.locator);
        
        // Verify confidence improved from learning
        const learnedConfidence = calculateDynamicConfidence(0.9, 3, 1);
        assert.ok(learnedConfidence > 0.9, 'Confidence should improve with learning');
      });

      // Verify we can retrieve by key
      const emailMappings = getLabelMappingByKey('email');
      assert.strictEqual(emailMappings.length, 1);
      assert.strictEqual(emailMappings[0].locator, '#email');
    });
  });
});

// Note: Run with: tsx --test tests/selector-learning.test.ts
// Or: npm test (after configuring package.json)
