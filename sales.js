// ============================================================
// Sales Records Page Logic
// ============================================================

(async function init() {
  const user = await requireAuth({ adminOnly: true });
  if (!user) return;

  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'sales'));
  ensureRefundModalsExist();

  // Default the date picker to today's date in the Philippines
  // (NOT new Date().toISOString(), which is the UTC date and would
  // show yesterday between 12:00 AM and 8:00 AM Philippine time)
  document.getElementById('dateFilter').value = todayManila();

  await loadSalesForDate();
  await loadHistory();
})();

// Lets a daily-history row jump straight to that date's order list
function viewOrdersForDate(dateKey) {
  document.getElementById('dateFilter').value = dateKey;
  loadSalesForDate();
  document.getElementById('ordersTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Opens the shared order-detail modal, and refreshes this page's
// figures afterwards in case a refund was approved while it was open
function viewOrder(orderId) {
  openOrderDetail(orderId, {
    onChanged: () => { loadSalesForDate(); loadHistory(); }
  });
}

async function loadSalesForDate() {
  const date = document.getElementById('dateFilter').value;
  if (!date) return;

  try {
    const data = await apiRequest(`/api/sales/by-date?date=${date}`);

    const prettyDate = formatDate(date);
    document.getElementById('salesLabel').textContent = `Total Sales (${prettyDate})`;
    document.getElementById('ordersTitle').textContent = `Orders for ${prettyDate}`;
    document.getElementById('dateTotalSales').textContent = formatPeso(data.total_sales);
    document.getElementById('dateTotalRefunds').textContent = formatPeso(data.total_refunds);
    document.getElementById('dateNetSales').textContent = formatPeso(data.net_sales);
    document.getElementById('dateTotalOrders').textContent = data.total_orders;

    const tbody = document.getElementById('dateOrdersBody');
    if (data.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">No orders on this date.</td></tr>';
      return;
    }

    // Old orders (made before payments were recorded) have no
    // amount received / change, so those cells show "—"
    tbody.innerHTML = data.orders.map((order) => `
      <tr class="clickable-row" onclick="viewOrder(${order.id})">
        <td>#${order.id}</td>
        <td>${escapeHtml(order.cashier_name)}</td>
        <td>${formatPeso(order.total_amount)}</td>
        <td>${formatPesoOrDash(order.amount_received)}</td>
        <td>${formatPesoOrDash(order.change_amount)}</td>
        <td>${formatDate(order.created_at)}</td>
        <td>${formatTime(order.created_at)}</td>
        <td>${statusBadge(order.status)}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Could not load sales: ' + err.message);
  }
}

function statusBadge(status) {
  const cls = { 'Completed': 'status-completed', 'Refunded': 'status-refunded',
                'Partially Refunded': 'status-partial', 'Cancelled': 'status-cancelled' }[status] || 'status-completed';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

async function loadHistory() {
  try {
    const history = await apiRequest('/api/sales/history');
    const tbody = document.getElementById('historyBody');

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No sales history yet.</td></tr>';
      return;
    }

    tbody.innerHTML = history.map((row) => `
      <tr class="clickable-row" onclick="viewOrdersForDate('${row.date}')">
        <td>${formatDate(row.date)}</td>
        <td>${row.total_orders}</td>
        <td>${formatPeso(row.total_sales)}</td>
        <td>${row.total_refunds > 0 ? '-' + formatPeso(row.total_refunds) : formatPeso(0)}</td>
        <td>${formatPeso(row.net_sales)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}
