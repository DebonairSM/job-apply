# Referral Landing Page Implementation Prompt

## Project Overview

Create a referral landing page for VSol Software that allows recipients of outreach emails to submit referrals. The page will decode Base64-encoded referrer information from a URL parameter and display a form for submitting referral details.

## Technical Requirements

### URL Structure

The landing page should be accessible at:
```
https://vsol.software/referral?ref=ENCODED_DATA
```

Where `ENCODED_DATA` is a Base64-encoded string containing:
```
VSOL:FirstName:LastName
```

### Decoding Algorithm

The encoded data uses "VSOL" as a salt prefix. Here's the decoding logic:

**JavaScript/Node.js Example:**
```javascript
function decodeReferrerInfo(encodedData) {
  try {
    const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    
    if (parts.length !== 3 || parts[0] !== 'VSOL') {
      return null; // Invalid format
    }
    
    return {
      firstName: parts[1],
      lastName: parts[2]
    };
  } catch (error) {
    return null; // Decoding failed
  }
}
```

**PHP Example:**
```php
function decodeReferrerInfo($encodedData) {
    try {
        $decoded = base64_decode($encodedData, true);
        if ($decoded === false) {
            return null;
        }
        
        $parts = explode(':', $decoded);
        
        if (count($parts) !== 3 || $parts[0] !== 'VSOL') {
            return null;
        }
        
        return [
            'firstName' => $parts[1],
            'lastName' => $parts[2]
        ];
    } catch (Exception $e) {
        return null;
    }
}
```

### Page Behavior

1. **On Page Load:**
   - Extract `ref` parameter from URL query string
   - Decode the referrer information
   - If decoding fails or parameter is missing, show error message
   - If successful, display personalized greeting with referrer's name

2. **Greeting Display:**
   - Show: "Hello [FirstName] [LastName]! Thank you for helping us connect with potential clients."
   - Alternative if no ref: "Welcome! Please enter your referral information below."

3. **Form Fields:**

   **LinkedIn Profile URL (Required):**
   - Input type: text/url
   - Validation: Must be a valid LinkedIn profile URL
   - Regex pattern: `^https?://([a-z]+\.)?linkedin\.com/in/[a-zA-Z0-9-]+/?$`
   - Error message: "Please enter a valid LinkedIn profile URL"

   **Email (Required):**
   - Input type: email
   - Validation: Standard email validation
   - Error message: "Please enter a valid email address"

   **Phone Number (Optional):**
   - Input type: tel
   - Format: Accept various formats (e.g., (123) 456-7890, 123-456-7890, +1-123-456-7890)
   - No strict validation, but basic cleanup

4. **Submission Handling:**
   - Validate all inputs client-side before submission
   - Submit via POST request to backend endpoint
   - Display loading state during submission
   - Show success message on successful submission
   - Show error message if submission fails
   - Clear form after successful submission

### Database Schema

Store referrals in a dedicated table:

```sql
CREATE TABLE referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrer_first_name VARCHAR(100) NOT NULL,
  referrer_last_name VARCHAR(100) NOT NULL,
  referral_linkedin_url VARCHAR(500) NOT NULL,
  referral_email VARCHAR(255) NOT NULL,
  referral_phone VARCHAR(50),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Indexes for common queries
  INDEX idx_referrer (referrer_first_name, referrer_last_name),
  INDEX idx_submitted (submitted_at),
  INDEX idx_email (referral_email)
);
```

### Backend API Endpoint

Create a POST endpoint to handle form submissions:

**Endpoint:** `/api/referral/submit`

**Request Body (JSON):**
```json
{
  "referrerFirstName": "John",
  "referrerLastName": "Smith",
  "linkedinUrl": "https://www.linkedin.com/in/jane-doe/",
  "email": "jane.doe@example.com",
  "phone": "(555) 123-4567"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Thank you! Your referral has been submitted successfully."
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid LinkedIn URL format"
}
```

**Backend Implementation Example (Node.js/Express):**
```javascript
const express = require('express');
const router = express.Router();

router.post('/api/referral/submit', async (req, res) => {
  const { referrerFirstName, referrerLastName, linkedinUrl, email, phone } = req.body;
  
  // Validate inputs
  if (!referrerFirstName || !referrerLastName || !linkedinUrl || !email) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  
  // Validate LinkedIn URL
  const linkedinRegex = /^https?:\/\/([a-z]+\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
  if (!linkedinRegex.test(linkedinUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid LinkedIn URL format'
    });
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email address'
    });
  }
  
  // Get client info
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');
  
  try {
    // Insert into database
    await db.query(
      `INSERT INTO referrals 
       (referrer_first_name, referrer_last_name, referral_linkedin_url, 
        referral_email, referral_phone, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [referrerFirstName, referrerLastName, linkedinUrl, email, phone || null, ipAddress, userAgent]
    );
    
    res.json({
      success: true,
      message: 'Thank you! Your referral has been submitted successfully.'
    });
  } catch (error) {
    console.error('Error saving referral:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while saving your referral. Please try again.'
    });
  }
});

