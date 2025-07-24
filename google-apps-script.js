// Google Apps Script Code
// Deploy this as a Web App in your Google Account

// CONFIGURATION - Update these values
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Get from Google Sheets URL
const SHEET_NAME = 'Applications'; // Name of the sheet tab
const EMAIL_TO = 'contact@flash.zone'; // Where to send notifications

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // If sheet doesn't exist, create it with headers
    if (!sheet) {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const newSheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Add headers
      const headers = [
        'Timestamp',
        'First Name',
        'Last Name',
        'Email',
        'Company Name',
        'Website',
        'Stage',
        'Role',
        'Industry',
        'Timeline',
        'Source',
        'Application Status',
        'Notes'
      ];
      
      newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      newSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet = newSheet;
    }
    
    // Prepare row data
    const rowData = [
      data.timestamp,
      data.firstName,
      data.lastName,
      data.email,
      data.companyName,
      data.website,
      data.stage,
      data.role,
      data.industry,
      data.timeline,
      data.source,
      'New', // Application Status
      '' // Notes
    ];
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Send email notification
    sendEmailNotification(data);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendEmailNotification(data) {
  const subject = `New FLASH Fund Application: ${data.companyName}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>New Application Received</h2>
      
      <h3>Applicant Information:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td>
        </tr>
      </table>
      
      <h3>Company Information:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Website:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.website || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Stage:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.stage}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Role:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.role}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Industry:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.industry}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timeline:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.timeline}</td>
        </tr>
      </table>
      
      <h3>Additional Information:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Source:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.source || 'Not specified'}</td>
        </tr>
      </table>
      
      <p style="margin-top: 20px;">
        <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" 
           style="background: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View in Google Sheets
        </a>
      </p>
    </div>
  `;
  
  // Send email
  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    htmlBody: htmlBody
  });
  
  // Optional: Send confirmation email to applicant
  sendConfirmationEmail(data);
}

function sendConfirmationEmail(data) {
  const subject = 'Application Received - FLASH Fund';
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Thank you for applying to FLASH Fund!</h2>
      
      <p>Hi ${data.firstName},</p>
      
      <p>We've received your application for ${data.companyName}. Here's what happens next:</p>
      
      <ol>
        <li><strong>Initial Review (Days 1-3):</strong> Our AI analyzes your metrics against successful patterns</li>
        <li><strong>Deep Dive (Days 4-10):</strong> If you pass initial screening, we review your materials in detail</li>
        <li><strong>Decision (Day 14):</strong> You'll receive either a term sheet or specific feedback on what to improve</li>
      </ol>
      
      <p><strong>Your Application Summary:</strong></p>
      <ul>
        <li>Company: ${data.companyName}</li>
        <li>Stage: ${data.stage}</li>
        <li>Industry: ${data.industry}</li>
        <li>Team Size: ${data.teamSize}</li>
        <li>Monthly Revenue: $${data.monthlyRevenue}</li>
      </ul>
      
      <p>If you have any questions, reply to this email or contact us at contact@flash.zone</p>
      
      <p>Best regards,<br>
      The FLASH Fund Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      
      <p style="font-size: 12px; color: #666;">
        FLASH Fund | $25K-$100K for seed startups<br>
        No warm intros. No bullshit. Just data.
      </p>
    </div>
  `;
  
  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

// Test function to verify setup
function testSetup() {
  const testData = {
    timestamp: new Date().toISOString(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1234567890',
    companyName: 'Test Company',
    website: 'https://test.com',
    stage: 'Seed',
    industry: 'SaaS',
    monthlyRevenue: '10000',
    teamSize: '5',
    location: 'San Francisco, USA',
    pitchDeck: 'https://drive.google.com/test',
    linkedin: 'https://linkedin.com/in/test',
    howHeard: 'Google'
  };
  
  // Try to add to sheet
  doPost({postData: {contents: JSON.stringify(testData)}});
  
  console.log('Test completed! Check your spreadsheet and email.');
}