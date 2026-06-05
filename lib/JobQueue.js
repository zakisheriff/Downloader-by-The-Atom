import os from "node:os";
import path from "node:path";
import { rm, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rateLimiter } from "./RateLimiter.js";

const TMP_ROOT = path.join(os.tmpdir(), "fetch-by-the-atom");
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

class JobManager {
  constructor() {
    // Shared state Map, persisted across Next.js HMR in dev.
    if (!global.__activeDownloads) {
      global.__activeDownloads = new Map();
    }
    this.states = global.__activeDownloads;
    this.queue = []; // Array of { id, taskFn, createdAt }
    this.running = new Set(); // Set of active job IDs
    this.concurrencyLimit = 3;

    // Start global GC worker
    this.startCleanupInterval();
    // Start scheduled 12-hour self-restart timer to rotate container IP
    this.startSelfRestartInterval();
    console.log("JobManager: Centralized queue and state manager initialized.");
  }

  enqueue(id, taskFn) {
    if (!id) return;

    // If job is already queued, running, or completed, skip enqueuing again
    if (this.states.has(id)) {
      const existing = this.states.get(id);
      if (existing.status !== "failed" && existing.status !== "queued") {
        console.log(`JobManager: Job ${id} is already in state '${existing.status}'. Skipping enqueue.`);
        return;
      }
    }

    const now = Date.now();
    // Add job to memory tracking Map as queued
    this.states.set(id, {
      status: "queued",
      progress: 0,
      createdAt: now
    });

    console.log(`JobManager: Enqueuing job ${id}`);
    this.queue.push({ id, taskFn, createdAt: now });
    this.processQueue();
  }

  processQueue() {
    while (this.running.size < this.concurrencyLimit && this.queue.length > 0) {
      const { id, taskFn } = this.queue.shift();
      this.running.add(id);
      console.log(`JobManager: Starting job ${id}. (Running: ${this.running.size}/${this.concurrencyLimit}, Queue: ${this.queue.length})`);

      // Run the task asynchronously
      taskFn()
        .then(() => {
          console.log(`JobManager: Job ${id} process executed successfully.`);
        })
        .catch((err) => {
          console.error(`JobManager: Job ${id} execution error:`, err);
          // Set error state if not already handled
          const current = this.states.get(id);
          if (!current || current.status !== "failed") {
            this.states.set(id, {
              status: "failed",
              error: err.message || "Download process failed",
              progress: 0,
              createdAt: current?.createdAt || Date.now()
            });
          }
        })
        .finally(() => {
          this.running.delete(id);
          this.processQueue();
          if (global.__needsSelfRestart && this.running.size === 0) {
            console.log("JobManager: Process restart deferred until active downloads completed. Restarting now...");
            process.exit(1);
          }
        });
    }
  }

  getJob(id) {
    if (!id) return null;
    const state = this.states.get(id);
    if (!state) return null;

    if (state.status === "queued") {
      const idx = this.queue.findIndex((item) => item.id === id);
      return {
        status: "queued",
        position: idx !== -1 ? idx + 1 : 1,
        progress: 0
      };
    }

    return state;
  }

