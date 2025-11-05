# Referral Program Implementation Summary

## Overview

Added referral program functionality to the lead outreach email system. Users can now include a personalized referral link in outreach emails, allowing recipients to submit referrals through a public webhook on vsol.software.

## Implementation Details

### 1. Email Template Enhancements

**File**: `src/ai/email-templates.ts`

Added referral link generation and encoding:
- `encodeReferrerInfo(firstName, lastName)` - Base64 encodes referrer name with "VSOL" salt
- `generateReferralLink(lead)` - Creates full referral URL: `https://vsol.software/referral?ref=ENCODED`
- `addReferralSection(body, referralLink)` - Injects referral program text before signature

Updated interfaces and functions:
- Added `referralLink?: string` to `EmailContent` interface
- Modified `generateOutreachEmail(lead, includeReferral?)` to accept optional referral flag
- Updated `generateBulkEmails(leads, referralEnabled?)` to support per-lead referral preferences

Referral section text:
```
P.S. If you're not the right person for this conversation, I'd appreciate a referral! Use this link to refer someone who might benefit:
[REFERRAL_LINK]

Anyone you refer who becomes a client will receive my thanks and recognition.
```

### 2. Email Preview Modal Updates

**File**: `src/dashboard/client/components/EmailPreviewModal.tsx`

Added per-email referral controls:
- New prop: `leads: Lead[]` to enable email regeneration with referral
- State: `referralEnabled: Map<number, boolean>` tracks checkbox state per email
- Handler: `handleToggleReferral(index)` updates referral preference
- Dynamic email regeneration using `useMemo` when referral preference changes
- Checkbox UI displays between email body and action buttons
- Shows truncated referral link when enabled

UI changes:
- Checkbox labeled "Include Referral Program"
- Shows referral link preview when enabled
- Emails regenerate in real-time when checkbox toggled
- No page reload required

### 3. Leads List Integration

**File**: `src/dashboard/client/components/LeadsList.tsx`

Updated email generation flow:
- Added state: `selectedLeadsForEmail` to track leads used in email modal
- Modified `handleGenerateEmails()` to store selected leads
- Updated `handleCloseEmailModal()` to clear leads when modal closes
- Passed `leads` prop to `EmailPreviewModal` component

This allows the modal to regenerate emails with referral sections dynamically.

### 4. External Webhook Documentation

**File**: `docs/REFERRAL_WEBHOOK_PROMPT.md`

Created comprehensive implementation guide for building the public webhook on vsol.software, including:

**Technical Specifications:**
- Base64 decoding algorithm with "VSOL" salt
- URL structure: `https://vsol.software/referral?ref=ENCODED_DATA`
- Form fields: LinkedIn URL (required), Email (required), Phone (optional)
- Database schema for storing referrals
- Backend API endpoint specification

**Security Measures:**
- Input validation and sanitization
- SQL injection prevention
- Rate limiting (5 submissions per IP per 15 minutes)
- CAPTCHA/honeypot spam prevention
- HTTPS requirement

**Design Guidelines:**
- VSol Software branding colors and typography
- Responsive layout for desktop and mobile
- Form styling examples
- Error and success message patterns

**Code Examples:**
- JavaScript/Node.js decoding function
- PHP decoding function
- Express.js API endpoint
- HTML template
- CSS styling
- Client-side validation

**Database Schema:**
```sql
CREATE TABLE referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrer_first_name VARCHAR(100),
  referrer_last_name VARCHAR(100),
  referral_linkedin_url VARCHAR(500),
  referral_email VARCHAR(255),
  referral_phone VARCHAR(50),
  submitted_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
)
```

## User Workflow

### Sending Outreach Emails

1. User selects leads from Leads page
2. Clicks "Generate Outreach Emails"
3. Email Preview Modal opens with all generated emails
4. For each email, user can check "Include Referral Program"
5. Email body updates in real-time to show referral section
6. User clicks "Open in Email Client" or "Copy to Clipboard"
7. Email contains personalized referral link for that specific lead

### Referral Submission (External)

1. Email recipient clicks referral link
2. Landing page loads at `https://vsol.software/referral?ref=ENCODED`
3. Page decodes referrer info and displays personalized greeting
4. Recipient fills form with LinkedIn URL, email, and optional phone
5. Form submits to backend API
6. Success message confirms submission
7. Referral stored in database for follow-up

## Encoding Mechanism

The referral link encoding uses Base64 with a salt prefix to obfuscate (not encrypt) the referrer's name:

**Encoding Process:**
1. Combine: `VSOL:FirstName:LastName`
2. Base64 encode the string
3. Append to URL: `https://vsol.software/referral?ref=ENCODED`

**Example:**
- Input: John Smith
- Data: `VSOL:John:Smith`
- Encoded: `VlNPTDpKb2huOlNtaXRo`
- URL: `https://vsol.software/referral?ref=VlNPTDpKb2huOlNtaXRo`

**Decoding Process:**
1. Extract `ref` parameter from URL
2. Base64 decode the string
3. Split by `:` delimiter
4. Verify first part equals "VSOL"
5. Extract first and last name from parts 2 and 3

This provides basic obfuscation to prevent casual inspection while remaining simple to implement across platforms.

## Files Modified

