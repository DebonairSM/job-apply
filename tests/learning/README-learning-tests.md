# Selector Learning System Tests

Tests for the selector learning system that improves form-filling reliability by capturing and reusing CSS selectors.

## Quick Start

```bash
# Run all learning system tests
node tests/learning-system/run-learning-tests.cjs

# Run individual test files
npx tsx --test tests/learning-system/selector-learning.test.ts
npx tsx --test tests/learning-system/form-filling-learning.test.ts
npx tsx --test tests/learning-system/selector-learning-integration.test.ts
```

## What It Tests

- **Database Operations**: Learning metrics, success/failure tracking, confidence calculation
- **Selector Extraction**: CSS selector capture with stability prioritization
- **Form Filling**: Field type detection, learning integration, error handling
- **End-to-End Workflows**: Complete learning scenarios, performance validation

## Expected Results

All tests should pass with 100% success rate, validating:
- Database schema with learning metrics
- Success/failure tracking
- Dynamic confidence calculation
- Selector extraction and storage
- Cached selector priority
- Field type detection
- Learning integration
- Error handling
- Performance benefits

## Debug Mode

```bash
DEBUG=1 npx tsx --test tests/learning-system/selector-learning-integration.test.ts
```
