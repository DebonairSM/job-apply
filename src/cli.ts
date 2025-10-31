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
          choices: ['core', 'backend', 'core-net', 'legacy-modernization', 'contract', 'aspnet-simple', 'csharp-azure-no-frontend', 'az204-csharp', 'ai-enhanced-net'] as const,
          type: 'string'
        })
        .option('location', {
          alias: 'l',
          describe: 'Job location',
          type: 'string'
        })
        .option('location-preset', {
          describe: 'Preset location identifier (e.g., wesley-chapel)',
          type: 'string'
        })
        .option('radius', {
          describe: 'Desired radius in miles (used only if UI slider exists)',
          type: 'number'
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
        .option('start-page', {
          alias: 'start',
          describe: 'Page number to start from (default: 1)',
          type: 'number',
          default: 1
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
        profile: argv.profile as 'core' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract' | 'aspnet-simple' | 'csharp-azure-no-frontend' | 'az204-csharp' | 'ai-enhanced-net' | undefined,
        location: argv.location,
        locationPreset: argv['location-preset'] as any,
        radius: argv.radius as number | undefined,
        remote: argv.remote,
        datePosted: argv.date as 'day' | 'week' | 'month' | undefined,
        minScore: argv['min-score'],
        maxPages: argv['max-pages'],
        startPage: argv['start-page']
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
          type: 'boolean'
        })
        .option('ext', {
          alias: 'x',
          describe: 'Only external ATS jobs',
          type: 'boolean'
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
            console.log(`   Azure: ${scores.coreAzure} | Senior: ${scores.seniority} | .NET: ${scores.coreNet}`);
            console.log(`   Frontend: ${scores.frontendFrameworks} | Legacy: ${scores.legacyModernization}`);
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
  .command(
    'migrate',
    'Migrate .env data and resumes to database',
    {},
    async () => {
      console.log('\n🔄 Starting migration to database...\n');
      console.log('This will:');
      console.log('  1. Extract user profile from .env');
      console.log('  2. Parse all resume files');
      console.log('  3. Populate database tables');
      console.log('  4. Create new simplified .env\n');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout, stderr } = await execAsync('node scripts/migrate-to-database.js');
        console.log(stdout);
        if (stderr) console.error(stderr);
      } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
      }
    }
  )
  .command(
    'setup',
    'Initial setup wizard',
    {},
    async () => {
      console.log('\n👋 Welcome to Job Application Automation Setup!\n');
      console.log('This wizard will help you configure your profile.\n');
      
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(prompt, resolve);
        });
      };
      
      try {
        const { saveUserProfile, saveApplicationPreference, getUserProfile } = await import('./lib/db.js');
        
        // Check if profile already exists
        const existing = getUserProfile();
        if (existing) {
          const overwrite = await question('Profile already exists. Overwrite? (y/N): ');
          if (overwrite.toLowerCase() !== 'y') {
            console.log('\n✅ Setup cancelled. Use dashboard to edit profile.\n');
            rl.close();
            return;
          }
        }
        
        console.log('📋 Please provide your information:\n');
        
        const fullName = await question('Full Name: ');
        const email = await question('Email: ');
        const phone = await question('Phone (optional): ');
        const city = await question('City (optional): ');
        const linkedinProfile = await question('LinkedIn URL (optional): ');
        const workAuthorization = await question('Work Authorization (e.g., Citizen, Green Card): ');
        const requiresSponsorship = await question('Requires Sponsorship? (Yes/No): ');
        const profileSummary = await question('Profile Summary (optional): ');
        
        console.log('\n⚙️  Application Preferences:\n');
        
        const minFitScore = await question('Minimum Fit Score (0-100, default 70): ');
        const yearsDotnet = await question('Years of .NET experience (optional): ');
        const yearsAzure = await question('Years of Azure experience (optional): ');
        
        // Split name
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Save profile
        saveUserProfile({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || undefined,
          city: city || undefined,
          linkedin_profile: linkedinProfile || undefined,
          work_authorization: workAuthorization || 'Citizen',
          requires_sponsorship: requiresSponsorship || 'No',
          profile_summary: profileSummary || undefined
        });
        
        // Save preferences
        if (minFitScore) {
          saveApplicationPreference({
            key: 'MIN_FIT_SCORE',
            value: minFitScore,
            description: 'Minimum job fit score threshold'
          });
        }
        
        if (yearsDotnet) {
          saveApplicationPreference({
            key: 'YEARS_DOTNET',
            value: yearsDotnet,
            description: 'Years of .NET experience'
          });
        }
        
        if (yearsAzure) {
          saveApplicationPreference({
            key: 'YEARS_AZURE',
            value: yearsAzure,
            description: 'Years of Azure experience'
          });
        }
        
        console.log('\n✅ Profile saved successfully!\n');
        console.log('📋 Next steps:');
        console.log('   1. Add resumes to resumes/ folder');
        console.log('   2. Run: npm run cli -- migrate (to parse resumes)');
        console.log('   3. Start dashboard: npm run dev:dashboard');
        console.log('   4. Add/edit skills in dashboard Settings page\n');
        
      } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);
      } finally {
        rl.close();
      }
    }
  )
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .strict()
  .parse();