1. **src/ai/email-templates.ts**
   - Added encoding utilities
   - Added referral link generation
   - Updated `generateOutreachEmail()` signature
   - Updated `generateBulkEmails()` signature
   - Added `EmailContent.referralLink` field

2. **src/dashboard/client/components/EmailPreviewModal.tsx**
   - Added `leads` prop
   - Added referral enabled state
   - Added toggle handler
   - Added checkbox UI
   - Implemented dynamic email regeneration

3. **src/dashboard/client/components/LeadsList.tsx**
   - Added `selectedLeadsForEmail` state
   - Updated email generation handler
   - Passed leads to modal

## Files Created

1. **docs/REFERRAL_WEBHOOK_PROMPT.md**
   - Complete implementation guide for external webhook
   - Code examples in JavaScript and PHP
   - Security best practices
   - Design guidelines
   - Testing checklist

## Configuration

**Referral Base URL:**
- Currently hardcoded: `https://vsol.software/referral`
- Location: `src/ai/email-templates.ts` (line 30)
- Can be changed to different domain if needed

**Salt Value:**
- Currently: `VSOL`
- Location: `src/ai/email-templates.ts` (line 29)
- Must match decoding logic on webhook side

## Testing Recommendations

### Manual Testing

1. **Email Generation:**
   - Select leads with complete name data
   - Generate emails without referral (default)
   - Enable referral checkbox for some emails
   - Verify email body includes referral section
   - Check referral link format

2. **Encoding Verification:**
   - Test with various name formats (single name, multiple words)
   - Test with special characters in names
   - Verify Base64 encoding/decoding works correctly
   - Check URL encoding doesn't break links

3. **UI Interactions:**
   - Toggle referral checkbox multiple times
   - Verify email updates immediately
   - Check "Open in Email Client" works with referral
   - Verify "Copy to Clipboard" includes referral

4. **Edge Cases:**
   - Leads with single-word names
   - Leads with hyphenated names
   - Leads with special characters
   - Very long names

### External Webhook Testing

The external webhook should be tested separately using the prompt in `docs/REFERRAL_WEBHOOK_PROMPT.md`:
- Valid and invalid ref parameters
- Form validation
- Rate limiting
- Security measures
- Mobile responsiveness

## Security Considerations

### In This Application

**Low Risk:**
- Encoding is for obfuscation only, not security
- Names are already semi-public (LinkedIn connections)
- No sensitive data encoded in URL

**Best Practices:**
- Don't include additional PII in referral links
- Salt value should remain consistent
- Consider adding timestamp or expiration if needed in future

### External Webhook (Separate System)

**High Risk Areas:**
- User input must be sanitized
- SQL injection prevention required
- Rate limiting essential
- CAPTCHA recommended for production
- HTTPS mandatory

See `docs/REFERRAL_WEBHOOK_PROMPT.md` for detailed security implementation.

## Future Enhancements

Possible improvements:

1. **Tracking:**
   - Store which leads had referral links sent
   - Track click-through rates
   - Monitor conversion from referral to client

2. **Expiration:**
   - Add timestamp to encoded data
   - Implement link expiration (e.g., 30 days)
   - Show "expired link" message on webhook

3. **Incentives:**
   - Track successful referrals
   - Reward top referrers
   - Display leaderboard

4. **Templates:**
   - Multiple referral message templates
   - Customizable referral sections
   - A/B testing different messages

5. **Integration:**
   - Import referrals back into leads table
   - Automatic follow-up emails
   - CRM integration

6. **Analytics:**
   - Dashboard showing referral metrics
   - Top referrers
   - Conversion rates
   - Geographic distribution

## Known Limitations

1. **No Encryption:**
   - Base64 is easily decoded
   - Names are visible in URL if decoded
   - Acceptable for non-sensitive data

2. **No Expiration:**
   - Links work indefinitely
   - No timestamp validation
   - Consider adding if needed

3. **Client-Side Generation:**
   - All encoding happens in browser
   - No server-side validation of encoded data
   - Webhook must validate decoded data

4. **No Duplicate Detection:**
   - Same person can be referred multiple times
   - Webhook should implement deduplication
   - Consider business logic for handling duplicates

## Deployment Notes

**No Server Changes Required:**
- All changes are client-side (dashboard)
- No database migrations needed
- No new API endpoints in this application
- External webhook is separate project

**Browser Compatibility:**
- Uses standard Base64 encoding (Buffer.from)
- Compatible with all modern browsers
- No polyfills required

**Testing Before Production:**
- Test with real email clients (Outlook, Gmail, Apple Mail)
- Verify mailto links work with referral section
- Check link length doesn't exceed email client limits
- Test on mobile devices

## Support

For questions about this implementation:
- Review code comments in modified files
- Check `docs/REFERRAL_WEBHOOK_PROMPT.md` for webhook implementation
- Test locally using npm run dashboard

For webhook implementation assistance:
- Use the comprehensive prompt in `docs/REFERRAL_WEBHOOK_PROMPT.md`
- Copy entire document to AI assistant or developer
- All specifications and code examples included

## Summary

The referral program is now fully integrated into the lead outreach system. Users can optionally include personalized referral links in emails, and recipients can submit referrals through a landing page on vsol.software. The implementation is secure, user-friendly, and requires minimal changes to the existing codebase. The external webhook can be built independently using the comprehensive prompt provided.

