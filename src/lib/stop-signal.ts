import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Create a stop signal file that child processes can check
const STOP_SIGNAL_FILE = join(tmpdir(), 'job-apply-stop-signal');

export function createStopSignal(): void {
  try {
    writeFileSync(STOP_SIGNAL_FILE, Date.now().toString());
  } catch (error) {
    console.error('Failed to create stop signal file:', error);
  }
}

export function clearStopSignal(): void {
  try {
    if (existsSync(STOP_SIGNAL_FILE)) {
      unlinkSync(STOP_SIGNAL_FILE);
    }
  } catch (error) {
    // File doesn't exist or couldn't be deleted
  }
}

export function shouldStop(): boolean {
  return existsSync(STOP_SIGNAL_FILE);
}

