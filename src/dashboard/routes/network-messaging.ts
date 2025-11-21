import express, { Request, Response } from 'express';
import { chromium } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession } from '../../lib/session.js';
import {
  getNetworkContacts,
  getNetworkContactById,
  getNetworkMessagesByContactId,
  updateNetworkContactMessaging,
  createNetworkMessage,
  getApplicationPreference,
  saveApplicationPreference,
  NetworkContact,
} from '../../lib/db.js';
import { scrapeNetworkContacts } from '../../services/network-contact-scraper.js';
import { sendLinkedInMessage } from '../../services/linkedin-message-sender.js';
import { renderMessageTemplate } from '../../services/message-template-renderer.js';

const router = express.Router();

// Utility functions for validation
function parseIntegerParameter(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBooleanParameter(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function sanitizeStringParameter(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value).trim();
}

// Error response helper
interface ErrorResponse {
  error: string;
  details?: string;
}

function sendErrorResponse(res: Response, statusCode: number, error: string, details?: string): void {
  const response: ErrorResponse = { error };
  if (details) {
    response.details = details;
  }
  res.status(statusCode).json(response);
}

// GET /api/network-messaging/contacts - Get network contacts with filters
router.get('/contacts', (req: Request, res: Response): void => {
  try {
    const { workedTogether, location, messaged } = req.query;

    const filters = {
      workedTogether: parseBooleanParameter(workedTogether) ?? true, // Default to true
      location: sanitizeStringParameter(location),
      messaged: parseBooleanParameter(messaged),
    };

    const contacts = getNetworkContacts(filters);

    res.json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Error fetching network contacts:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to fetch network contacts',
      error instanceof Error ? error.message : undefined
    );
  }
});

// POST /api/network-messaging/refresh - Scrape fresh network contacts from LinkedIn
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  if (!hasSession()) {
    sendErrorResponse(res, 401, 'No LinkedIn session found. Please run "npm run login" first.');
    return;
  }

  const { maxContacts } = req.body;
  const max = parseIntegerParameter(maxContacts, 1000);

  try {
    const config = loadConfig();

    // Launch browser
    const browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo,
      args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    try {
      // Scrape network contacts
      const progress = await scrapeNetworkContacts(page, {
        maxContacts: max,
      });

      await browser.close();

      res.json({
        success: true,
        contactsScraped: progress.contactsScraped,
        contactsAdded: progress.contactsAdded,
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Error refreshing network contacts:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to refresh network contacts',
      error instanceof Error ? error.message : undefined
    );
  }
});

// POST /api/network-messaging/send - Send messages to selected contacts
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  if (!hasSession()) {
    sendErrorResponse(res, 401, 'No LinkedIn session found. Please run "npm run login" first.');
    return;
  }

  const { contactIds, messageTemplate } = req.body;

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    sendErrorResponse(res, 400, 'contactIds must be a non-empty array');
    return;
  }

  if (!messageTemplate || typeof messageTemplate !== 'string') {
    sendErrorResponse(res, 400, 'messageTemplate is required and must be a string');
    return;
  }

  try {
    const config = loadConfig();

    // Launch browser
    const browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo,
      args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ contactId: string; error: string }>,
    };

    try {
      // Send messages to each contact
      for (const contactId of contactIds) {
        const contact = getNetworkContactById(contactId);
        if (!contact) {
          results.failed++;
          results.errors.push({
            contactId,
            error: 'Contact not found',
          });
          continue;
        }

        // Send message
        const result = await sendLinkedInMessage(page, contact, messageTemplate);

        if (result.success) {
          // Update contact messaging status
          updateNetworkContactMessaging(contactId, 'sent');

          // Create message record
          const renderedMessage = renderMessageTemplate(messageTemplate, contact);
          createNetworkMessage({
            contact_id: contactId,
            message_template: messageTemplate,
            message_sent: renderedMessage,
            status: 'sent',
          });

          results.sent++;
        } else {
          // Update contact with error status
          updateNetworkContactMessaging(contactId, 'error', result.error);

          // Create message record with error
          const renderedMessage = renderMessageTemplate(messageTemplate, contact);
          createNetworkMessage({
            contact_id: contactId,
            message_template: messageTemplate,
            message_sent: renderedMessage,
            status: 'error',
            error_message: result.error,
          });

          results.failed++;
          results.errors.push({
            contactId,
            error: result.error || 'Unknown error',
          });
        }

        // Random delay between messages (2-5 seconds)
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await page.waitForTimeout(delay);
      }

      await browser.close();

      res.json(results);
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Error sending messages:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to send messages',
      error instanceof Error ? error.message : undefined
    );
  }
});

