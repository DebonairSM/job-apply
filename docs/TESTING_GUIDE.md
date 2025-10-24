# Testing Guide

This guide covers the comprehensive testing system for the job application automation platform.

## Test Structure

The testing system is organized into two main categories:

### Core System Tests
- **Integration Tests** (`integration.test.ts`) - End-to-end workflow validation
- **Login Tests** (`login.test.ts`) - Authentication and session management
- **Mapper Tests** (`mapper.test.ts`) - Field mapping and form detection
- **Ranker Tests** (`ranker.test.ts`) - Job scoring and AI evaluation
- **Search Tests** (`search.test.ts`) - Job search and filtering

### Selector Learning System Tests
- **Selector Learning** (`selector-learning.test.ts`) - CSS selector capture and storage
- **Form Filling Learning** (`form-filling-learning.test.ts`) - Field type detection and learning
- **Learning Integration** (`selector-learning-integration.test.ts`) - End-to-end learning workflows

## Running Tests

### All Tests (Recommended)
```bash
npm run test:all
```

This runs both core system tests and selector learning system tests with comprehensive reporting.

### Core System Tests Only
```bash
npm test
```

### Selector Learning System Tests Only
```bash
npm run test:learning
```

### Individual Test Files
```bash
# Core system tests
npx tsx --test tests/integration.test.ts
npx tsx --test tests/login.test.ts
npx tsx --test tests/mapper.test.ts
npx tsx --test tests/ranker.test.ts
npx tsx --test tests/search.test.ts

# Learning system tests
npx tsx --test tests/learning-system/selector-learning.test.ts
npx tsx --test tests/learning-system/form-filling-learning.test.ts
npx tsx --test tests/learning-system/selector-learning-integration.test.ts
```

## Test Coverage

### Core System Tests
- **Database Operations**: Job storage, status tracking, cache management
- **Authentication**: LinkedIn login, session persistence, cookie handling
- **Job Processing**: Search, ranking, application workflow
- **AI Integration**: LLM communication, response parsing, error handling
- **Form Automation**: ATS detection, field mapping, form submission

### Selector Learning System Tests
- **Database Schema**: Learning metrics, success/failure tracking, confidence calculation
- **Selector Extraction**: CSS selector capture with stability prioritization
- **Form Filling**: Field type detection, learning integration, error handling
- **End-to-End Workflows**: Complete learning scenarios, performance validation

## Expected Results

All tests should pass with 100% success rate, validating:

### Core System
- Database connectivity and operations
- Authentication flow
- Job search and ranking accuracy
- AI response generation
- Form filling reliability

### Learning System
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

Enable debug output for detailed test information:

```bash
DEBUG=1 npm run test:all
DEBUG=1 npm run test:learning
```

## Test Reports

The test runners provide comprehensive reports including:
- Individual test results
- Success/failure counts
- Overall success rate
- Feature validation summary
- Performance metrics

## Troubleshooting

### Common Issues

1. **Database Lock Errors**: Ensure no other processes are using the database
2. **LLM Connection Issues**: Verify Ollama is running (`docker compose -f docker-compose.llm.yml up -d`)
3. **LinkedIn Session Expired**: Run `npm run login` to refresh authentication
4. **Test Timeouts**: Increase timeout values for slow operations

### Debug Information

Tests automatically capture:
- Screenshots of failed operations
- Detailed error logs
- Performance metrics
- Database state snapshots

Check the `artifacts/` folder for debugging information after test failures.

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- No external dependencies required
- Deterministic results
- Comprehensive error reporting
- Performance benchmarking

## Test Data

Tests use isolated test data that doesn't interfere with production:
- Separate test database
- Mock LinkedIn responses
- Controlled test scenarios
- Cleanup after each test run
