// ============================================================
// Shared Refund + Order-Detail UI
// ============================================================
// Used by BOTH:
//   - sales.js      (admin: click a daily total -> click an order)
//   - refunds.js's own page (refund-lookup.html: cashier looks up
//     one order by number)
// Keeping this in one file means the order-detail view and the
// refund flow look and behave identically everywhere they appear.
// ============================================================

// Builds the modal markup once and attaches it to the page.
// Safe to call more than once (it only inserts the modals the
// first time).
function ensureRefundModalsExist() {
  if (document.getElementById('orderDetailModal')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <!-- Order Detail Modal -->
    <div class="modal-overlay" id="orderDetailModal" style="display:none;">
      <div class="modal-box order-detail-box">
        <div class="toolbar" style="margin-bottom:10px;">
          <h3 style="margin:0;">Order Details</h3>
          <button class="btn btn-secondary btn-sm" onclick="closeOrderDetailModal()">Close</button>
        </div>
        <div id="orderDetailContent">Loading...</div>
      </div>
    </div>

    <!-- Step 1: Refund Request -->
    <div class="modal-overlay" id="refundRequestModal" style="display:none;">
      <div class="modal-box">
        <h3 id="refundRequestTitle">Refund Order</h3>
        <div id="refundRequestItems" class="refund-items-preview"></div>
        <div class="refund-amount-row">
          <span>Refund Amount</span>
          <span id="refundRequestAmount">₱0.00</span>
        </div>
        <label>Reason</label>
        <input type="text" id="refundReason" placeholder="e.g. Customer changed their mind" />
        <div class="error-msg" id="refundRequestError"></div>
        <div class="modal-actions">
          <button class="btn btn-danger" id="refundRequestSubmitBtn">Request Refund</button>
          <button class="btn btn-secondary" onclick="closeRefundRequestModal()">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Step 2: Admin Approval -->
    <div class="modal-overlay" id="adminApprovalModal" style="display:none;">
      <div class="modal-box">
        <h3>Admin Approval Required</h3>
        <p class="admin-approval-note">An administrator must enter their own login to approve this refund.</p>
        <label>Admin Username</label>
        <input type="text" id="approvalAdminUsername" autocomplete="off" />
        <label>Admin Password</label>
        <input type="password" id="approvalAdminPassword" autocomplete="off" />
        <div class="error-msg" id="approvalError"></div>
        <div class="modal-actions">
          <button class="btn btn-success" id="approvalSubmitBtn">Approve Refund</button>
          <button class="btn btn-secondary" id="approvalCancelBtn">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Refund Record Details (from the Refund Records table) -->
    <div class="modal-overlay" id="refundDetailModal" style="display:none;">
      <div class="modal-box order-detail-box">
        <div class="toolbar" style="margin-bottom:10px;">
          <h3 style="margin:0;">Refund Details</h3>
          <button class="btn btn-secondary btn-sm" onclick="closeRefundDetailModal()">Close</button>
        </div>
        <div id="refundDetailContent">Loading...</div>
      </div>
    </div>
  `);

  document.getElementById('refundRequestSubmitBtn').addEventListener('click', submitRefundRequest);
  document.getElementById('approvalSubmitBtn').addEventListener('click', submitAdminApproval);
  document.getElementById('approvalCancelBtn').addEventListener('click', () => {
    closeAdminApprovalModal();
    // the refund request itself is still PENDING - let the cashier decide
    // whether to retry approval or cancel it from the order detail view
  });
}

// What the caller wants done after the order-detail modal next refreshes
// (e.g. "also refresh the sales table behind it")
let onOrderDetailChanged = null;
let currentOrderId = null;
let currentRefundId = null;

// ------------------------------------------------------------
// ORDER DETAIL
// ------------------------------------------------------------
async function openOrderDetail(orderId, { onChanged = null } = {}) {
  ensureRefundModalsExist();
  onOrderDetailChanged = onChanged;
  currentOrderId = orderId;
  document.getElementById('orderDetailModal').style.display = 'flex';
  document.getElementById('orderDetailContent').innerHTML = 'Loading...';
  await refreshOrderDetail();
}

function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').style.display = 'none';
  if (onOrderDetailChanged) onOrderDetailChanged();
}

async function refreshOrderDetail() {
  try {
    const order = await apiRequest(`/api/orders/${currentOrderId}`);
    document.getElementById('orderDetailContent').innerHTML = renderOrderDetail(order);
    const btn = document.getElementById('refundOrderBtn');
    if (btn) btn.addEventListener('click', () => openRefundRequest(order));
  } catch (err) {
    document.getElementById('orderDetailContent').innerHTML = `<p>Could not load order: ${escapeHtml(err.message)}</p>`;
  }
}

function statusBadgeClass(status) {
  return {
    'Completed': 'status-completed',
    'Refunded': 'status-refunded',
    'Partially Refunded': 'status-partial',
    'Cancelled': 'status-cancelled'
  }[status] || 'status-completed';
}

function renderOrderDetail(order) {
  const itemsRows = order.items.map((i) => `
    <tr>
      <td>${escapeHtml(i.product_name)}</td>
      <td class="rc-num">${i.quantity}</td>
      <td class="rc-num">${formatPeso(i.price)}</td>
      <td class="rc-num">${formatPeso(i.subtotal)}</td>
      <td class="rc-num">${i.refunded_quantity > 0 ? i.refunded_quantity : '—'}</td>
    </tr>
  `).join('');

  const refundHistory = order.refunds.length === 0 ? '' : `
    <h4 style="margin-bottom:6px;">Refund History</h4>
    <table style="margin-bottom:10px;">
      <thead><tr><th>Requested</th><th>By</th><th>Amount</th><th>Reason</th><th>Status</th><th>Approved By</th></tr></thead>
      <tbody>
        ${order.refunds.map((r) => `
          <tr>
            <td>${formatDateTime(r.requested_at)}</td>
            <td>${escapeHtml(r.requested_by_name)}</td>
            <td>${formatPeso(r.refund_amount)}</td>
            <td>${escapeHtml(r.reason)}</td>
            <td><span class="status-badge ${statusBadgeClass(r.status === 'APPROVED' ? 'Refunded' : '')}">${r.status}</span></td>
            <td>${r.approved_by_name ? escapeHtml(r.approved_by_name) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return `
    <div class="order-detail-meta">
      <div><span>Order #:</span><span>${order.id}</span></div>
      <div><span>Date:</span><span>${formatDate(order.created_at)}</span></div>
      <div><span>Time:</span><span>${formatTime(order.created_at)}</span></div>
      <div><span>Cashier:</span><span>${escapeHtml(order.cashier_name)}</span></div>
      <div><span>Status:</span><span class="status-badge ${statusBadgeClass(order.status)}">${order.status}</span></div>
    </div>

    <table style="margin:12px 0;">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th><th>Refunded</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="order-detail-totals">
      <div><span>Total</span><span>${formatPeso(order.total_amount)}</span></div>
      <div><span>Amount Received</span><span>${formatPesoOrDash(order.amount_received)}</span></div>
      <div><span>Change</span><span>${formatPesoOrDash(order.change_amount)}</span></div>
      ${order.refunded_amount > 0 ? `<div class="refund-negative"><span>Refunded</span><span>-${formatPeso(order.refunded_amount)}</span></div>` : ''}
      ${order.refunded_amount > 0 ? `<div class="net-sales-row"><span>Net Sales</span><span>${formatPeso(order.net_amount)}</span></div>` : ''}
    </div>

    ${refundHistory}

    ${order.refundable
      ? `<button class="btn btn-danger" id="refundOrderBtn" style="width:100%;">Refund Order</button>`
      : `<p style="color:var(--gray); font-size:13px;">${order.order_status === 'cancelled' ? 'This order is cancelled.' : 'This order has already been fully refunded.'}</p>`}
  `;
}

// ------------------------------------------------------------
// REFUND RECORD DETAILS (clicking a row in "Refund Records")
// ------------------------------------------------------------
async function openRefundDetail(refundId) {
  ensureRefundModalsExist();
  document.getElementById('refundDetailModal').style.display = 'flex';
  document.getElementById('refundDetailContent').innerHTML = 'Loading...';
  try {
    const refund = await apiRequest(`/api/refunds/${refundId}`);
    document.getElementById('refundDetailContent').innerHTML = renderRefundDetail(refund);
  } catch (err) {
    document.getElementById('refundDetailContent').innerHTML = `<p>Could not load refund: ${escapeHtml(err.message)}</p>`;
  }
}

function closeRefundDetailModal() {
  document.getElementById('refundDetailModal').style.display = 'none';
}

function refundStatusClass(status) {
  return { PENDING: 'status-partial', APPROVED: 'status-completed', REJECTED: 'status-refunded', CANCELLED: 'status-cancelled' }[status] || 'status-partial';
}

function renderRefundDetail(refund) {
  const itemsList = refund.items.length === 0 ? '' : `
    <h4 style="margin-bottom:6px;">Items Refunded</h4>
    <table style="margin-bottom:10px;">
      <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>
        ${refund.items.map((i) => `<tr><td>${escapeHtml(i.product_name)}</td><td class="rc-num">${i.quantity}</td><td class="rc-num">${formatPeso(i.amount)}</td></tr>`).join('')}
      </tbody>
    </table>
  `;

  return `
    <div class="order-detail-meta" style="grid-template-columns:1fr 1fr;">
      <div><span>Refund ID:</span><span>#${refund.id}</span></div>
      <div><span>Order #:</span><span>#${refund.order_id}</span></div>
      <div><span>Original Order Date:</span><span>${formatDate(refund.order_created_at)}</span></div>
      <div><span>Original Order Time:</span><span>${formatTime(refund.order_created_at)}</span></div>
      <div><span>Requested By:</span><span>${escapeHtml(refund.requested_by_name)}</span></div>
      <div><span>Approved By:</span><span>${refund.approved_by_name ? escapeHtml(refund.approved_by_name) : '—'}</span></div>
      <div><span>Refund Amount:</span><span>${formatPeso(refund.refund_amount)}</span></div>
      <div><span>Status:</span><span class="status-badge ${refundStatusClass(refund.status)}">${refund.status}</span></div>
      <div><span>Requested Date:</span><span>${formatDate(refund.requested_at)}</span></div>
      <div><span>Requested Time:</span><span>${formatTime(refund.requested_at)}</span></div>
      ${refund.approved_at ? `<div><span>Approved Date:</span><span>${formatDate(refund.approved_at)}</span></div>` : ''}
      ${refund.approved_at ? `<div><span>Approved Time:</span><span>${formatTime(refund.approved_at)}</span></div>` : ''}
    </div>

    <p style="margin:12px 0;"><strong>Reason:</strong> ${escapeHtml(refund.reason)}</p>

    ${itemsList}

    <button class="btn btn-secondary" style="width:100%;" onclick="closeRefundDetailModal(); openOrderDetail(${refund.order_id});">View Full Order</button>
  `;
}

// ------------------------------------------------------------
// STEP 1: REFUND REQUEST
// ------------------------------------------------------------
function openRefundRequest(order) {
  const remaining = order.items.filter((i) => i.remaining_quantity > 0);
  const amount = remaining.reduce((sum, i) => sum + i.price * i.remaining_quantity, 0);

  document.getElementById('refundRequestTitle').textContent = `Refund Order #${order.id}`;
  document.getElementById('refundRequestItems').innerHTML = remaining.map((i) => `
    <div class="refund-item-line">
      <span>${escapeHtml(i.product_name)} x${i.remaining_quantity}</span>
      <span>${formatPeso(i.price * i.remaining_quantity)}</span>
    </div>
  `).join('');
  document.getElementById('refundRequestAmount').textContent = formatPeso(amount);
  document.getElementById('refundReason').value = '';
  document.getElementById('refundRequestError').textContent = '';
  document.getElementById('refundRequestModal').style.display = 'flex';
}

function closeRefundRequestModal() {
  document.getElementById('refundRequestModal').style.display = 'none';
}

async function submitRefundRequest() {
  const errorEl = document.getElementById('refundRequestError');
  const reason = document.getElementById('refundReason').value.trim();
  if (!reason) {
    errorEl.textContent = 'Please enter a reason for the refund.';
    return;
  }

  try {
    const result = await apiRequest('/api/refunds', {
      method: 'POST',
      body: JSON.stringify({ order_id: currentOrderId, reason })
    });
    currentRefundId = result.refund_id;
    closeRefundRequestModal();
    openAdminApproval(result);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// ------------------------------------------------------------
// STEP 2: ADMIN APPROVAL
// ------------------------------------------------------------
function openAdminApproval(refund) {
  document.getElementById('approvalAdminUsername').value = '';
  document.getElementById('approvalAdminPassword').value = '';
  document.getElementById('approvalError').textContent = '';
  document.getElementById('adminApprovalModal').style.display = 'flex';
  document.getElementById('approvalAdminUsername').focus();
}

function closeAdminApprovalModal() {
  document.getElementById('adminApprovalModal').style.display = 'none';
}

async function submitAdminApproval() {
  const errorEl = document.getElementById('approvalError');
  const admin_username = document.getElementById('approvalAdminUsername').value.trim();
  const admin_password = document.getElementById('approvalAdminPassword').value;

  if (!admin_username || !admin_password) {
    errorEl.textContent = 'Admin username and password are required.';
    return;
  }

  const btn = document.getElementById('approvalSubmitBtn');
  btn.disabled = true;
  try {
    await apiRequest(`/api/refunds/${currentRefundId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ admin_username, admin_password })
    });
    closeAdminApprovalModal();
    alert('Refund approved successfully.');
    await refreshOrderDetail();
  } catch (err) {
    errorEl.textContent = err.message;
    // clear just the password so they can retry without retyping the username
    document.getElementById('approvalAdminPassword').value = '';
  } finally {
    btn.disabled = false;
  }
}
