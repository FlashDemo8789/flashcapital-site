# Google Apps Script Setup Instructions

Follow these steps to connect your custom form to Google Sheets using your contact@flash.zone account.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) while logged in as contact@flash.zone
2. Create a new spreadsheet named "FLASH Fund Applications"
3. Copy the spreadsheet ID from the URL:
   - URL looks like: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the long string between `/d/` and `/edit`

## Step 2: Set Up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Name it "FLASH Fund Form Handler"
4. Delete all the default code
5. Copy all the code from `google-apps-script.js`
6. Update these values at the top:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Paste your ID here
   const SHEET_NAME = 'Applications'; // Keep as is
   const EMAIL_TO = 'contact@flash.zone'; // Your email
   ```

## Step 3: Deploy as Web App

1. Click "Deploy" → "New Deployment"
2. Click the gear icon → "Web app"
3. Configure:
   - Description: "FLASH Fund Form Handler"
   - Execute as: Me (contact@flash.zone)
   - Who has access: Anyone
4. Click "Deploy"
5. Copy the Web App URL (looks like: https://script.google.com/macros/s/...)
6. Click "Done"

## Step 4: Update the Form

1. Open `custom-form.html`
2. Find this line:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace with your Web App URL from Step 3

## Step 5: Test the Setup

1. In Google Apps Script, run the `testSetup()` function:
   - Select `testSetup` from the dropdown
   - Click "Run"
   - Grant permissions when prompted
2. Check your Google Sheet - you should see a test entry
3. Check your email - you should receive two emails

## Step 6: Update Your Website

Replace the Google Form link with the custom form:

1. Upload `custom-form.html` to your website
2. Update the landing page CTA buttons to link to `/custom-form.html` instead of the Google Form

## What You'll Get:

1. **Google Sheet** with all submissions:
   - Timestamp
   - First Name, Last Name
   - Email
   - Company Name, Website
   - Stage, Role, Industry
   - Timeline, Source
   - Application Status (New/Reviewed/etc)
   - Notes field for your team

2. **Email Notifications**:
   - Instant email to contact@flash.zone when someone applies
   - Confirmation email to the applicant
   - All emails include the application details

3. **Benefits**:
   - Professional form matching your site design
   - Data goes directly to your Google account
   - No third-party services needed
   - Free (uses Google's infrastructure)
   - Can add custom logic later (duplicate detection, auto-scoring, etc)

## Troubleshooting:

**Form not submitting?**
- Check browser console for errors (F12)
- Verify the Google Script URL is correct
- Make sure script is deployed as "Anyone can access"

**Not receiving emails?**
- Check spam folder
- Verify EMAIL_TO is correct in the script
- Run testSetup() to debug

**Data not appearing in sheet?**
- Check the SPREADSHEET_ID is correct
- Make sure you have edit access to the sheet
- Check Google Apps Script logs (View → Logs)

## Next Steps:

Once working, you can:
- Customize the confirmation email template
- Add more fields if needed
- Set up automatic responses based on criteria
- Create dashboards in Google Sheets
- Integrate with other Google services (Calendar, Docs, etc)