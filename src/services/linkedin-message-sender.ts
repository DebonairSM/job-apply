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

    // Navigate to contact's profile
    await page.goto(contact.profile_url, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);

    // Render message template with placeholders
    const renderedMessage = renderMessageTemplate(messageTemplate, contact);

    // Find and click the "Message" button
    // LinkedIn has multiple possible selectors for the message button
    const messageButtonSelectors = [
      'button:has-text("Message")',
      'a[href*="/messaging/compose"]',
      'button[aria-label*="Message"]',
      '.pvs-profile-actions button:has-text("Message")',
      'button.pvs-profile-actions__action:has-text("Message")',
    ];

    let messageButton = null;
    for (const selector of messageButtonSelectors) {
      const btn = page.locator(selector).first();
      const count = await btn.count({ timeout: 2000 }).catch(() => 0);
      if (count > 0) {
        const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          messageButton = btn;
          break;
        }
      }
    }

    if (!messageButton) {
      return {
        success: false,
        error: 'Could not find Message button on profile page',
      };
    }

    // Click message button and wait for composer to open
    await messageButton.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Wait for message composer to appear
    // LinkedIn's message composer can appear in different ways (modal, sidebar, etc.)
    const composerSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div.msg-form__contenteditable',
      'div[data-placeholder*="message"]',
      'textarea[placeholder*="message" i]',
      '.msg-form__contenteditable',
    ];

    let composer = null;
    for (const selector of composerSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count({ timeout: 3000 }).catch(() => 0);
      if (count > 0) {
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          composer = element;
          break;
        }
      }
    }

    if (!composer) {
      return {
        success: false,
        error: 'Could not find message composer after clicking Message button',
      };
    }

    // Type the message into the composer
    // For contenteditable divs, we need to click first, then type
    await composer.click({ timeout: 3000 });
    await page.waitForTimeout(500);

    // Clear any existing text
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);

    // Type the message character by character for contenteditable divs
    // This is more reliable than setting innerHTML
    await composer.type(renderedMessage, { delay: 50 });
    await page.waitForTimeout(1000);

    // Verify message was typed
    const messageText = await composer.textContent().catch(() => '');
    if (!messageText || messageText.trim().length < renderedMessage.length * 0.8) {
      // Try alternative method: use evaluate to set text directly on the element
      await composer.evaluate((el, text) => {
        if (el) {
          el.textContent = text;
          // Trigger input event for contenteditable divs
          const event = new Event('input', { bubbles: true });
          el.dispatchEvent(event);
        }
      }, renderedMessage);
      
      await page.waitForTimeout(1000);
    }

    // Find and click the Send button
    const sendButtonSelectors = [
      'button[aria-label*="Send" i]',
      'button:has-text("Send")',
      'button.msg-form__send-button',
      'button[data-control-name="send"]',
    ];

    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      const btn = page.locator(selector).first();
      const count = await btn.count({ timeout: 2000 }).catch(() => 0);
      if (count > 0) {
        const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isVisible && !isDisabled) {
          sendButton = btn;
          break;
        }
      }
    }

    if (!sendButton) {
      return {
        success: false,
        error: 'Could not find Send button in message composer',
      };
    }

    // Click send button
    await sendButton.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify message was sent by checking if composer is cleared or send button is disabled
    const composerAfterSend = page.locator(composerSelectors[0]).first();
    const composerText = await composerAfterSend.textContent({ timeout: 2000 }).catch(() => '');
    const isComposerCleared = !composerText || composerText.trim().length === 0;

    if (isComposerCleared) {
      console.log(`   ✅ Message sent successfully to ${contact.name}`);
      return {
        success: true,
        messageId: crypto.randomUUID(), // Generate ID for tracking
      };
    } else {
      // Message might still be sending, wait a bit more
      await page.waitForTimeout(2000);
      const finalComposerText = await composerAfterSend.textContent({ timeout: 2000 }).catch(() => '');
      if (!finalComposerText || finalComposerText.trim().length === 0) {
        console.log(`   ✅ Message sent successfully to ${contact.name}`);
        return {
          success: true,
          messageId: crypto.randomUUID(),
        };
      } else {
        return {
          success: false,
          error: 'Message composer was not cleared after sending (message may not have been sent)',
        };
      }
    }

  } catch (error) {
    const err = error as Error;
    console.error(`   ❌ Error sending message to ${contact.name}: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

