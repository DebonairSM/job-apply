import { SearchOptions } from '../commands/search.js';
import { SearchResult, SearchDependencies } from './types.js';

export async function searchJobs(
  options: SearchOptions,
  deps: SearchDependencies
): Promise<SearchResult> {
  const { browser, page, context, processPage, shouldStop, buildSearchUrl } = deps;
  
  const errors: string[] = [];
  let totalAnalyzed = 0;
  let totalQueued = 0;
  let pagesProcessed = 0;
  
  const startPage = options.startPage ?? 1;
  const maxPages = options.maxPages ?? 999;

  try {
    // Navigate to first page
    const searchUrl = buildSearchUrl(options, startPage);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    let currentPage = startPage;

    // Process pages in a loop
    while (currentPage <= maxPages && !shouldStop()) {
      console.log(`\n📄 Processing page ${currentPage}/${maxPages >= 999 ? 'all' : maxPages}...`);
      
      try {
        const pageResult = await processPage(currentPage, options);
        totalAnalyzed += pageResult.analyzed;
        totalQueued += pageResult.queued;
        pagesProcessed = currentPage;

        console.log(`\n📊 Page ${currentPage} Summary:`);
        console.log(`   Analyzed: ${pageResult.analyzed}`);
        console.log(`   Queued: ${pageResult.queued}`);
        console.log(`   Success Rate: ${pageResult.analyzed > 0 ? Math.round((pageResult.queued / pageResult.analyzed) * 100) : 0}%`);
      } catch (error) {
        const errorMsg = `Error processing page ${currentPage}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Check if we should stop
      if (shouldStop()) {
        console.log('\n⚠️  Stopping gracefully...');
        break;
      }

      // Check if there's a next page
      if (currentPage < maxPages) {
        const nextButton = page.locator('.jobs-search-pagination__button--next');
        const nextButtonExists = await nextButton.count() > 0;
        
        if (nextButtonExists) {
          console.log(`\n➡️  Navigating to page ${currentPage + 1}...`);
          try {
            await nextButton.click({ timeout: 5000 });
            await page.waitForTimeout(3000); // Wait for page to load
            currentPage++;
          } catch (error) {
            console.log(`   ⚠️  Could not navigate to next page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            break;
          }
        } else {
          console.log(`\n🏁 No more pages available (reached end of results)`);
          break;
        }
      } else {
        break;
      }
    }
  } catch (error) {
    const errorMsg = `Fatal error in search: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return {
    analyzed: totalAnalyzed,
    queued: totalQueued,
    pagesProcessed,
    errors
  };
}

