/**
 * LinkedIn Message Sender Service
 * 
 * Sends LinkedIn messages to network contacts using Playwright automation.
 * Handles navigation, message composer interaction, and sending.
 */

import { Page } from 'playwright';
import crypto from 'crypto';
import { NetworkContact } from '../lib/db.js';
import { renderMessageTemplate } from './message-template-renderer.js';
import { randomDelay } from '../lib/resilience.js';

export interface SendMessageResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Verify we're messaging the correct person by checking URL parameters
 * This prevents sending messages to the wrong recipients
 */
async function verifyRecipient(page: Page, expectedUsername: string, expectedName: string): Promise<boolean> {
  const currentUrl = page.url();
  
  // Check if URL contains the correct username in thread or compose context
  if (currentUrl.includes(expectedUsername) && 
      (currentUrl.includes('/messaging/thread/') || currentUrl.includes('/messaging/compose'))) {
    console.log(`   ✅ Recipient verified: URL contains "${expectedUsername}"`);
    return true;
  }
  
  // Check recipient parameter in compose URL
  if (currentUrl.includes(`recipient=${expectedUsername}`)) {
    console.log(`   ✅ Recipient verified: compose URL has correct recipient parameter`);
    return true;
  }
  
  console.log(`   ⚠️  Could not verify recipient "${expectedName}" (${expectedUsername}) from URL: ${currentUrl}`);
  return false;
}

/**
 * Detect and dismiss any blocking modals (premium upsells, feature announcements, etc.)
 * IMPORTANT: Does NOT dismiss message composer modals
 * Returns true if a modal was found and closed, false otherwise
 */
