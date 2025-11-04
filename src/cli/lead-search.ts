import { chromium } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession } from '../lib/session.js';
import { createScrapingRun, updateScrapingRun, getScrapingRun } from '../lib/db.js';
import { scrapeConnections } from '../services/lead-scraper.js';
import { shouldStop as checkStopSignal, clearStopSignal } from '../lib/stop-signal.js';
import { getLeadProfile, getLeadProfileKeys } from '../ai/lead-profiles.js';

export interface LeadSearchOptions {
  titles?: string;
  profile?: string;
  max?: number;
  resume?: number;
  startPage?: number;
}

export async function leadSearchCommand(opts: LeadSearchOptions): Promise<void> {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const config = loadConfig();
  const maxProfiles = opts.max || 50;
  
  // Determine filter titles: use profile if specified, otherwise parse titles option
  let filterTitles: string[] | undefined;
  
  if (opts.profile) {
    const profile = getLeadProfile(opts.profile);
    if (!profile) {
      console.error(`❌ Unknown profile: ${opts.profile}`);
      console.error(`   Available profiles: ${getLeadProfileKeys().join(', ')}`);
      process.exit(1);
    }
    filterTitles = profile.titles;
    console.log('🔍 Starting LinkedIn lead scraper...');
    console.log(`   Profile: ${profile.name}`);
    console.log(`   Description: ${profile.description}`);
    console.log(`   Title Filters (${profile.titles.length}): ${profile.titles.slice(0, 5).join(', ')}${profile.titles.length > 5 ? '...' : ''}`);
  } else if (opts.titles) {
    filterTitles = opts.titles.split(',').map(t => t.trim());
    console.log('🔍 Starting LinkedIn lead scraper...');
    console.log(`   Title Filters: ${filterTitles.join(', ')}`);
  } else {
    console.log('🔍 Starting LinkedIn lead scraper...');
    console.log('   Title Filters: None (all connections)');
  }
  
  const startTime = Date.now();
  console.log(`   Max Profiles: ${maxProfiles}`);
  
  if (opts.resume) {
    console.log(`   Resume Run ID: ${opts.resume}`);
    const existingRun = getScrapingRun(opts.resume);
    if (!existingRun) {
      console.error(`❌ Run ID ${opts.resume} not found`);
      process.exit(1);
    }
    if (existingRun.status === 'completed') {
      console.error(`❌ Run ID ${opts.resume} is already completed`);
      process.exit(1);
    }
    console.log(`   Resuming from: ${existingRun.profiles_scraped} profiles scraped`);
  }
  
  console.log();

  // Clear any existing stop signal
  clearStopSignal();
  
  // Flag for graceful shutdown
  let shouldStop = false;

  // Check function that combines flag and file-based signal
  const shouldStopNow = () => {
    if (!shouldStop && checkStopSignal()) {
      console.log('\n⚠️  Stop signal detected, finishing current profile...');
      shouldStop = true;
    }
    return shouldStop;
  };

  // Setup graceful shutdown handler
  const shutdownHandler = () => {
    if (!shouldStop) {
      console.log('\n⚠️  Stop requested, finishing current profile...');
      shouldStop = true;
    }
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: [
      '--disable-extensions',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  try {
    // Create or resume scraping run
    let runId: number;
    
    if (opts.resume) {
      runId = opts.resume;
      console.log(`📝 Resuming scraping run #${runId}...\n`);
      
      // Update status to in_progress if it was stopped
      updateScrapingRun(runId, {
        status: 'in_progress'
      });
    } else {
      runId = createScrapingRun({
        status: 'in_progress',
        profiles_scraped: 0,
        profiles_added: 0,
        filter_titles: filterTitles ? JSON.stringify(filterTitles) : undefined,
        max_profiles: maxProfiles
      });
      console.log(`📝 Created scraping run #${runId}\n`);
    }

    // Run the scraper
    const progress = await scrapeConnections(page, runId, {
      filterTitles,
      maxProfiles,
      resumeRunId: opts.resume,
      startPage: opts.startPage
    }, shouldStopNow);

    // Mark run as completed or stopped
    const finalStatus = shouldStop ? 'stopped' : 'completed';
    updateScrapingRun(runId, {
      status: finalStatus,
      completed_at: new Date().toISOString(),
      profiles_scraped: progress.profilesScraped,
      profiles_added: progress.profilesAdded,
      last_profile_url: progress.lastProfileUrl
    });

    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);

    console.log('\n📊 Final Summary:');
    console.log(`   Run ID: #${runId}`);
    console.log(`   Status: ${finalStatus}`);
    console.log(`   Total Profiles Processed: ${progress.profilesScraped}`);
    console.log(`   New Leads Added: ${progress.profilesAdded}`);
    console.log(`   Processing Time: ${totalTime}s`);
    
    if (shouldStop) {
      console.log('\n✅ Scraping stopped gracefully.');
      console.log(`   Resume with: npm run leads:search -- --resume ${runId}\n`);
    } else {
      console.log('\n✅ Scraping complete!\n');
    }

  } catch (error) {
    const err = error as Error;
    console.error(`\n❌ Error during scraping: ${err.message}`);
    console.error(err.stack);
  } finally {
    await browser.close();
    
    // Clean up signal handlers
    process.removeListener('SIGTERM', shutdownHandler);
    process.removeListener('SIGINT', shutdownHandler);
  }

  process.exit(0);
}

