/**
 * Google Calendar + Meet integration via Apps Script Web App.
 * Copy this file into your server directory and require it.
 *
 * Requires in .env:
 *   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<id>/exec
 *
 * Usage:
 *   const { createCalendarEvent } = require('./calendar');
 *   const result = await createCalendarEvent(action);
 *
 * action.details must include:
 *   date (YYYY-MM-DD), time (HH:MM 24h), duration_min, attendees ([]),
 *   description, agenda, doc_links ([]), fallback_title
 *
 * Returns: { status, title, meetLink, eventLink, attendees, attendeeCount }
 * status values: 'done' | 'done_no_meet' | 'fallback' | 'error'
 */

async function createCalendarEvent(action) {
  const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!webhookUrl) {
    return { skipped: true, reason: 'GOOGLE_APPS_SCRIPT_URL not set in .env' };
  }

  const d = action.details || {};

  const now      = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const timeStr  = d.time || '10:00';
  const duration = d.duration_min || 30;

  // Guard against AI hallucinating past dates — auto-correct to tomorrow
  let dateStr = d.date || defaultDate;
  const parsedDate = new Date(`${dateStr}T${timeStr}:00+05:30`);
  if (parsedDate < now) {
    console.warn(`[calendar] AI returned past date ${dateStr}, using tomorrow instead`);
    dateStr = defaultDate;
  }

  const start = new Date(`${dateStr}T${timeStr}:00+05:30`);
  const end   = new Date(start.getTime() + duration * 60000);

  const descParts = [d.description || action.title];
  if (action.source) descParts.push(`\nContext: ${action.source}`);

  const payload = {
    title:          action.title,
    description:    descParts.join(''),
    agenda:         d.agenda || '',
    start:          start.toISOString(),
    end:            end.toISOString(),
    attendees:      (d.attendees || []).filter(e => e && e.includes('@')),
    doc_links:      d.doc_links || [],
    fallback_title: d.fallback_title || `Discussion: ${action.title}`
  };

  const fetch = (await import('node-fetch')).default;
  const res = await fetch(webhookUrl, {
    method:   'POST',
    headers:  { 'Content-Type': 'application/json' },
    body:     JSON.stringify(payload),
    redirect: 'follow'
  });

  const text = await res.text();
  try {
    const result = JSON.parse(text);
    // Backfill fields the Apps Script might not echo back
    if (!result.title)     result.title     = payload.title;
    if (!result.attendees || result.attendees.length === 0) result.attendees = payload.attendees;
    result.attendeeCount = result.attendees.length;
    return result;
  } catch {
    return { status: 'error', raw: text };
  }
}

module.exports = { createCalendarEvent };
