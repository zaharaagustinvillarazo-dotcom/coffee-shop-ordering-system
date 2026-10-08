// ============================================================
// Shared helper functions used by every page
// ============================================================

// Small wrapper around fetch() that always sends cookies
// (needed so the server knows who is logged in) and
// automatically converts the response to JSON.
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include' // sends the login session cookie
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

// Checks if someone is logged in. If not, sends them to the login page.
// If they ARE logged in but this page requires admin and they are not
// an admin, sends them back to the orders page instead.
async function requireAuth({ adminOnly = false } = {}) {
  try {
    const data = await apiRequest('/api/auth/session');
    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return null;
    }
    if (adminOnly && data.user.role !== 'admin') {
      alert('Admins only. Redirecting to the orders page.');
      window.location.href = 'orders.html';
      return null;
    }
    return data.user;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }
}

// Builds the sidebar navigation, showing admin-only links only to admins
function renderSidebar(user, activePage) {
  const adminLinks = `
    <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
    <a href="products.html" class="${activePage === 'products' ? 'active' : ''}">Manage Products</a>
    <a href="sales.html" class="${activePage === 'sales' ? 'active' : ''}">Sales Records</a>
    <a href="accounts.html" class="${activePage === 'accounts' ? 'active' : ''}">Account Management</a>
  `;
  const staffLinks = `
    <a href="orders.html" class="${activePage === 'orders' ? 'active' : ''}">New Order</a>
    <a href="refund-lookup.html" class="${activePage === 'refunds' ? 'active' : ''}">Refunds</a>
  `;

  return `
    <div class="sidebar">
      <div class="brand">Coffee Shop</div>
      ${user.role === 'admin' ? adminLinks + staffLinks : staffLinks}
      <div class="user-info">
        Logged in as<br>
        <strong>${user.username}</strong> (${user.role})
        <button class="logout-btn" onclick="logout()">Log out</button>
      </div>
    </div>
  `;
}

async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.location.href = 'login.html';
}

// ------------------------------------------------------------
// MONEY + DATE/TIME HELPERS (used by every page)
// ------------------------------------------------------------
// The server sends dates as plain text already in Philippine time,
// e.g. "2026-09-26 14:39:00". These helpers read that text directly.
// They never build a JavaScript Date from it, so the browser's own
// timezone can never move an order to a different day.

const APP_TIMEZONE = 'Asia/Manila';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

// Formats money as Philippine Peso, e.g. 5450 -> "₱5,450.00"
function formatPeso(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Like formatPeso, but shows "—" when there is no value
// (used for old orders that were saved before payments were recorded)
function formatPesoOrDash(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  return formatPeso(amount);
}

// Turns a date value into { year, month, day, hour, minute } in Philippine time.
function getManilaParts(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();

  // A full timestamp WITH a timezone (ends in Z or +08:00). Not expected
  // from our server anymore, but if one ever appears, convert it properly.
  if (/T.*(Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const d = new Date(text);
    if (isNaN(d.getTime())) return null;
    const parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(d).forEach((p) => { if (p.type !== 'literal') parts[p.type] = p.value; });
    return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour, minute: +parts.minute };
  }

  // Normal case: "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" (already Philippine time)
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] ? +m[4] : 0, minute: m[5] ? +m[5] : 0 };
}

// "September 26, 2026"   (or "Sep 26, 2026" with { short: true })
function formatDate(value, { short = false } = {}) {
  const p = getManilaParts(value);
  if (!p) return '—';
  const month = short ? MONTHS[p.month - 1].slice(0, 3) : MONTHS[p.month - 1];
  return `${month} ${p.day}, ${p.year}`;
}

// "2:39 PM"
function formatTime(value) {
  const p = getManilaParts(value);
  if (!p) return '—';
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const minutes = String(p.minute).padStart(2, '0');
  return `${hour12}:${minutes} ${p.hour >= 12 ? 'PM' : 'AM'}`;
}

// "Sep 26, 2026, 2:39 PM"
function formatDateTime(value) {
  if (!getManilaParts(value)) return '—';
  return `${formatDate(value, { short: true })}, ${formatTime(value)}`;
}

// "2026-09-26" - the calendar date in Philippine time
function manilaDateKey(value) {
  const p = getManilaParts(value);
  if (!p) return '';
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// Today's date in Philippine time as "YYYY-MM-DD" (NOT the UTC date,
// which would be yesterday between 12:00 AM and 8:00 AM in the Philippines)
function todayManila() {
  const parts = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).forEach((p) => { if (p.type !== 'literal') parts[p.type] = p.value; });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Makes text safe to place inside HTML (product names, usernames, etc.)
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
