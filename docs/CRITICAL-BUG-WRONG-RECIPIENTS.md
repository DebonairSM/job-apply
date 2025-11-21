# CRITICAL BUG: Messages Sent to Wrong Recipients [FIXED]

## Incident Report

**Date**: November 21, 2025  
**Severity**: CRITICAL  
**Status**: ✅ FIXED - Recipient verification added to production code  
**Fix Applied**: November 21, 2025

## Fix Summary

The following fixes have been applied to `src/services/linkedin-message-sender.ts`:

1. ✅ **Added `verifyRecipient()` function** - Checks URL parameters to confirm correct recipient
2. ✅ **Recipient verification in `sendLinkedInMessage()`** - Aborts if verification fails
3. ✅ **Recipient verification in `dryRunLinkedInMessage()`** - Dry runs also verify recipient
4. ✅ **Fixed send button selector** - Added `button.msg-form__send-btn` (the working selector)
5. ✅ **Tested successfully** - Message sent to correct person (Celiane) with verification

The system now **verifies the recipient before sending any message** and will abort if it cannot confirm the correct person.

## What Happened

During testing, the automation sent test messages to **Mosab Mohamed** and **Aaron Ayotte** instead of the intended recipient **Celiane Bandeira**.

The messages said "Hi Celiane! 👋" but were delivered to the wrong people.

## Root Cause

The script navigates to the target person's profile and looks for messaging links using:

```typescript
const messagingLinks = await page.locator('a[href*="/messaging/thread/new"]').all();
```

**The Problem**: LinkedIn profiles show activity feeds with posts and interactions from OTHER people. These posts can contain their own messaging links. The script grabbed the first messaging link it found, which belonged to someone else who appeared in Celiane's feed.

## Why This Is Critical

1. **Privacy violation**: Messages meant for one person are being sent to others
2. **Embarrassing**: Recipients got messages addressed to someone else
3. **Trust issue**: The automation cannot be trusted to send to the correct recipient
4. **Potential LinkedIn ban**: Spamming wrong people could get the account flagged

## What We Learned

### The Wrong Approach

❌ **DO NOT** extract messaging links from profile pages - they are unreliable  
❌ **DO NOT** assume the first messaging link found is the correct one  
❌ **DO NOT** send messages without verifying the recipient  

### The Right Approach

✅ **VERIFY** the recipient name in the composer before typing  
✅ **CHECK** that you're in the correct conversation thread  
✅ **USE** the profile's actual Message button, not feed links  
✅ **VALIDATE** the page URL contains the correct LinkedIn ID  

## Required Fixes

### 1. Click the Profile Message Button Directly

Instead of extracting links, click the actual "Message" button on the profile:

```typescript
// Find the PROFILE-LEVEL message button (not from feed posts)
const messageButton = page.locator('.pvs-profile-actions button:has-text("Message")').first();
await messageButton.click();
```

### 2. Verify Recipient Before Typing

After opening the composer, verify we're messaging the right person:

```typescript
// Check the conversation header for the recipient name
const conversationHeader = await page.locator('.msg-thread').textContent();
if (!conversationHeader.includes(expectedName)) {
  throw new Error(`Wrong recipient! Expected ${expectedName}, got ${conversationHeader}`);
}
```

### 3. Use LinkedIn's Recipient URN System

The correct way is to use LinkedIn's URN (Uniform Resource Name) system:

```typescript
// Extract the profile URN from the profile page data
const profileData = await page.evaluate(() => {
  // LinkedIn stores profile data in the page
  return window.__INITIAL_STATE__?.profileUrn;
});

// Use the URN to construct the messaging URL
const messagingUrl = `https://www.linkedin.com/messaging/thread/new?recipients=${profileData}`;
```

### 4. Add Dry Run Verification

The dry run should verify:
- Correct profile was loaded
- Correct recipient name appears in composer
- No other conversations are open

## Immediate Actions Required

1. ❌ **DISABLE** all automated message sending until fixed
2. ✅ **APOLOGIZE** to Mosab and Aaron for the erroneous test messages
3. ✅ **DOCUMENT** this bug and prevention measures
4. ✅ **REFACTOR** the message sending code with proper verification
5. ✅ **TEST** thoroughly with dry runs before any real sends

## Prevention Checklist

Before any future message sending:

- [ ] Profile verification: Confirm we're on the correct profile
- [ ] Button verification: Click the profile's own Message button
- [ ] Recipient verification: Check the composer shows the correct name
- [ ] URL verification: Confirm the messaging URL contains the correct ID
- [ ] Dry run: Always test without sending first
- [ ] Manual review: Have a human verify before enabling automation

## Lessons Learned

1. **Never trust selectors alone** - HTML elements don't guarantee correct behavior
2. **Always verify the target** - Check names, IDs, and URLs before acting
3. **LinkedIn's UI is complex** - Profiles show content from many people
4. **Test with caution** - Even "test" messages can cause real harm
5. **Automate carefully** - Message automation is high-risk

## Status

✅ **SAFE TO USE** - The message sending automation has been fixed with:
1. ✅ Recipient verification added to both send and dry run functions
2. ✅ Successfully tested - message sent to correct person (Celiane)
3. ✅ Working send button selector added (`button.msg-form__send-btn`)
4. ✅ Safety mechanism implemented - aborts if recipient cannot be verified

**Recommendation**: Still run dry runs on new contacts to verify the mechanism works for each profile.

## Apologies

To Mosab Mohamed and Aaron Ayotte: We apologize for the erroneous test messages you received. This was a bug in our automation testing and not intended for you.

