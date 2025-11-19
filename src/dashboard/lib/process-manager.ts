/**
 * Process Manager
 * 
 * Tracks and manages all child processes spawned by the dashboard API.
 * Ensures graceful shutdown and prevents orphaned processes.
 */

import { ChildProcess } from 'child_process';
import { spawn } from 'child_process';

interface TrackedProcess {
  pid: number;
  type: 'automation' | 'lead-scraping';
  description: string;
  child?: ChildProcess; // Only for non-detached processes
  detached: boolean;
  createdAt: Date;
}

class ProcessManager {
  private processes: Map<number, TrackedProcess> = new Map();
  private shutdownInProgress = false;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  /**
   * Register a child process for tracking
   */
  register(
    child: ChildProcess | number,
    type: 'automation' | 'lead-scraping',
    description: string,
    detached: boolean = false
  ): number {
    if (this.shutdownInProgress) {
      throw new Error('Cannot register process during shutdown');
    }

    const pid = typeof child === 'number' ? child : (child.pid || 0);
    
    if (!pid) {
      throw new Error('Process has no PID');
    }

    const tracked: TrackedProcess = {
      pid,
      type,
      description,
      child: typeof child === 'object' ? child : undefined,
      detached,
      createdAt: new Date()
    };

    this.processes.set(pid, tracked);
    console.log(`📝 Registered process ${pid} (${type}): ${description}`);

    // For non-detached processes, track exit
    if (!detached && typeof child === 'object') {
      child.on('exit', () => {
        this.unregister(pid);
      });
    }

    return pid;
  }

  /**
   * Unregister a process (called when it exits)
   */
  unregister(pid: number): void {
    if (this.processes.has(pid)) {
      const tracked = this.processes.get(pid)!;
      console.log(`✅ Process ${pid} (${tracked.type}) exited: ${tracked.description}`);
      this.processes.delete(pid);
    }
  }

  /**
   * Get all tracked processes
   */
  getAll(): TrackedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get processes by type
   */
  getByType(type: 'automation' | 'lead-scraping'): TrackedProcess[] {
    return this.getAll().filter(p => p.type === type);
  }

  /**
   * Check if a process is still running
   */
  isRunning(pid: number): boolean {
    try {
      if (process.platform === 'win32') {
        // On Windows, signal 0 doesn't work reliably
        // We'll use a different approach - try to kill with signal 0
        // If it throws, the process doesn't exist
        try {
          process.kill(pid, 0);
          return true;
        } catch {
          // Process doesn't exist
          this.unregister(pid);
          return false;
        }
      } else {
        // On Unix, signal 0 checks if process exists
        process.kill(pid, 0);
        return true;
      }
    } catch {
      // Process doesn't exist
      this.unregister(pid);
      return false;
    }
  }

  /**
   * Kill a specific process gracefully
   */
  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    const tracked = this.processes.get(pid);
    if (!tracked) {
      console.warn(`⚠️  Process ${pid} not found in tracker`);
      return false;
    }

    try {
      if (tracked.child && !tracked.detached) {
        // Non-detached process - can kill directly
        if (force) {
          tracked.child.kill('SIGKILL');
        } else {
          tracked.child.kill('SIGTERM');
        }
        return true;
      } else {
        // Detached process - need to use system kill
        if (process.platform === 'win32') {
          spawn('taskkill', force ? ['/F', '/PID', pid.toString()] : ['/PID', pid.toString()], {
            shell: true,
            stdio: 'ignore'
          });
        } else {
          process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
        }
        return true;
      }
    } catch (error) {
      console.error(`❌ Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  /**
   * Gracefully shutdown all tracked processes
   */
  async shutdown(gracePeriodMs: number = 10000): Promise<void> {
    if (this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    const processes = this.getAll();

    if (processes.length === 0) {
      console.log('✅ No processes to shutdown');
      return;
    }

    console.log(`\n🛑 Shutting down ${processes.length} tracked process(es)...`);

    // First, send SIGTERM to all processes
    const killPromises = processes.map(tracked => {
      console.log(`   Sending SIGTERM to PID ${tracked.pid} (${tracked.type}): ${tracked.description}`);
      return this.killProcess(tracked.pid, false);
    });

    await Promise.all(killPromises);

    // Wait for graceful shutdown
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    return new Promise((resolve) => {
      const checkRemaining = () => {
        const remaining = this.getAll();
        
        if (remaining.length === 0) {
          console.log('✅ All processes shut down gracefully');
          resolve();
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= gracePeriodMs) {
          // Force kill remaining processes
          console.log(`\n⚠️  Grace period expired, force killing ${remaining.length} process(es)...`);
          remaining.forEach(tracked => {
            console.log(`   Force killing PID ${tracked.pid} (${tracked.type}): ${tracked.description}`);
            this.killProcess(tracked.pid, true);
          });
          
          // Give them a moment to die
          setTimeout(() => {
            const stillRemaining = this.getAll();
            if (stillRemaining.length > 0) {
              console.warn(`⚠️  ${stillRemaining.length} process(es) may still be running`);
            }
            resolve();
          }, 2000);
          return;
        }

        // Continue checking
        setTimeout(checkRemaining, checkInterval);
      };

      checkRemaining();
    });
  }

  /**
   * Clean up stale processes (processes that are no longer running)
   */
  cleanupStale(): void {
    const processes = this.getAll();
    let cleaned = 0;

    for (const tracked of processes) {
      if (!this.isRunning(tracked.pid)) {
        this.unregister(tracked.pid);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale process(es)`);
    }
  }
}

// Singleton instance
export const processManager = new ProcessManager();

// Export for testing
export { ProcessManager };

