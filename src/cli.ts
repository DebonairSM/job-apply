#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loginCommand } from './commands/login.js';
import { searchCommand, SearchOptions } from './commands/search.js';
import { applyCommand } from './commands/apply.js';
import { getJobsByStatus, getJobStats, clearAnswersCache, clearLabelMappings, clearAllCaches, getJobById } from './lib/db.js';
import { rankJob } from './ai/ranker.js';
import { loadConfig } from './lib/session.js';

yargs(hideBin(process.argv))
  .scriptName('li')
  .usage('$0 <command> [options]')
  .command(
    'login',
    'Log in to LinkedIn and save session',
    {},
    async () => {
      await loginCommand();
    }
  )
  .command(
    'search [keywords]',
    'Search for jobs and rank them',
    (yargs) => {
      return yargs
        .positional('keywords', {
          describe: 'Job search keywords (required if no --profile)',
          type: 'string'
        })
        .option('profile', {
          alias: 'p',
          describe: 'Use predefined Boolean search profile',
          choices: ['core', 'security', 'event-driven', 'performance', 'devops', 'backend'] as const,
          type: 'string'
        })
        .option('location', {
          alias: 'l',
          describe: 'Job location',
          type: 'string'
        })
        .option('remote', {
          alias: 'r',
          describe: 'Remote jobs only (ignored if using --profile)',
          type: 'boolean',
          default: false
        })
        .option('date', {
          alias: 'd',
          describe: 'Date posted filter',
          choices: ['day', 'week', 'month'] as const,
          type: 'string',
          default: 'day'
        })
        .option('min-score', {
          alias: 'm',
          describe: 'Minimum fit score (0-100)',
          type: 'number'
        })
        .option('max-pages', {
          alias: 'pages',
          describe: 'Maximum number of pages to process (default: all pages)',
          type: 'number',
          default: 999
        })
        .check((argv) => {
          if (!argv.keywords && !argv.profile) {
            throw new Error('Either keywords or --profile must be specified');
          }
          return true;
        });
    },
    async (argv) => {
      await searchCommand({
        keywords: argv.keywords,
        profile: argv.profile as 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | undefined,
        location: argv.location,
        remote: argv.remote,
        datePosted: argv.date as 'day' | 'week' | 'month' | undefined,
        minScore: argv['min-score'],
        maxPages: argv['max-pages']
      });
    }
  )
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
    async (argv) => {
      await applyCommand({
        easy: argv.easy,
        external: argv.ext,
        jobId: argv.job,
        dryRun: argv['dry-run']
      });
    }
  )
  .command(
    'status',
    'Show job application statistics',
    {},
    async () => {
      const stats = getJobStats();
      
      console.log('\n📊 Job Application Status\n');
      console.log(`   Queued:     ${stats.queued}`);
      console.log(`   Reported:   ${stats.reported}`);
      console.log(`   Applied:    ${stats.applied}`);
      console.log(`   Interview:  ${stats.interview}`);
      console.log(`   Rejected:   ${stats.rejected}`);
      console.log(`   Skipped:    ${stats.skipped}`);
      console.log(`   ─────────────────────`);
      console.log(`   Total:      ${stats.total}\n`);
    }
  )
  .command(
    'list [status]',
    'List jobs by status',
    (yargs) => {
      return yargs.positional('status', {
        describe: 'Filter by status',
        choices: ['queued', 'reported', 'applied', 'interview', 'rejected', 'skipped'],
        type: 'string'
      });
    },
    async (argv) => {
      const jobs = getJobsByStatus(argv.status);
      
      if (jobs.length === 0) {
        console.log(`\n✅ No jobs with status: ${argv.status || 'all'}\n`);
        return;
      }

      console.log(`\n📋 Jobs (${argv.status || 'all'}): ${jobs.length}\n`);
      
      for (const job of jobs) {
        console.log(`🔹 ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Type: ${job.easy_apply ? 'Easy Apply' : 'External'}`);
        console.log(`   Rank: ${job.rank}/100`);
        
        if (job.category_scores) {
          try {
            const scores = JSON.parse(job.category_scores);
            console.log(`   Azure: ${scores.coreAzure} | Security: ${scores.security} | Events: ${scores.eventDriven}`);
            console.log(`   Perf: ${scores.performance} | DevOps: ${scores.devops} | Senior: ${scores.seniority}`);
          } catch (error) {
            // Ignore parse errors
          }
        }
        
        console.log(`   Status: ${job.status}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   URL: ${job.url}`);
        
        if (job.fit_reasons) {
          try {
            const reasons = JSON.parse(job.fit_reasons);
            if (reasons.length > 0) {
              console.log(`   Reasons: ${reasons.slice(0, 2).join('; ')}`);
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
        
        if (job.blockers) {
          try {
            const blockers = JSON.parse(job.blockers);
            if (blockers.length > 0) {
              console.log(`   ⚠️  Blockers: ${blockers.join(', ')}`);
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
        
        console.log('');
      }
    }
  )
  .command(
    'rank',
    'Re-rank a specific job',
    (yargs) => {
      return yargs.option('job', {
        alias: 'j',
        describe: 'Job ID to re-rank',
        type: 'string',
        demandOption: true
      });
    },
    async (argv) => {
      const job = getJobById(argv.job);
      
      if (!job) {
        console.error(`❌ Job not found: ${argv.job}`);
        process.exit(1);
      }

      console.log(`\n🔄 Re-ranking: ${job.title}\n`);

      const config = loadConfig();
      
      // For re-ranking, we'd need the full description which we don't store
      // This is a limitation - in practice, you'd need to fetch it again
      console.log('⚠️  Re-ranking requires fetching job description again');
      console.log('   This feature would require navigating to the job URL');
      console.log(`   Job URL: ${job.url}\n`);
    }
  )
  .command(
    'clear-cache [type]',
    'Clear cached data',
    (yargs) => {
      return yargs.positional('type', {
        describe: 'Type of cache to clear',
        choices: ['answers', 'mapping', 'all'],
        default: 'all',
        type: 'string'
      });
    },
    async (argv) => {
      const type = argv.type || 'all';
      
      if (type === 'answers') {
        clearAnswersCache();
        console.log('✅ Cleared answers cache');
      } else if (type === 'mapping') {
        clearLabelMappings();
        console.log('✅ Cleared label mapping cache');
      } else {
        clearAllCaches();
        console.log('✅ Cleared all caches');
      }
    }
  )
  .command(
    'test',
    'Run mapper evaluation tests',
    {},
    async () => {
      console.log('⚠️  Test suite not yet implemented');
      console.log('   Run: npm test (once tests/mapper.test.ts is created)\n');
    }
  )
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .strict()
  .parse();


