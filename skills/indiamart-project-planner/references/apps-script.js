/**
 * DEPLOY THIS AS A GOOGLE APPS SCRIPT WEB APP
 * ─────────────────────────────────────────────
 * 1. Go to https://script.google.com → New Project
 * 2. Delete all existing code, paste this entire file
 * 3. Click Services (+ icon) → add "Google Calendar API" → Save
 * 4. Deploy → New Deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Authorize when prompted
 * 6. Copy the Web App URL → paste into .env as GOOGLE_APPS_SCRIPT_URL
 *
 * Re-deploy required after ANY code changes:
 * Deploy → Manage Deployments → Edit → New version → Deploy
 * ─────────────────────────────────────────────
 */

// Change this to your org domain — attendees outside this domain are filtered out
var DOMAIN = '@yourdomain.com';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var startTime = new Date(data.start);
    var endTime   = new Date(data.end);

    // Validate dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return jsonResponse({ status: 'error', message: 'Invalid start or end time' });
    }

    // Sanitize attendees — only allow domain emails
    var rawAttendees = data.attendees || [];
    var attendees = rawAttendees.filter(function(email) {
      return typeof email === 'string' && email.indexOf(DOMAIN) !== -1;
    });

    // Build description with agenda and doc links
    var docLinks = data.doc_links || [];
    var baseDesc = data.description || data.title || 'Meeting';
    var fullDesc = baseDesc;

    if (data.agenda) {
      fullDesc += '\n\nAgenda:\n' + data.agenda;
    }

    if (docLinks.length > 0) {
      fullDesc += '\n\nRelevant Documents:\n' + docLinks.map(function(l) { return '• ' + l; }).join('\n');
    }

    fullDesc += '\n\n─\nScheduled by AI Productivity Agent';

    // Primary: Calendar API (gets real Meet link)
    try {
      var resource = {
        summary:     data.title,
        description: fullDesc,
        start:  { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
        end:    { dateTime: endTime.toISOString(),   timeZone: 'Asia/Kolkata' },
        attendees: attendees.map(function(email) { return { email: email }; }),
        conferenceData: {
          createRequest: {
            requestId: Utilities.getUuid(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email',  minutes: 60 },
            { method: 'popup',  minutes: 10 }
          ]
        }
      };

      var created = Calendar.Events.insert(resource, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });

      var meetLink = '';
      if (created.conferenceData && created.conferenceData.entryPoints) {
        for (var i = 0; i < created.conferenceData.entryPoints.length; i++) {
          if (created.conferenceData.entryPoints[i].entryPointType === 'video') {
            meetLink = created.conferenceData.entryPoints[i].uri;
            break;
          }
        }
      }

      return jsonResponse({
        status:        'done',
        eventId:       created.id,
        title:         data.title,
        meetLink:      meetLink,
        eventLink:     created.htmlLink || ('https://calendar.google.com/calendar/event?eid=' + Utilities.base64Encode(created.id || '')),
        attendees:     attendees,
        attendeeCount: attendees.length
      });

    } catch (apiErr) {
      // Fallback 1: CalendarApp (event created, no Meet link)
      // Triggered when Calendar API Advanced Service is not added
      var fallbackTitle = data.fallback_title || ('Discussion: ' + data.title);

      var opts = { description: fullDesc };
      if (attendees.length > 0) {
        opts.guests = attendees.join(',');
        opts.sendInvites = true;
      }

      var event = CalendarApp.getDefaultCalendar().createEvent(fallbackTitle, startTime, endTime, opts);

      return jsonResponse({
        status:        'done_no_meet',
        eventId:       event.getId(),
        title:         fallbackTitle,
        meetLink:      '',
        eventLink:     'https://calendar.google.com/calendar/r',
        attendees:     attendees,
        attendeeCount: attendees.length,
        note:          'Event created without Meet link. To enable Meet links, add Calendar API under Services in Apps Script.'
      });
    }

  } catch (err) {
    // Fallback 2: minimal safe event so nothing is completely lost
    try {
      var safeTitle = 'AI Agent: Discussion';
      var tomorrow  = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      var tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 30);

      CalendarApp.getDefaultCalendar().createEvent(safeTitle, tomorrow, tomorrowEnd, {
        description: 'Auto-created by AI Agent (fallback). Original error: ' + err.toString()
      });

      return jsonResponse({ status: 'fallback', message: 'Created minimal event due to error: ' + err.toString() });
    } catch (e2) {
      return jsonResponse({ status: 'error', message: err.toString() });
    }
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Test — run manually in the Apps Script editor ──────────────────────────
function testCreateEvent() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  var end = new Date(tomorrow);
  end.setMinutes(end.getMinutes() + 30);

  var mock = {
    postData: {
      contents: JSON.stringify({
        title:          'Test Meeting',
        description:    'Testing the Apps Script Web App integration.',
        agenda:         '• Item 1\n• Item 2',
        start:          tomorrow.toISOString(),
        end:            end.toISOString(),
        attendees:      ['you@yourdomain.com'],
        doc_links:      [],
        fallback_title: 'Discussion: Test'
      })
    }
  };

  Logger.log(doPost(mock).getContent());
}
