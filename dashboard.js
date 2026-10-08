// ============================================================
// Dashboard Page Logic
// ============================================================

(async function init() {
  const user = await requireAuth({ adminOnly: true });
  if (!user) return; // requireAuth already redirected

  // Inject the sidebar now that we know who is logged in
  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'dashboard'));

  await loadDashboard();
})();

async function loadDashboard() {
  try {
    const data = await apiRequest('/api/sales/dashboard');

    document.getElementById('todaySales').textContent = formatPeso(data.today_sales);
    document.getElementById('todayOrders').textContent = data.today_orders;
    document.getElementById('availableProducts').textContent = data.available_products;

    const tbody = document.getElementById('recentOrdersBody');
    if (data.recent_orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No orders yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.recent_orders.map((order) => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.cashier_name}</td>
        <td>${formatPeso(order.total_amount)}</td>
        <td>${formatDateTime(order.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Could not load dashboard: ' + err.message);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  displayGreeting();
  startClock();
});