async function dismissBlockingModals(page: Page): Promise<boolean> {
  try {
    console.log(`   🔍 Checking for blocking modals...`);
    
    // First, check if there's a message composer open - if so, don't dismiss anything
    const composerSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div.msg-form__contenteditable',
      '.msg-form__contenteditable',
    ];
    
    for (const composerSelector of composerSelectors) {
      const composer = page.locator(composerSelector).first();
      const composerExists = await composer.count().catch(() => 0);
      if (composerExists > 0) {
        const isVisible = await composer.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          console.log(`   ℹ️  Message composer is open - skipping modal dismissal to avoid closing it`);
          return false;
        }
      }
    }
    
    // Look for specific blocking modals (premium upsells, feature announcements)
    // Be very selective to avoid dismissing the message composer
    const blockingModalSelectors = [
      // Premium upsell modals
      '[data-test-modal-id*="premium"]',
      '[data-test-modal-id*="upsell"]',
      // Feature announcement modals
      '[data-test-modal-id*="announcement"]',
      '[data-test-modal-id*="feature"]',
    ];
    
    let modalsClosed = 0;
    
    for (const modalSelector of blockingModalSelectors) {
      try {
        const modal = page.locator(modalSelector).first();
        const count = await modal.count().catch(() => 0);
        
        if (count > 0) {
          console.log(`      Found blocking modal: ${modalSelector}`);
          
          // Find close button within this specific modal
          const closeButton = modal.locator('button[aria-label*="Dismiss"], button[aria-label*="Close"]').first();
          const closeButtonExists = await closeButton.count().catch(() => 0);
          
          if (closeButtonExists > 0) {
            try {
              await closeButton.click({ timeout: 3000, force: true });
              await page.waitForTimeout(1000);
              modalsClosed++;
              console.log(`      ✅ Closed blocking modal ${modalsClosed}`);
            } catch (clickError) {
              console.log(`      ⚠️  Could not click close button: ${clickError instanceof Error ? clickError.message : String(clickError)}`);
            }
          }
        }
      } catch (e) {
        // Continue to next selector
        continue;
      }
    }
    
    if (modalsClosed > 0) {
      console.log(`   ✅ Closed ${modalsClosed} blocking modal(s)`);
      // Wait a bit for the page to settle after closing modals
      await page.waitForTimeout(1000);
      return true;
    } else {
      console.log(`   ℹ️  No blocking modals found`);
      return false;
    }
  } catch (error) {
    console.log(`   ⚠️  Error while checking for modals: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Send a LinkedIn message to a network contact
 * 
 * @param page - Playwright page instance
 * @param contact - Network contact to message
 * @param messageTemplate - Message template with placeholders
 * @returns Result indicating success or failure
 */
export async function sendLinkedInMessage(
  page: Page,
  contact: NetworkContact,
  messageTemplate: string
): Promise<SendMessageResult> {
  try {
    console.log(`📨 Sending message to ${contact.name}...`);

    // Verify page is still valid before proceeding
    try {
      await page.evaluate(() => true);
    } catch (pageCheckError) {
      const checkErrorMsg = pageCheckError instanceof Error ? pageCheckError.message : String(pageCheckError);
      if (checkErrorMsg.includes('Target page, context or browser has been closed')) {
        console.error(`   ❌ Cannot send to ${contact.name} - page/browser was already closed`);
        return {
          success: false,
          error: 'Page or browser was closed before message could be sent',
        };
      }
      // Continue for other errors
    }

    // Extract username from profile URL for direct navigation
    const profileMatch = contact.profile_url.match(/\/in\/([^\/]+)/);
    if (!profileMatch) {
      return {
        success: false,
        error: `Could not extract username from profile URL: ${contact.profile_url}`,
      };
    }
    const username = profileMatch[1];
    
    // PRIMARY STRATEGY: Use direct compose URL (more reliable than button clicking)
    const composeUrl = `https://www.linkedin.com/messaging/compose/?recipient=${username}`;
    console.log(`   📧 Navigating directly to compose page: ${composeUrl}`);
    
    await page.goto(composeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000); // Give LinkedIn time to load messaging interface
    
    // Check if we successfully reached the messaging page
    const currentUrl = page.url();
    if (!currentUrl.includes('/messaging/')) {
      return {
        success: false,
        error: `Direct navigation to messaging failed. Current URL: ${currentUrl}`,
      };
    }
    console.log(`   ✅ Successfully navigated to messaging page`);

    // Render message template with placeholders
    const renderedMessage = renderMessageTemplate(messageTemplate, contact);

    // Direct compose URL navigation bypasses the need to find and click buttons
    // (Old button-finding logic removed - was unreliable due to LinkedIn UI changes)

    // Wait for message composer to appear
    // LinkedIn's message composer can appear in different ways (modal, sidebar, etc.)
    // Use the same selectors as dry run for consistency
    const composerSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div.msg-form__contenteditable',
      'div[data-placeholder*="message"]',
      'textarea[placeholder*="message" i]',
      '.msg-form__contenteditable',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][data-placeholder*="message" i]',
      '.msg-send-list__composer .msg-form__contenteditable',
      '.msg-compose .msg-form__contenteditable',
    ];

    let composer = null;
    
    // Try finding composer with retries (it might take time to appear)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await page.waitForTimeout(2000);
      }
      
      for (const selector of composerSelectors) {
        try {
          const element = page.locator(selector).first();
          const count = await element.count().catch(() => 0);
          if (count > 0) {
            // Wait a bit for element to become visible
            const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              composer = element;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      if (composer) {
        break;
      }
    }

    if (!composer) {
      return {
        success: false,
        error: 'Could not find message composer after clicking Message button',
      };
    }

    // CRITICAL: Verify recipient before typing message
    // Extract username from profile URL for verification (reuse the username we already extracted)
    const expectedUsername = username;
    
    if (expectedUsername) {
      const isVerified = await verifyRecipient(page, expectedUsername, contact.name);
      if (!isVerified) {
        console.log(`   ⚠️  RECIPIENT VERIFICATION FAILED for ${contact.name}`);
        console.log(`   ⚠️  Aborting to prevent sending to wrong person`);
        return {
          success: false,
          error: `Recipient verification failed. Cannot confirm conversation is with ${contact.name}. Aborting to prevent wrong-recipient send.`,
        };
      }
      console.log(`   ✅ Recipient verified: messaging ${contact.name}`);
    } else {
      console.log(`   ⚠️  Could not extract username from profile URL for verification`);
    }

    // Type the message into the composer
    // For contenteditable divs, we need to click first, then set the text
    // Try multiple strategies to click the composer (it might be in a modal/overlay)
    let composerClickSucceeded = false;
    
    // Strategy 1: Try normal click with scroll
    try {
      await composer.scrollIntoViewIfNeeded({ timeout: 2000 });
      await page.waitForTimeout(500);
      await composer.click({ timeout: 3000 });
      composerClickSucceeded = true;
    } catch (e) {
      // Try next strategy
    }
    
    // Strategy 2: Try scrolling the page and then clicking
    if (!composerClickSucceeded) {
      try {
        // Get bounding box and scroll page to element
        const boundingBox = await composer.boundingBox();
        if (boundingBox) {
          await page.evaluate(({ x, y }: { x: number; y: number }) => {
            window.scrollTo(x, y);
          }, { x: boundingBox.x - 100, y: boundingBox.y - 200 });
          await page.waitForTimeout(500);
          await composer.click({ timeout: 3000 });
          composerClickSucceeded = true;
        }
      } catch (e) {
        // Try next strategy
      }
    }
    
    // Strategy 3: Try scrolling modal/overlay container if it exists
    if (!composerClickSucceeded) {
      try {
        // Try to find and scroll the modal/overlay container
        const modalContainer = page.locator('.msg-overlay, .msg-overlay-bubble-header, .msg-overlay-conversation-bubble, [role="dialog"]').first();
        const modalCount = await modalContainer.count().catch(() => 0);
        if (modalCount > 0) {
          await modalContainer.scrollIntoViewIfNeeded({ timeout: 2000 });
          await page.waitForTimeout(500);
        }
        await composer.click({ timeout: 3000 });
        composerClickSucceeded = true;
      } catch (e) {
        // Try next strategy
      }
    }
    
    // Strategy 4: Force click (bypasses viewport checks)
    if (!composerClickSucceeded) {
      try {
        await composer.click({ timeout: 3000, force: true });
        composerClickSucceeded = true;
      } catch (e) {
        // Try next strategy
      }
    }
    
    // Strategy 5: JavaScript click (bypasses all Playwright checks)
    if (!composerClickSucceeded) {
      try {
        await composer.evaluate((el: HTMLElement) => {
          el.focus();
          el.click();
        });
        composerClickSucceeded = true;
      } catch (e) {
        // All strategies failed
      }
    }
    
    if (!composerClickSucceeded) {
      return {
        success: false,
        error: 'Could not click message composer after trying 5 different strategies. Element may be in an inaccessible modal or overlay.',
      };
    }
    
    await page.waitForTimeout(500);

    // Clear any existing text
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Type message character-by-character
    // CRITICAL: LinkedIn sends messages on Enter, so we must use Shift+Enter for line breaks
    console.log(`   ⌨️  Typing message (${renderedMessage.length} chars)...`);
    try {
      // Check if page is still valid before typing
      try {
        await page.evaluate(() => document.title);
      } catch (pageCheckError) {
        return {
          success: false,
          error: 'Page or browser was closed before typing could begin',
        };
      }
      
      // Split message by newlines and type each part with Shift+Enter between them
      // This prevents accidental message sends when typing multi-line messages
      const messageParts = renderedMessage.split('\n');
      
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        
        // Type this part of the message
        if (part.length > 0) {
          await composer.type(part, { delay: 20 });
        }
        
        // If not the last part, press Shift+Enter for line break (NOT Enter alone!)
        if (i < messageParts.length - 1) {
          await page.keyboard.press('Shift+Enter');
          await page.waitForTimeout(100);
        }
      }
      
      await page.waitForTimeout(1000);
      
      console.log(`   ✅ Message typed successfully`);
    } catch (typeError) {
      // Handle typing errors
      const errorMessage = typeError instanceof Error ? typeError.message : String(typeError);
      if (errorMessage.includes('Target page, context or browser has been closed')) {
        return {
          success: false,
          error: 'Browser or page was closed while typing message',
        };
      }
      
      console.log(`   ❌ Error typing message: ${errorMessage}`);
      return {
        success: false,
        error: `Failed to type message: ${errorMessage}`,
      };
    }

    // CRITICAL: Press Enter to send the message
    // LinkedIn supports "Press Enter to Send" mode, which is the most reliable way
    console.log(`   📤 Pressing Enter to send message...`);
    try {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      console.log(`   ✅ Enter pressed - message should be sent`);
      
      // Give LinkedIn time to send the message and update UI
      await page.waitForTimeout(2000);
      
      return {
        success: true,
      };
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
      console.log(`   ❌ Error pressing Enter to send: ${errorMessage}`);
      return {
        success: false,
        error: `Failed to send message (Enter press failed): ${errorMessage}`,
      };
    }


  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Special handling for page/browser closed errors
    if (errorMessage.includes('Target page, context or browser has been closed')) {
      console.error(`   ❌ Error sending message to ${contact.name}: Page/browser was closed`);
      return {
        success: false,
        error: 'Page or browser was closed during message send',
      };
    }
    
    console.error(`   ❌ Error sending message to ${contact.name}: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Dry run: Verify that the message sending mechanism can reach the composer
 * without actually typing the message or clicking send.
 * 
 * This function navigates to the contact's profile, clicks the Message button,
 * and verifies the composer appears. It does NOT type the message or send it.
 * 
 * @param page - Playwright page instance
 * @param contact - Network contact to test
 * @returns Result indicating if the mechanism can reach the composer
 */
export async function dryRunLinkedInMessage(
  page: Page,
  contact: NetworkContact
): Promise<SendMessageResult> {
  try {
    console.log(`🔍 Dry run: Testing message mechanism for ${contact.name}...`);
    console.log(`   📍 Profile URL: ${contact.profile_url}`);

    // Extract username from profile URL for direct navigation
    const profileMatch = contact.profile_url.match(/\/in\/([^\/]+)/);
    if (!profileMatch) {
      return {
        success: false,
        error: `Could not extract username from profile URL: ${contact.profile_url}`,
      };
    }
    const username = profileMatch[1];
    console.log(`   📝 Username: ${username}`);

    // Use direct compose URL (PRIMARY STRATEGY - more reliable than button clicking)
    const composeUrl = `https://www.linkedin.com/messaging/compose/?recipient=${username}`;
    console.log(`   🚀 Navigating directly to compose page...`);
    console.log(`   📧 Compose URL: ${composeUrl}`);
    
    await page.goto(composeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000); // Give LinkedIn time to load messaging interface
    
    // Log current page state for debugging
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => 'Unknown');
    console.log(`   📄 Current URL: ${currentUrl}`);
    console.log(`   📄 Page title: ${pageTitle}`);

    // Check if we're on a login page or error page
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      return {
        success: false,
        error: `Redirected to login/checkpoint page. Current URL: ${currentUrl}`,
      };
    }

    // Direct compose URL navigation bypasses the need to find and click buttons
    console.log(`   ✅ Successfully navigated to messaging compose page`);
    console.log(`   ⏭️  Skipping button detection (using direct URL approach)`)

    // Wait for message composer to appear
    // LinkedIn's message composer can appear in different ways (modal, sidebar, etc.)
    console.log(`   🔍 Searching for message composer...`);
    const composerSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div.msg-form__contenteditable',
      'div[data-placeholder*="message"]',
      'textarea[placeholder*="message" i]',
      '.msg-form__contenteditable',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][data-placeholder*="message" i]',
      '.msg-send-list__composer .msg-form__contenteditable',
      '.msg-compose .msg-form__contenteditable',
    ];

    let composer = null;
    let foundComposerSelector = null;
    
    // Try finding composer with retries (it might take time to appear)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        console.log(`   🔄 Retry ${attempt + 1}/3: Waiting for composer to appear...`);
        await page.waitForTimeout(2000);
      }
      
      for (const selector of composerSelectors) {
        console.log(`      Trying composer selector: ${selector}`);
        try {
          const element = page.locator(selector).first();
          const count = await element.count();
          console.log(`         Found ${count} element(s)`);
          if (count > 0) {
            // Wait a bit for element to become visible
            const isVisible = await element.isVisible({ timeout: 2000 }).catch((e) => {
              console.log(`         Composer visibility check error: ${e instanceof Error ? e.message : String(e)}`);
              return false;
            });
            console.log(`         Is visible: ${isVisible}`);
            if (isVisible) {
              composer = element;
              foundComposerSelector = selector;
              break;
            }
          }
        } catch (e) {
          console.log(`         Composer selector error: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
      }
      
      if (composer) {
        break;
      }
    }

    if (!composer) {
      console.log(`   ❌ Could not find message composer. Tried ${composerSelectors.length} selectors.`);
      // Check if we're on a messaging page
      const finalUrl = page.url();
      const finalTitle = await page.title().catch(() => 'Unknown');
      console.log(`   📄 Final URL: ${finalUrl}`);
      console.log(`   📄 Final title: ${finalTitle}`);
      return {
        success: false,
        error: `Could not find message composer after clicking Message button. Tried ${composerSelectors.length} selectors. Current URL: ${finalUrl}`,
      };
    }

    // CRITICAL: Verify recipient before declaring success
    // Verify using the username we extracted at the start
    console.log(`   🔍 Verifying recipient for dry run...`);
    const isVerified = await verifyRecipient(page, username, contact.name);
    
    if (!isVerified) {
      console.log(`   ❌ Dry run FAILED: Recipient verification failed for ${contact.name}`);
      return {
        success: false,
        error: `Recipient verification failed. Cannot confirm conversation is with ${contact.name}.`,
      };
    }
    console.log(`   ✅ Recipient verified: ${contact.name}`);

    // Success: We found the composer and verified recipient
    // We do NOT type the message or click send - that's the point of dry run
    console.log(`   ✅ Dry run successful for ${contact.name}: composer found and recipient verified`);
    console.log(`      Used composer selector: ${foundComposerSelector}`);
    return {
      success: true,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    console.error(`   ❌ Dry run error for ${contact.name}: ${errorMessage}`);
    console.error(`   📍 Error stack: ${errorStack}`);
    // Log current page state if available
    try {
      const errorUrl = page.url();
      const errorTitle = await page.title().catch(() => 'Unknown');
      console.error(`   📄 Error occurred at URL: ${errorUrl}`);
      console.error(`   📄 Error occurred on page: ${errorTitle}`);
    } catch (e) {
      console.error(`   ⚠️  Could not get page state after error`);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

