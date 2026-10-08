// ============================================================
// Account Management Page Logic
// ============================================================

let currentLoggedInUserId = null;

(async function init() {
  const user = await requireAuth({ adminOnly: true });
  if (!user) return;

  currentLoggedInUserId = user.id;

  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'accounts'));

  await loadAccounts();
})();

async function loadAccounts() {
  try {
    const accounts = await apiRequest('/api/accounts');
    const tbody = document.getElementById('accountsBody');

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No accounts found.</td></tr>';
      return;
    }

    tbody.innerHTML = accounts.map((acc) => {
      const isSelf = acc.id === currentLoggedInUserId;
      const createdDate = manilaDateKey(acc.created_at); // Philippine date, e.g. 2026-09-26

      return `
        <tr>
          <td>${acc.id}</td>
          <td>${acc.username}</td>
          <td>${acc.role}</td>
          <td>${createdDate}</td>
          <td>
            ${isSelf
              ? '—'
              : `<button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id}, '${acc.username}')">Delete</button>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    alert('Could not load accounts: ' + err.message);
  }
}

function openAccountModal() {
  document.getElementById('accountForm').reset();
  document.getElementById('accountErrorMsg').textContent = '';
  document.getElementById('accountModal').style.display = 'flex';
}

function closeAccountModal() {
  document.getElementById('accountModal').style.display = 'none';
}

document.getElementById('accountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorMsg = document.getElementById('accountErrorMsg');
  errorMsg.textContent = '';

  const payload = {
    username: document.getElementById('newUsername').value.trim(),
    password: document.getElementById('newPassword').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    role: document.getElementById('newRole').value
  };

  // Quick client-side check before even hitting the server
  // (the server re-checks everything too, since it can't trust the browser)
  if (payload.password !== payload.confirmPassword) {
    errorMsg.textContent = 'Password and Confirm Password do not match.';
    return;
  }

  try {
    await apiRequest('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeAccountModal();
    alert('Account created successfully.');
    await loadAccounts();
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});

async function deleteAccount(id, username) {
  if (!confirm('Are you sure you want to delete this account?')) return;

  try {
    await apiRequest(`/api/accounts/${id}`, { method: 'DELETE' });
    alert(`Account "${username}" was deleted successfully.`);
    await loadAccounts();
  } catch (err) {
    alert(err.message);
  }
}
