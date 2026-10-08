// ============================================================
// Login Page Logic
// ============================================================

// If someone is already logged in, skip the login page.
(async function checkExistingSession() {
  try {
    const data = await apiRequest('/api/auth/session');
    if (data.loggedIn) {
      window.location.href = data.user.role === 'admin' ? 'dashboard.html' : 'orders.html';
    }
  } catch (err) {
    // ignore - just stay on the login page
  }
})();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    // Send admins to the dashboard, cashiers straight to the POS screen
    window.location.href = data.user.role === 'admin' ? 'dashboard.html' : 'orders.html';
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});