// GET /api/network-messaging/contacts/:contactId/messages - Get message history for a contact
router.get('/contacts/:contactId/messages', (req: Request, res: Response): void => {
  try {
    const { contactId } = req.params;

    const contact = getNetworkContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not found');
      return;
    }

    const messages = getNetworkMessagesByContactId(contactId);

    res.json({
      contact,
      messages,
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to fetch contact messages',
      error instanceof Error ? error.message : undefined
    );
  }
});

// POST /api/network-messaging/preview - Preview rendered message for a contact
router.post('/preview', (req: Request, res: Response): void => {
  try {
    const { contactId, messageTemplate } = req.body;

    if (!contactId || !messageTemplate) {
      sendErrorResponse(res, 400, 'contactId and messageTemplate are required');
      return;
    }

    const contact = getNetworkContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not found');
      return;
    }

    const renderedMessage = renderMessageTemplate(messageTemplate, contact);

    res.json({
      contact,
      renderedMessage,
    });
  } catch (error) {
    console.error('Error previewing message:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to preview message',
      error instanceof Error ? error.message : undefined
    );
  }
});

// GET /api/network-messaging/message-template - Get saved message template
router.get('/message-template', (req: Request, res: Response): void => {
  try {
    const defaultTemplate = `{{firstName}}, I'm putting together a few reviews from people familiar with my work. If you have a moment, would you mind sharing a short review about the software I build and my work ethic?

And if you'd like to see one of my current projects, you're welcome to test-drive Sunny — your friendly agent for quick systems analysis. You can sign in with Google here: https://vsol.ngrok.app/

Review link: https://www.thumbtack.com/reviews/services/564457491884556302/write`;

    const template = getApplicationPreference('network_messaging_template', defaultTemplate);
    res.json({ template });
  } catch (error) {
    console.error('Error fetching message template:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to fetch message template',
      error instanceof Error ? error.message : undefined
    );
  }
});

// PUT /api/network-messaging/message-template - Save message template
router.put('/message-template', (req: Request, res: Response): void => {
  try {
    const { template } = req.body;

    if (!template || typeof template !== 'string') {
      sendErrorResponse(res, 400, 'template is required and must be a string');
      return;
    }

    saveApplicationPreference({
      key: 'network_messaging_template',
      value: template,
      description: 'Default message template for LinkedIn network messaging',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving message template:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to save message template',
      error instanceof Error ? error.message : undefined
    );
  }
});

// PUT /api/network-messaging/contacts/:contactId/status - Manually update contact messaging status
router.put('/contacts/:contactId/status', (req: Request, res: Response): void => {
  try {
    const { contactId } = req.params;
    const { status, errorMessage } = req.body;

    if (!status || !['sent', 'replied', 'error'].includes(status)) {
      sendErrorResponse(res, 400, 'Invalid status. Must be one of: sent, replied, error');
      return;
    }

    const contact = getNetworkContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not found');
      return;
    }

    const success = updateNetworkContactMessaging(contactId, status as 'sent' | 'replied' | 'error', errorMessage);

    if (success) {
      res.json({
        success: true,
        contact: getNetworkContactById(contactId),
      });
    } else {
      sendErrorResponse(res, 500, 'Failed to update contact status');
    }
  } catch (error) {
    console.error('Error updating contact status:', error);
    sendErrorResponse(
      res,
      500,
      'Failed to update contact status',
      error instanceof Error ? error.message : undefined
    );
  }
});

export default router;

