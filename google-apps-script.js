// Google Apps Script Code
// Deploy this as a Web App in your Google account.

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const APPLICATION_SHEET_NAME = 'Applications';
const NEWSLETTER_SHEET_NAME = 'NewsletterSubscribers';
const EMAIL_TO = 'contact@flash.zone';

function doPost(e) {
  try {
    const data = parsePayload_(e);
    const submissionType = (data.submissionType || 'application').toLowerCase();

    if (submissionType === 'newsletter') {
      storeNewsletterSubscription_(data);
      sendNewsletterNotification_(data);
    } else {
      storeApplication_(data);
      sendApplicationNotification_(data);
      sendApplicationConfirmation_(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, submissionType: submissionType }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    return JSON.parse(e.postData.contents);
  } catch (jsonError) {
    // Handle x-www-form-urlencoded or multipart payloads.
    return e.parameter || {};
  }
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  return sheet;
}

function storeApplication_(data) {
  const headers = [
    'Submission Type',
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

  const sheet = getOrCreateSheet_(APPLICATION_SHEET_NAME, headers);
  sheet.appendRow([
    'application',
    data.timestamp || new Date().toISOString(),
    data.firstName || '',
    data.lastName || '',
    data.email || '',
    data.companyName || '',
    data.website || '',
    data.stage || '',
    data.role || '',
    data.industry || '',
    data.timeline || '',
    data.source || '',
    'New',
    ''
  ]);
}

function storeNewsletterSubscription_(data) {
  const headers = [
    'Submission Type',
    'Timestamp',
    'Email',
    'Consent',
    'Source Page',
    'Status'
  ];

  const sheet = getOrCreateSheet_(NEWSLETTER_SHEET_NAME, headers);
  sheet.appendRow([
    'newsletter',
    data.timestamp || new Date().toISOString(),
    data.email || '',
    data.consent ? 'true' : 'false',
    data.sourcePage || '',
    'Active'
  ]);
}

function sendApplicationNotification_(data) {
  const subject = 'New FLASH Fund Application: ' + (data.companyName || 'Unknown company');
  const htmlBody =
    '<div style="font-family: Arial, sans-serif; max-width: 600px;">' +
    '<h2>New Application Received</h2>' +
    '<p><strong>Name:</strong> ' + (data.firstName || '') + ' ' + (data.lastName || '') + '</p>' +
    '<p><strong>Email:</strong> ' + (data.email || '') + '</p>' +
    '<p><strong>Company:</strong> ' + (data.companyName || '') + '</p>' +
    '<p><strong>Stage:</strong> ' + (data.stage || '') + '</p>' +
    '<p><strong>Source:</strong> ' + (data.source || 'Not specified') + '</p>' +
    '</div>';

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendApplicationConfirmation_(data) {
  if (!data.email) return;

  const subject = 'Application Received - FLASH Fund';
  const htmlBody =
    '<div style="font-family: Arial, sans-serif; max-width: 600px;">' +
    '<h2>Thank you for applying to FLASH Fund.</h2>' +
    '<p>We received your application for ' + (data.companyName || 'your company') + '.</p>' +
    '<p>You should expect a response within 14 days.</p>' +
    '<p>FLASH Fund Team</p>' +
    '</div>';

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendNewsletterNotification_(data) {
  const subject = 'New FLASH Newsletter Subscriber';
  const htmlBody =
    '<div style="font-family: Arial, sans-serif; max-width: 600px;">' +
    '<h2>New Newsletter Subscription</h2>' +
    '<p><strong>Email:</strong> ' + (data.email || '') + '</p>' +
    '<p><strong>Consent:</strong> ' + (data.consent ? 'true' : 'false') + '</p>' +
    '<p><strong>Source page:</strong> ' + (data.sourcePage || '') + '</p>' +
    '</div>';

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    htmlBody: htmlBody
  });
}
