/**
 * OpenProject Ticket Notification — Google Apps Script
 * Sends Google Chat DM + Gmail fallback to assignee and accountable
 * after a ticket is created.
 *
 * Deploy as: Web App
 *   Execute as: Me
 *   Who has access: Anyone with Google Account
 */

// ─── Entry point — FastAPI calls this via HTTP POST ───────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var results = [];

    var meetLink    = payload.meet_link    || '';
    var meetingTime = payload.meeting_time || '';

    if (payload.assignee_email && payload.assignee_name) {
      var r = sendNotification(
        payload.assignee_email,
        payload.assignee_name,
        'assignee',
        payload.ticket_id,
        payload.ticket_title,
        payload.ticket_url,
        payload.project,
        meetLink,
        meetingTime
      );
      results.push(r);
    }

    if (payload.accountable_email && payload.accountable_name) {
      var r2 = sendNotification(
        payload.accountable_email,
        payload.accountable_name,
        'accountable',
        payload.ticket_id,
        payload.ticket_title,
        payload.ticket_url,
        payload.project,
        meetLink,
        meetingTime
      );
      results.push(r2);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', results: results }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Build and send one notification (Gmail) ─────────────────────────────────
function sendNotification(email, name, role, ticketId, title, url, project, meetLink, meetingTime) {
  var firstName = name.split(' ')[0];
  var subject, emailBody;

  var disclaimer = '\n\n---\n'
                 + 'Note: This email is automatically triggered from the AI agent for hackathon testing purpose.';

  // Meeting section — shown whether or not a Meet link exists
  var meetingSection;
  if (meetLink) {
    meetingSection = '\n\nA meeting has been organised to discuss this ticket.\n'
                   + 'Time    : ' + (meetingTime || 'Tomorrow, 2:00 PM - 3:00 PM IST') + '\n'
                   + 'Join    : ' + meetLink;
  } else {
    meetingSection = '\n\nA meeting has been organised to discuss this ticket.\n'
                   + 'Time    : ' + (meetingTime || 'Tomorrow, 2:00 PM - 3:00 PM IST') + '\n'
                   + '(Calendar invite sent separately)';
  }

  if (role === 'assignee') {
    subject   = 'Ticket assigned to you — #' + ticketId + ': ' + title;
    emailBody = 'Hi ' + firstName + ',\n\n'
              + 'A new ticket has been assigned to you in OpenProject.\n\n'
              + 'Title   : ' + title + '\n'
              + 'Project : ' + project + '\n'
              + 'Ticket  : #' + ticketId + '\n'
              + 'URL     : ' + url
              + meetingSection + '\n\n'
              + 'Please review and update the ticket status.\n\n'
              + '— OpenProject Bot'
              + disclaimer;
  } else {
    subject   = 'You are accountable — #' + ticketId + ': ' + title;
    emailBody = 'Hi ' + firstName + ',\n\n'
              + 'You have been marked as accountable for a ticket in OpenProject.\n\n'
              + 'Title   : ' + title + '\n'
              + 'Project : ' + project + '\n'
              + 'Ticket  : #' + ticketId + '\n'
              + 'URL     : ' + url
              + meetingSection + '\n\n'
              + 'Please monitor progress and ensure timely delivery.\n\n'
              + '— OpenProject Bot'
              + disclaimer;
  }

  var sentEmail = false;

  try {
    GmailApp.sendEmail(email, subject, emailBody, { name: 'OpenProject Bot' });
    sentEmail = true;
    Logger.log('Email sent to: ' + email);
  } catch (e) {
    Logger.log('Email failed: ' + e.toString());
  }

  return {
    role: role,
    email: email,
    name: name,
    sent_chat: false,
    sent_email: sentEmail
  };
}


// ─── Test function — run this manually from Apps Script editor to verify ──────
function testNotification() {
  var result = sendNotification(
    'your.email@indiamart.com',   // ← change to your own email to test
    'Your Name',
    'assignee',
    999999,
    'Test ticket from OpenProject Bot',
    'https://project.intermesh.net/work_packages/999999',
    'Android'
  );
  Logger.log(JSON.stringify(result));
}
