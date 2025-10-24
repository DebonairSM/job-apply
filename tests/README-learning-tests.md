# Selector Learning System - Test Suite

This test suite validates the complete selector learning system implementation, ensuring all components work correctly together.

## Overview

The selector learning system is a key feature that improves form-filling reliability and performance by:
- Capturing CSS selectors when successfully filling form fields
- Storing selectors with dynamic confidence scoring
- Using cached selectors as the first attempt before falling back to label-based matching
- Learning from success/failure patterns to improve over time

## Test Files

### 1. `selector-learning.test.ts`
**Core Learning System Tests**

Tests the fundamental learning system components:
- Database schema and operations
- Success/failure tracking functions
- Dynamic confidence calculation
- Learning system integration
- Selector stability and quality
- Performance and scalability
- Error handling and edge cases

**Key Test Cases:**
- Save and retrieve label mappings with learning fields
- Update success count and locator
- Update failure count
- Retrieve mappings by canonical key
- Calculate dynamic confidence with success boost
- Calculate dynamic confidence with failure penalty
- Clamp confidence between 0.5 and 1.0
- Track learning progress across multiple interactions
- Handle multiple labels learning independently

### 2. `form-filling-learning.test.ts`
**Form Filling Integration Tests**

Tests the form filling functionality with mocked Playwright elements:
- Selector extraction with different priorities
- Field type detection for various input types
- Learning integration with form filling
- Error handling for element evaluation

**Key Test Cases:**
- Extract ID selectors with highest priority
- Extract name selectors when ID is not available
- Extract type selectors as fallback
- Handle label+for attribute method
- Detect different input types correctly
- Detect textarea and select elements
- Learn from successful fills
- Handle failed fills gracefully
- Demonstrate complete learning workflow

### 3. `selector-learning-integration.test.ts`
**End-to-End Integration Tests**

Tests the complete learning workflow with realistic scenarios:
- Complete learning workflow simulation
- Learning system resilience
- Performance benefits validation
- Learning system requirements validation

**Key Test Cases:**
- Realistic form learning scenario with multiple steps
- Learning system resilience to selector changes
- Performance comparison with vs without learning
- Validation of all learning system requirements

## Running the Tests

### Individual Test Files
```bash
# Run core learning system tests
npx tsx --test tests/selector-learning.test.ts

# Run form filling integration tests
npx tsx --test tests/form-filling-learning.test.ts

# Run end-to-end integration tests
npx tsx --test tests/selector-learning-integration.test.ts
```

### All Tests Together
```bash
# Run the test runner script
node tests/run-learning-tests.js
```

### With Debug Output
```bash
# Enable debug logging to see learning progress
DEBUG=1 npx tsx --test tests/selector-learning-integration.test.ts
```

## Test Coverage

The test suite covers:

### ✅ Database Layer
- Schema migration and new columns
- CRUD operations for learning metrics
- Success/failure tracking functions
- Dynamic confidence calculation
- Performance with large datasets

### ✅ Learning Logic
- Selector extraction and prioritization
- Field type and strategy detection
- Cached selector usage
- Fallback mechanisms
- Error handling and edge cases

### ✅ Integration
- Form filling with learning
- Mapping system integration
- End-to-end learning workflows
- Performance benefits
- Resilience to changes

### ✅ Validation
- Learning system requirements
- Realistic scenario testing
- Performance benchmarking
- Error condition handling

## Expected Results

When all tests pass, you should see:

```
🧪 Running Selector Learning System Tests

============================================================

📋 Running selector-learning.test.ts...
----------------------------------------
✅ selector-learning.test.ts - PASSED

📋 Running form-filling-learning.test.ts...
----------------------------------------
✅ form-filling-learning.test.ts - PASSED

📋 Running form-filling-learning.test.ts...
----------------------------------------
✅ selector-learning-integration.test.ts - PASSED

============================================================
📊 TEST SUMMARY
============================================================

Total Tests: 3
Passed: 3
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! The selector learning system is working correctly.

✨ Key Features Validated:
   • Database schema with learning metrics
   • Success/failure tracking
   • Dynamic confidence calculation
   • Selector extraction and storage
   • Cached selector priority
   • Field type detection
   • Learning integration
   • Error handling
   • Performance benefits
   • End-to-end learning workflow
```

## Learning System Benefits Validated

The tests validate that the learning system provides:

1. **Performance Improvement**: Direct CSS selector targeting is faster than label text matching
2. **Reliability**: Proven selectors are used first, with fallback to label-based methods
3. **Self-healing**: System automatically finds new selectors when old ones fail
4. **Progressive Improvement**: Confidence increases with successful use and decreases with failures
5. **Learning**: System learns and improves over time as it encounters the same forms

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure the database is properly initialized
   - Check that migration scripts ran correctly

2. **Test Timeouts**
   - Some integration tests simulate realistic scenarios
   - Increase timeout if running on slower systems

3. **Mock Element Issues**
   - Form filling tests use mocked Playwright elements
   - Ensure mock implementations match expected behavior

### Debug Mode

Enable debug logging to see detailed learning progress:
```bash
DEBUG=1 npx tsx --test tests/selector-learning-integration.test.ts
```

This will show:
- Selector extraction details
- Learning progress updates
- Cache hit/miss information
- Confidence score changes
- Performance metrics

## Contributing

When adding new features to the learning system:

1. Add corresponding tests to the appropriate test file
2. Update integration tests for end-to-end validation
3. Ensure all tests pass before submitting changes
4. Add performance benchmarks for new features

The test suite serves as both validation and documentation of the learning system's capabilities.
