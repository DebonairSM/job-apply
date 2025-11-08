# Gmail Email Copy Guide

## The Problem

Gmail aggressively strips HTML formatting from clipboard paste operations for security reasons. This causes:
- Missing emojis in signature
- Non-clickable links (phone, email, website)
- Lost formatting (bold text, line breaks)

## The Solution

**Two methods provided:**

### Method 1: Visual Copy (RECOMMENDED for Gmail)

1. Generate the email in the dashboard
2. **Look at the "Formatted Email Body" preview box**
3. **Select all text in the preview** (click inside and press Ctrl+A)
4. **Copy with Ctrl+C**
5. Paste into Gmail compose window

✅ This method preserves:
- All emojis (📞 ✉️ 🌐)
- Clickable links (phone, email, website, company LinkedIn, personal LinkedIn)
- Bold formatting
- Proper line breaks and spacing

**Why it works:** When you copy from rendered HTML (the preview), Gmail preserves the formatting. It only strips HTML when pasting from clipboard API.

### Method 2: Quick Copy Button

1. Click the "Quick Copy" button
2. Paste into Gmail

⚠️ This method may lose some formatting depending on browser and Gmail version. Use Method 1 for best results.

### Method 3: Open in Email Client

1. Click "Open in Email Client"  
2. Uses your default email client (Outlook, Apple Mail, etc.)

⚠️ mailto: links don't support HTML formatting, so emojis and rich formatting won't work with this method.

## Dashboard Updates

Both the LeadDetail component and EmailPreviewModal now show:
- **Blue info banner** reminding users to copy from the preview
- **Formatted preview box** with all HTML rendering (emojis, links, bold text)
- **Visual formatting** matching exactly what will appear in Gmail
- All signature links are clickable, including the company LinkedIn link

## Technical Details

### What Changed

1. **Added Rich HTML Preview**
   - Uses `dangerouslySetInnerHTML` to render formatted email
   - Matches Gmail's font styling (Arial, 12pt, 1.6 line-height)
   - Shows emojis and clickable links

2. **Improved Clipboard API**
   - Extracts just body content (no DOCTYPE/html wrapper)
   - Sends both HTML and plain text formats
   - Gmail-compatible HTML structure

3. **User Guidance**
   - Clear instructions above preview
   - Blue info banner explaining best practice
   - Renamed button to "Quick Copy" to differentiate from manual copy

### Why Gmail Strips HTML

Gmail sanitizes pasted HTML to prevent:
- XSS attacks
- Malicious scripts
- Unwanted styling

When you paste from clipboard API, Gmail applies strict sanitization. When you copy from rendered HTML (visual selection), Gmail treats it as user-generated content and preserves more formatting.

## Testing

Test the email copy in Gmail:
1. Generate an email for a lead
2. Select and copy from the formatted preview
3. Paste into Gmail compose
4. Verify:
   - ✅ Emojis appear in signature
   - ✅ Phone number is clickable (tel: link)
   - ✅ Email is clickable (mailto: link)
   - ✅ Website is clickable (https: link)
   - ✅ Personal LinkedIn link is clickable
   - ✅ Company LinkedIn link is clickable
   - ✅ "Work Automation Platform" is bold
   - ✅ Proper spacing and line breaks

## Fallback for Other Email Clients

For Outlook, Apple Mail, or other clients:
- Visual copy method works for all email clients
- These clients are generally less strict than Gmail
- Quick Copy button may work fine for non-Gmail clients

## Summary

**For Gmail users: Always use Method 1 (Visual Copy from Preview)**
- This is the most reliable way to preserve all formatting
- Works around Gmail's clipboard sanitization
- Dashboard now guides users to use this method

**For other email clients: Either method works**
- Quick Copy button is faster
- Visual copy ensures consistency across all clients





