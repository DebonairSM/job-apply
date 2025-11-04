# LinkedIn Contact Modal Navigation Fix

## Issue

After extracting email addresses from LinkedIn profiles, the scraper was getting stuck on the contact info modal overlay (`/overlay/contact-info/`). This prevented subsequent profiles from being processed, resulting in "profile URL not found" errors for all remaining profiles on the page.

### Observed Behavior

```
Processing profile 2/10...
✅ Added: Jason Zurn
   Email: jasonzurn@gmail.com

Processing profile 3/10...
⚠️  Skipping profile 3: profile URL not found
⚠️  Skipping profile 4: profile URL not found
⚠️  Skipping profile 5: profile URL not found
...
```

The scraper successfully extracted Jason Zurn's email but failed to close the contact info modal. When it tried to navigate back to search results, it remained on the overlay URL, causing all subsequent profile lookups to fail.

## Root Cause

The original modal closing logic used only `page.keyboard.press('Escape')`, which is not reliable:

```typescript
// Close the modal
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
```

This single method approach failed when:
- The modal didn't respond to keyboard events
- LinkedIn's JavaScript intercepted the Escape key
- Focus was not on the modal element
- The modal was still animating

## Solution

Implemented a three-tier fallback approach for closing modals:

### 1. Enhanced Modal Closing Logic

```typescript
// Method 1: Click the X button
const closeButtonSelectors = [
  'button[aria-label*="Dismiss"], button[aria-label*="Close"]',
  'button.artdeco-modal__dismiss',
  'button[data-test-modal-close-btn]'
];

let modalClosed = false;
for (const selector of closeButtonSelectors) {
  const closeBtn = page.locator(selector).first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click({ timeout: 1000 });
    await page.waitForTimeout(500);
    modalClosed = true;
    break;
  }
}

// Method 2: Press Escape if close button didn't work
if (!modalClosed) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

// Method 3: If still on overlay URL, navigate back to profile
const currentUrl = page.url();
if (currentUrl.includes('/overlay/contact-info/')) {
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}
```

### 2. Error Handling with Overlay Detection

```typescript
catch (error) {
  // Email extraction is optional, but ensure we're not stuck on overlay
  try {
    const currentUrl = page.url();
    if (currentUrl.includes('/overlay/')) {
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }
  } catch (navError) {
    // Continue without email if navigation fails
  }
}
```

### 3. Search Results Page Verification

Added verification after navigating back to ensure the scraper is actually on the search results page:

```typescript
// Navigate back to search results
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// Verify we're back on search results page (not stuck on profile or overlay)
const currentUrl = page.url();
if (!currentUrl.includes('/search/results/people/')) {
  // If not on search page, try going back one more time
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
}
```

## Changes Made

### File: `src/services/lead-scraper.ts`

1. **Lines 368-420**: Enhanced email extraction modal closing logic
   - Try clicking close button with multiple selectors
   - Fallback to Escape key
   - Verify URL and navigate back if still on overlay
   - Error handling to prevent stuck state

2. **Lines 311-316**: Added search page verification after skipping filtered profiles
   - Ensures navigation back succeeded
   - Retries if not on search results page

3. **Lines 544-550**: Added search page verification after processing profiles
   - Ensures navigation back succeeded
   - Retries if not on search results page

## Testing

To test this fix:

1. Run a lead scraping session with profiles that have email addresses:
   ```bash
   npm run cli leads scrape -- --max-profiles 20
   ```

2. Monitor the output for successful email extraction without subsequent "profile URL not found" errors

3. Check that the success rate is consistent across all profiles on each page

## Expected Results

- Modal closes reliably after email extraction
- Scraper successfully processes all profiles on each page
- No "profile URL not found" errors after email extraction
- Success rate matches profile relevance (not artificially low due to navigation issues)

## Related Issues

- LinkedIn modal overlays can appear for various features (contact info, certifications, etc.)
- This pattern can be applied to other modal interactions in the scraper
- Similar verification checks may be needed for other navigation patterns