module.exports = router;
```

## Security Considerations

### Input Validation
- Sanitize all user inputs before storing in database
- Use parameterized queries to prevent SQL injection
- Validate URL formats strictly
- Limit input lengths (e.g., LinkedIn URL max 500 chars, email max 255 chars)

### Rate Limiting
Implement rate limiting to prevent abuse:
```javascript
const rateLimit = require('express-rate-limit');

const referralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per IP per 15 minutes
  message: 'Too many referral submissions. Please try again later.'
});

app.use('/api/referral/submit', referralLimiter);
```

### CAPTCHA/Honeypot
Add spam protection using one of these methods:

**Google reCAPTCHA v3:**
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
<script>
grecaptcha.ready(function() {
  grecaptcha.execute('YOUR_SITE_KEY', {action: 'submit'}).then(function(token) {
    document.getElementById('recaptchaToken').value = token;
  });
});
</script>
```

**Honeypot Field (simpler alternative):**
```html
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
```
Reject submissions if this field is filled.

### HTTPS Required
- Ensure the entire site uses HTTPS
- Redirect HTTP to HTTPS
- Use secure cookies if implementing sessions

### CORS Configuration
If API is on different domain:
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://vsol.software',
  methods: ['POST'],
  credentials: true
}));
```

## Design Guidelines

### VSol Software Branding

**Colors:**
- Primary: #0066CC (blue)
- Secondary: #333333 (dark gray)
- Success: #28A745 (green)
- Error: #DC3545 (red)
- Background: #F8F9FA (light gray)

**Typography:**
- Headings: Sans-serif, bold, 24-32px
- Body: Sans-serif, regular, 16px
- Form labels: Sans-serif, medium, 14px

**Logo:**
Include VSol Software logo at the top of the page.

### Layout Structure

```
+----------------------------------+
|        [VSol Logo]               |
+----------------------------------+
|                                  |
|  Hello John Smith!               |
|  Thank you for helping us...     |
|                                  |
|  +----------------------------+  |
|  | LinkedIn Profile URL *     |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Email Address *            |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Phone Number (optional)    |  |
|  +----------------------------+  |
|                                  |
|  [Submit Referral Button]        |
|                                  |
+----------------------------------+
```

### Responsive Design

**Desktop (>768px):**
- Center content in 600px max-width container
- Form fields full width within container
- Large, prominent submit button

**Mobile (<768px):**
- Full-width content with 20px padding
- Stack all elements vertically
- Touch-friendly button sizes (min 44px height)

### Form Styling Example (CSS)

```css
.referral-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #0066CC;
}

.form-input.error {
  border-color: #DC3545;
}

.error-message {
  color: #DC3545;
  font-size: 14px;
  margin-top: 4px;
}

.submit-button {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  background-color: #0066CC;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #0052A3;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.success-message {
  background-color: #D4EDDA;
  color: #155724;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
}
```

## User Experience Flow

### Normal Flow
1. User clicks referral link in email
2. Page loads with personalized greeting
3. User fills out form fields
4. Client-side validation occurs on blur/change
5. User clicks submit button
6. Loading state shows (button disabled, spinner)
7. Success message displays
8. Form clears, ready for another submission

### Error Scenarios

**Invalid or Missing Ref Parameter:**
- Show generic greeting without personalization
- Display message: "You can still submit a referral below"
- Form still works normally

**Invalid Form Input:**
- Show inline error messages below invalid fields
- Highlight invalid fields with red border
- Prevent submission until corrected

**Network Error:**
- Show error message: "Unable to submit referral. Please check your connection and try again."
- Keep form data intact
- Allow user to retry

**Server Error:**
- Show error message: "An error occurred. Please try again later."
- Log error details server-side
- Optionally provide support email

## Success Message

After successful submission:

```
✓ Thank you for your referral!

We've received your submission and will reach out to [referral email] soon.

