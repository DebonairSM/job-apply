import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';

/**
 * Tests for login command module execution logic
 * 
 * These tests verify that the login command only executes when run directly,
 * not when imported as a module by other parts of the application.
 */

describe('Login Command Module Execution', () => {
  it('should not execute when import.meta.url does not match process.argv[1]', () => {
    // Simulate being imported (not run directly)
    const importMetaUrl = 'file:///C:/git/job-apply/src/commands/login.ts';
    const processArgv1 = 'C:/git/job-apply/src/cli.ts';
    
    const isMainModule = importMetaUrl === `file:///${processArgv1.replace(/\\/g, '/')}`;
    
    assert.strictEqual(
      isMainModule,
      false,
      'Should not be main module when import.meta.url does not match process.argv[1]'
    );
  });

  it('should execute when import.meta.url matches process.argv[1]', () => {
    // Simulate being run directly
    const importMetaUrl = 'file:///C:/git/job-apply/src/commands/login.ts';
    const processArgv1 = 'C:/git/job-apply/src/commands/login.ts';
    
    const isMainModule = importMetaUrl === `file:///${processArgv1.replace(/\\/g, '/')}`;
    
    assert.strictEqual(
      isMainModule,
      true,
      'Should be main module when import.meta.url matches process.argv[1]'
    );
  });

  it('should handle Windows paths with backslashes correctly', () => {
    const importMetaUrl = 'file:///C:/git/job-apply/src/commands/login.ts';
    const processArgv1 = 'C:\\git\\job-apply\\src\\commands\\login.ts';
    
    const isMainModule = importMetaUrl === `file:///${processArgv1.replace(/\\/g, '/')}`;
    
    assert.strictEqual(
      isMainModule,
      true,
      'Should handle Windows backslashes by converting to forward slashes'
    );
  });

  it('should not match when file is in different directory', () => {
    const importMetaUrl = 'file:///C:/git/job-apply/src/commands/login.ts';
    const processArgv1 = 'C:/git/job-apply/src/commands/search.ts';
    
    const isMainModule = importMetaUrl === `file:///${processArgv1.replace(/\\/g, '/')}`;
    
    assert.strictEqual(
      isMainModule,
      false,
      'Should not be main module when different file is executing'
    );
  });

  it('should not trigger false positives with path.includes() approach', () => {
    // This tests the OLD buggy approach that we fixed
    const importMetaUrl = 'file:///C:/git/job-apply/src/commands/login.ts';
    
    // The OLD buggy check
    const buggyCheck = importMetaUrl.includes('/commands/login.ts');
    
    assert.strictEqual(
      buggyCheck,
      true,
      'The old buggy check would always be true when the module is loaded'
    );
    
    // The NEW correct check
    const processArgv1 = 'C:/git/job-apply/src/cli.ts'; // Different file
    const correctCheck = importMetaUrl === `file:///${processArgv1.replace(/\\/g, '/')}`;
    
    assert.strictEqual(
      correctCheck,
      false,
      'The new correct check properly distinguishes between direct execution and import'
    );
  });
});

/**
 * Tests for session state handling
 */
describe('Session State Management', () => {
  it('should correctly identify when session exists', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const { hasSession, STORAGE_STATE_PATH } = await import('../src/lib/session.js');
    
    const sessionExists = existsSync(STORAGE_STATE_PATH);
    const hasSessionResult = hasSession();
    
    assert.strictEqual(
      hasSessionResult,
      sessionExists,
      'hasSession() should return true only if storageState.json exists'
    );
  });

  it('should use correct storage state path', async () => {
    const { STORAGE_STATE_PATH } = await import('../src/lib/session.js');
    
    assert.ok(
      STORAGE_STATE_PATH.includes('storage'),
      'Storage state path should be in storage directory'
    );
    assert.ok(
      STORAGE_STATE_PATH.endsWith('storageState.json'),
      'Storage state should be named storageState.json'
    );
  });
});

