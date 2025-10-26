import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Simulate the CLI parsing
const argv = yargs(hideBin(process.argv))
  .command(
    'apply',
    'Apply to queued jobs',
    (yargs) => {
      return yargs
        .option('easy', {
          alias: 'e',
          describe: 'Only Easy Apply jobs',
          type: 'boolean',
          default: false
        })
        .option('ext', {
          alias: 'x',
          describe: 'Only external ATS jobs',
          type: 'boolean',
          default: false
        })
        .option('job', {
          alias: 'j',
          describe: 'Apply to specific job ID',
          type: 'string'
        })
        .option('dry-run', {
          alias: 'n',
          describe: 'Dry run (don\'t actually submit)',
          type: 'boolean',
          default: false
        });
    },
    (argv) => {
      console.log('Parsed arguments:');
      console.log('  easy:', argv.easy);
      console.log('  ext:', argv.ext);
      console.log('  job:', argv.job);
      console.log('  dry-run:', argv['dry-run']);
      console.log('\nApplyOptions object would be:');
      console.log({
        easy: argv.easy,
        external: argv.ext,
        jobId: argv.job,
        dryRun: argv['dry-run']
      });
    }
  )
  .parseSync();