Feel free to submit another referral using the form below.
```

Keep form visible to allow multiple submissions.

## Error Handling

### Client-Side Validation

**LinkedIn URL:**
```javascript
function validateLinkedInUrl(url) {
  const pattern = /^https?:\/\/([a-z]+\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
  return pattern.test(url);
}
```

**Email:**
```javascript
function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}
```

**Phone (Basic):**
```javascript
function cleanPhone(phone) {
  // Remove all non-numeric characters except +
  return phone.replace(/[^\d+]/g, '');
}
```

### Error Messages

Be specific and helpful:
- "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)"
- "Please enter a valid email address"
- "This field is required"

## Testing Checklist

### Functional Testing
- [ ] Page loads with valid ref parameter
- [ ] Page loads without ref parameter
- [ ] Page loads with invalid ref parameter
- [ ] Form validates LinkedIn URL format
- [ ] Form validates email format
- [ ] Phone field accepts various formats
- [ ] Form submits successfully with all fields
- [ ] Form submits successfully without optional phone
- [ ] Success message displays correctly
- [ ] Form clears after submission
- [ ] Multiple submissions work in sequence

### Security Testing
- [ ] SQL injection attempts fail
- [ ] XSS attempts are sanitized
- [ ] Rate limiting prevents spam
- [ ] CAPTCHA/honeypot prevents bots
- [ ] Invalid data is rejected server-side

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## Deployment Considerations

### Environment Variables
Store sensitive data in environment variables:
```
DB_HOST=localhost
DB_NAME=vsol_referrals
DB_USER=referral_user
DB_PASSWORD=secure_password
RECAPTCHA_SECRET_KEY=your_secret_key
```

### Monitoring
Track key metrics:
- Total referrals submitted
- Referrals per referrer
- Most active referrers
- Submission success/error rate
- Average time on page

### Analytics
Add tracking code:
```javascript
// Google Analytics example
gtag('event', 'referral_submit', {
  'event_category': 'engagement',
  'event_label': referrerName
});
```

## Optional Enhancements

### Email Notifications
Send confirmation emails to:
1. Referrer (thanking them)
2. Admin (notifying of new referral)

### Duplicate Detection
Check if referral already exists:
```sql
SELECT COUNT(*) FROM referrals 
WHERE referral_email = ? 
AND submitted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
```

### Referral Dashboard
Admin page showing:
- Recent referrals
- Top referrers
- Follow-up status
- Conversion tracking

## Support Information

If you need technical support implementing this referral system, contact:

**VSol Software**  
Email: info@vsol.software  
Phone: (352) 397-8650  
Website: www.vsol.software

## Example HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Referral Program - VSol Software</title>
  <style>
    /* Add CSS from Design Guidelines section */
  </style>
</head>
<body>
  <div class="referral-form">
    <img src="/logo.png" alt="VSol Software" class="logo">
    
    <h1 id="greeting">Thank you for your referral!</h1>
    <p class="subtitle">Help us connect with potential clients</p>
    
    <form id="referralForm">
      <div class="form-group">
        <label class="form-label" for="linkedinUrl">
          LinkedIn Profile URL <span class="required">*</span>
        </label>
        <input 
          type="url" 
          id="linkedinUrl" 
          name="linkedinUrl" 
          class="form-input"
          placeholder="https://linkedin.com/in/yourconnection"
          required
        >
        <div class="error-message" id="linkedinError"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="email">
          Email Address <span class="required">*</span>
        </label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          class="form-input"
          placeholder="email@example.com"
          required
        >
        <div class="error-message" id="emailError"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="phone">
          Phone Number <span class="optional">(optional)</span>
        </label>
        <input 
          type="tel" 
          id="phone" 
          name="phone" 
          class="form-input"
          placeholder="(555) 123-4567"
        >
      </div>
      
      <!-- Honeypot field -->
      <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
      
      <button type="submit" class="submit-button" id="submitBtn">
        Submit Referral
      </button>
    </form>
    
    <div class="success-message" id="successMessage" style="display:none;">
      ✓ Thank you for your referral!
    </div>
  </div>
  
  <script>
    // Add JavaScript from implementation examples
  </script>
</body>
</html>
```

## Summary

This referral system provides a simple, secure way for email recipients to submit referrals to VSol Software. The Base64 encoding with salt provides basic obfuscation while remaining easy to implement across different platforms. The form is designed to be user-friendly, mobile-responsive, and resistant to spam and abuse.

Key deliverables:
1. Landing page at `/referral` route
2. Backend API endpoint for form submission
3. Database table for storing referrals
4. Security measures (rate limiting, validation, spam prevention)
5. Mobile-responsive design matching VSol branding

The system should be production-ready with proper error handling, validation, and user feedback at every step.

