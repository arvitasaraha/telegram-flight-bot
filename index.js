require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not set in environment');
if (!SERPAPI_KEY) throw new Error('SERPAPI_API_KEY is not set in environment');

const bot = new Telegraf(BOT_TOKEN);

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december'
];

// Common city-name → IATA mappings for friendlier input
const CITY_TO_IATA = {
  'helsinki': 'HEL', 'helsinki-vantaa': 'HEL',
  'london': 'LHR', 'heathrow': 'LHR', 'gatwick': 'LGW',
  'paris': 'CDG', 'amsterdam': 'AMS', 'frankfurt': 'FRA',
  'dubai': 'DXB', 'doha': 'DOH', 'istanbul': 'IST',
  'tokyo': 'NRT', 'narita': 'NRT', 'haneda': 'HND',
  'seoul': 'ICN', 'incheon': 'ICN', 'gimpo': 'GMP',
  'bangkok': 'BKK', 'singapore': 'SIN', 'hong kong': 'HKG',
  'beijing': 'PEK', 'shanghai': 'PVG',
  'new york': 'JFK', 'los angeles': 'LAX', 'chicago': 'ORD',
  'sydney': 'SYD', 'melbourne': 'MEL',
  'madrid': 'MAD', 'barcelona': 'BCN', 'rome': 'FCO',
  'stockholm': 'ARN', 'oslo': 'OSL', 'copenhagen': 'CPH',
  'tallinn': 'TLL', 'riga': 'RIX', 'vilnius': 'VNO',
  'toronto': 'YYZ', 'vancouver': 'YVR',
};

const WELCOME_MSG = `✈️ *Flight Search Bot*

I search Google Flights and return live results.

*How to use:*
Just send a message like:
  • \`flights HEL to ICN in February\`
  • \`flights from Helsinki to Seoul in March\`
  • \`HEL ICN February\`

You can use airport codes (HEL, ICN) or city names (Helsinki, Seoul).

*Commands:*
/start — show this message
/help — show this message`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a user-provided location string to an IATA code.
 * Accepts a 3-letter IATA code directly, or a city name via lookup.
 */
function resolveIATA(raw) {
  const s = raw.trim().toLowerCase();
  if (/^[a-z]{3}$/.test(s)) return s.toUpperCase();
  return CITY_TO_IATA[s] || null;
}

/**
 * Parse a user message into { origin, destination, date }.
 * Returns null if parsing fails.
 *
 * Accepted patterns (case-insensitive):
 *   flights [from] <orig> to <dest> in <month>
 *   <orig> <dest> <month>
 */
function parseQuery(text) {
  const t = text.trim().toLowerCase();

  // Pattern 1: "flights [from] ORIG to DEST in MONTH [YEAR]"
  const p1 = /(?:flights?\s+)?(?:from\s+)?([a-z\s]+?)\s+to\s+([a-z\s]+?)\s+in\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
  const m1 = t.match(p1);
  if (m1) {
    const origin = resolveIATA(m1[1].trim());
    const dest   = resolveIATA(m1[2].trim());
    const month  = m1[3].toLowerCase();
    const year   = m1[4] ? parseInt(m1[4], 10) : null;
    if (origin && dest) return { origin, destination: dest, date: resolveDate(month, year) };
  }

  // Pattern 2: "ORIG DEST MONTH [YEAR]" (short form, e.g. "HEL ICN February")
  const p2 = /^([a-z]{3})\s+([a-z]{3})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?$/i;
  const m2 = t.match(p2);
  if (m2) {
    const year = m2[4] ? parseInt(m2[4], 10) : null;
    return {
      origin:      m2[1].toUpperCase(),
      destination: m2[2].toUpperCase(),
      date:        resolveDate(m2[3].toLowerCase(), year),
    };
  }

  return null;
}

/**
 * Given a month name (lowercase) and optional year, return the first day of
 * the next future occurrence of that month as "YYYY-MM-DD".
 */
