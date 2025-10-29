import { ApplyOptions } from '../commands/apply.js';
import { ApplyResult, ApplyDependencies, Job } from './types.js';

export async function applyToJob(
  options: ApplyOptions,
  deps: ApplyDependencies
): Promise<ApplyResult> {
  const { browser, page, context, processJob, shouldStop, jobs } = deps;
  
  const errors: string[] = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const job of jobs) {
      // Check if we should stop before starting to process each job
      if (shouldStop()) {
        console.log(`\n⚠️  Stopping before processing ${job.title} at ${job.company}.\n`);
        break;
      }

      console.log(`\n📝 ${job.title} at ${job.company}`);
      console.log(`   Type: ${job.easy_apply ? 'Easy Apply' : 'External'}`);
      console.log(`   Rank: ${job.rank}/100`);

      try {
        const result = await processJob(job);
        
        if (result === 'applied') {
          applied++;
        } else if (result === 'skipped') {
          skipped++;
        } else if (result === 'failed') {
          failed++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
        
        const errorMsg = `Error processing job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Fatal error in apply: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return {
    applied,
    skipped,
    failed,
    errors
  };
}

