// ============================================================
// Refunds Page Logic (order lookup, for cashiers and admins)
// ============================================================
// This page is deliberately minimal: it does NOT show totals,
// revenue, or every order like the admin Sales Records page -
// just enough to find one order and act on it.
// ============================================================

(async function init() {
  const user = await requireAuth({ adminOnly: false });
  if (!user) return;

  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'refunds'));
  ensureRefundModalsExist();


  // Refund Records:
  // Search filters instantly on the currently loaded records.
  // Date filter re-queries the server.
  document.getElementById('refundSearchText').addEventListener('input', renderRefundRecords);
  document.getElementById('refundDateFilter').addEventListener('change', loadRefundRecords);

  document.getElementById('clearRefundFiltersBtn').addEventListener('click', () => {
    document.getElementById('refundSearchText').value = '';
    document.getElementById('refundDateFilter').value = '';
    loadRefundRecords();
  });

  await loadRefundRecords();
})();

async function findOrder() {
  const errorEl = document.getElementById('lookupError');
  errorEl.textContent = '';

  const raw = document.getElementById('orderNumberInput').value.trim();
  const orderId = Number(raw);
  if (!raw || !Number.isInteger(orderId) || orderId < 1) {
    errorEl.textContent = 'Please enter a valid order number.';
    return;
  }

  try {
    // openOrderDetail fetches the order itself, so this call also
    // doubles as the "does this order exist" check.
    await openOrderDetail(orderId, { onChanged: loadRefundRecords });
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// ------------------------------------------------------------
// REFUND RECORDS (below the search box)
// ------------------------------------------------------------
let allRefundRecords = [];

async function loadRefundRecords() {
  const tbody = document.getElementById('refundRecordsBody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  const date = document.getElementById('refundDateFilter').value;
  const params = new URLSearchParams();

  if (date) params.set('date', date);

  try {
    allRefundRecords = await apiRequest(
      `/api/refunds${params.toString() ? '?' + params.toString() : ''}`
    );
    renderRefundRecords();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Could not load refund records: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderRefundRecords() {
  const tbody = document.getElementById('refundRecordsBody');
  const search = document.getElementById('refundSearchText').value.trim().toLowerCase();

const visibleRefundRecords = allRefundRecords.filter(
  (r) => r.status !== 'PENDING'
);

const rows = !search
  ? visibleRefundRecords
  : visibleRefundRecords.filter((r) =>
      String(r.order_id).includes(search) ||
      r.requested_by_name.toLowerCase().includes(search) ||
      (r.approved_by_name &&
        r.approved_by_name.toLowerCase().includes(search))
    );
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No refund records found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r) => `
    <tr class="clickable-row" onclick="openRefundDetail(${r.id})">
      <td>${formatDate(r.requested_at)}</td>
      <td>#${r.order_id}</td>
      <td>${escapeHtml(r.requested_by_name)}</td>
      <td>${r.approved_by_name ? escapeHtml(r.approved_by_name) : '—'}</td>
      <td>${formatPeso(r.refund_amount)}</td>
      <td><span class="status-badge ${refundStatusClass(r.status)}">${r.status}</span></td>
    </tr>
  `).join('');
}