function resolveDate(monthName, year) {
  const monthIndex = MONTH_NAMES.indexOf(monthName); // 0-based
  const now = new Date();
  let y = year || now.getFullYear();
  // If the month+year is already in the past, advance to next year
  const candidate = new Date(y, monthIndex, 1);
  if (candidate <= now) y += 1;
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${y}-${mm}-01`;
}

/**
 * Call SerpAPI Google Flights and return the raw JSON response.
 */
async function searchFlights(origin, destination, date) {
  const params = new URLSearchParams({
    engine:        'google_flights',
    departure_id:  origin,
    arrival_id:    destination,
    outbound_date: date,
    type:          '2',       // one-way
    currency:      'EUR',
    hl:            'en',
    api_key:       SERPAPI_KEY,
  });
  const url = `https://serpapi.com/search?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `SerpAPI error ${res.status}`);
  }
  return res.json();
}

/**
 * Convert total minutes to "Xh Ym".
 */
function fmtDuration(mins) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Format a single flight option into a short text block.
 */
function fmtFlight(f, index) {
  const legs     = f.flights;
  const airline  = [...new Set(legs.map(l => l.airline))].join(' + ');
  const flightNo = legs.map(l => l.flight_number).join(', ');
  const departs  = legs[0].departure_airport.time.slice(11, 16);   // HH:MM
  const arrives  = legs[legs.length - 1].arrival_airport.time.slice(11, 16);
  const stops    = legs.length - 1;
  const stopTxt  = stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`;
  const duration = fmtDuration(f.total_duration);
  const price    = `€${f.price}`;

  return `${index}. *${airline}* (${flightNo})\n   ${departs} → ${arrives} · ${duration} · ${stopTxt} · *${price}*`;
}

/**
 * Build a complete reply message from a SerpAPI response.
 */
function buildReply(data, origin, destination, date) {
  const best  = data.best_flights  || [];
  const other = data.other_flights || [];
  const all   = [...best, ...other];

  if (all.length === 0) {
    return `No flights found for ${origin} → ${destination} on ${date}.`;
  }

  // Sort by price, take top 5
  const top5 = all.sort((a, b) => a.price - b.price).slice(0, 5);

  const header = `✈️ *${origin} → ${destination}*  |  ${date}\n\n`;
  const rows   = top5.map((f, i) => fmtFlight(f, i + 1)).join('\n\n');
  const footer = `\n\n_Prices in EUR · One-way · Source: Google Flights_`;

  return header + rows + footer;
}

// ── Bot handlers ─────────────────────────────────────────────────────────────

bot.start(ctx => ctx.replyWithMarkdown(WELCOME_MSG));
bot.help(ctx  => ctx.replyWithMarkdown(WELCOME_MSG));

bot.on('text', async ctx => {
  const text = ctx.message.text.trim();

  // Ignore commands that aren't /start or /help
  if (text.startsWith('/')) return;

  const query = parseQuery(text);

  if (!query) {
    return ctx.reply(
      `Sorry, I couldn't understand that.\n\nTry:\n  flights HEL to ICN in February\n  flights from Helsinki to Seoul in March`
    );
  }

  // Send a "searching…" placeholder while the API call is in flight
  const placeholder = await ctx.reply('🔍 Searching flights…');

  try {
    const data  = await searchFlights(query.origin, query.destination, query.date);
    const reply = buildReply(data, query.origin, query.destination, query.date);

    await ctx.telegram.deleteMessage(ctx.chat.id, placeholder.message_id).catch(() => {});
    await ctx.replyWithMarkdown(reply);
  } catch (err) {
    await ctx.telegram.deleteMessage(ctx.chat.id, placeholder.message_id).catch(() => {});
    console.error('SerpAPI error:', err.message);
    await ctx.reply(`❌ Search failed: ${err.message}`);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

bot.launch({ allowedUpdates: ['message'] });
console.log('Bot is running (polling mode)…');

// Graceful shutdown
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