  startCleanupInterval() {
    // Avoid setting multiple intervals in dev HMR reloads
    if (global.__jobManagerInterval) {
      clearInterval(global.__jobManagerInterval);
    }

    global.__jobManagerInterval = setInterval(async () => {
      console.log("JobManager: Running aggressive garbage collection worker...");
      const now = Date.now();

      // Prune rate limiter in-memory map
      try {
        rateLimiter.prune();
      } catch (err) {
        console.error("JobManager GC: Error pruning rate limiter:", err.message);
      }

      // 1. Clean up in-memory stale jobs
      for (const [id, job] of this.states.entries()) {
        const jobTime = job.createdAt || now;
        const age = now - jobTime;

        // If the job is older than 30 minutes, or is in failed/completed/queued state for >30 mins
        if (age > MAX_AGE_MS) {
          // If it's active in the running set, let's remove it from running
          if (this.running.has(id)) {
            console.warn(`JobManager GC: Job ${id} has been active for >30 minutes. Marking as failed.`);
            this.running.delete(id);
          }

          console.log(`JobManager GC: Purging stale job state for ${id} (Status: ${job.status}, Age: ${Math.round(age / 60000)} mins)`);
          
          if (job.cleanup) {
            try {
              await job.cleanup();
            } catch (e) {
              console.error(`JobManager GC: Cleanup call failed for job ${id}:`, e.message);
            }
          }
          
          this.states.delete(id);
          
          // Remove from queue if it was queued
          this.queue = this.queue.filter((item) => item.id !== id);
        }
      }

      // 2. Scan and delete stale disk folders/files in the tmp sandbox directory
      if (existsSync(TMP_ROOT)) {
        try {
          const entries = await readdir(TMP_ROOT, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(TMP_ROOT, entry.name);
            try {
              const stats = await stat(entryPath);
              const age = now - stats.mtimeMs;

              if (age > MAX_AGE_MS) {
                if (entry.isDirectory()) {
                  console.log(`JobManager GC: Deleting stale folder ${entryPath} (Age: ${Math.round(age / 60000)} mins)`);
                  await rm(entryPath, { recursive: true, force: true });
                } else if (entry.isFile()) {
                  const ext = path.extname(entry.name).toLowerCase();
                  if (ext === ".mp4" || ext === ".mp3" || ext === ".part" || ext === ".m4a" || ext === ".webm") {
                    console.log(`JobManager GC: Deleting stale file ${entryPath} (Age: ${Math.round(age / 60000)} mins)`);
                    await rm(entryPath, { force: true });
                  }
                }
              }
            } catch (err) {
              console.error(`JobManager GC: Error inspecting entry ${entryPath}:`, err.message);
            }
          }
        } catch (err) {
          console.error("JobManager GC: Error reading tmp sandbox root:", err.message);
        }
      }

      // Re-process queue in case slots opened up
      this.processQueue();

      if (global.__needsSelfRestart && this.running.size === 0) {
        if (process.uptime() < 300) {
          console.log("JobManager GC: Deferred restart is pending, but server uptime is less than 5 minutes. Skipping to prevent startup crash loop.");
        } else {
          console.log("JobManager GC: Deferred restart triggered as server has become idle.");
          process.exit(1);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Make the timer unref so it doesn't block Node process exit (useful in tests/dev)
    if (global.__jobManagerInterval.unref) {
      global.__jobManagerInterval.unref();
    }
  }

  startSelfRestartInterval() {
    if (global.__selfRestartInterval) {
      clearInterval(global.__selfRestartInterval);
    }

    // Defer check to every 30 minutes, checking if 12 hours have elapsed
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const startTime = global.__selfRestartStartTime || Date.now();
    global.__selfRestartStartTime = startTime;

    global.__selfRestartInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TWELVE_HOURS_MS) {
        console.log("JobManager: Check for scheduled 12-hour self-restart...");
        
        // Ensure no active downloads are running
        if (this.running.size > 0) {
          console.log(`JobManager: Deferring scheduled self-restart because there are ${this.running.size} active downloads running.`);
          return;
        }

        console.log("JobManager: Server is idle. Exiting process to rotate container IP...");
        process.exit(1);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes to avoid polling overhead

    if (global.__selfRestartInterval.unref) {
      global.__selfRestartInterval.unref();
    }
  }

  registerCanaryChecker(checkerFn) {
    this.canaryChecker = checkerFn;
    this.startCanaryInterval();
  }

  startCanaryInterval() {
    if (global.__canaryInterval) {
      clearInterval(global.__canaryInterval);
    }

    // Proactive canary check runs every 30 minutes
    global.__canaryInterval = setInterval(async () => {
      if (this.canaryChecker && this.running.size === 0) {
        console.log("JobManager: Running proactive YouTube canary check...");
        try {
          await this.canaryChecker();
        } catch (e) {
          console.error("JobManager: Canary check error:", e.message);
        }
      }
    }, 30 * 60 * 1000);

    if (global.__canaryInterval.unref) {
      global.__canaryInterval.unref();
    }

    // Run startup canary check 30 seconds after server boot (or file load)
    if (!global.__startupCanaryChecked) {
      setTimeout(async () => {
        if (this.canaryChecker && this.running.size === 0) {
          console.log("JobManager: Running startup proactive YouTube canary check...");
          try {
            await this.canaryChecker();
            global.__startupCanaryChecked = true;
          } catch (e) {
            console.error("JobManager: Startup canary check error:", e.message);
          }
        }
      }, 30 * 1000);
    }
  }
}

// Export singleton instance
if (!global.__jobManagerInstance) {
  global.__jobManagerInstance = new JobManager();
}
export const jobManager = global.__jobManagerInstance;
