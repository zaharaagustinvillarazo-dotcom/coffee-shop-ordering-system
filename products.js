// ============================================================
// Manage Products Page Logic
// ============================================================

(async function init() {
  const user = await requireAuth({ adminOnly: true });
  if (!user) return;

  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'products'));

  await loadProducts();
})();

async function loadProducts() {
  try {
    const products = await apiRequest('/api/products');
    const tbody = document.getElementById('productsBody');

    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No products yet. Click "Add Product" to create one.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td>${p.product_name}</td>
        <td>${p.category}</td>
        <td>${formatPeso(p.price)}</td>
        <td>
          <span class="status-badge status-${p.status}">${p.status}</span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick='openProductModal(${JSON.stringify(p)})'>Edit</button>
          <button class="btn btn-sm ${p.status === 'available' ? 'btn-secondary' : 'btn-success'}" onclick="toggleStatus(${p.id}, '${p.status}')">
            ${p.status === 'available' ? 'Mark Unavailable' : 'Mark Available'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Could not load products: ' + err.message);
  }
}

function openProductModal(product = null) {
  document.getElementById('modalTitle').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('productId').value = product ? product.id : '';
  document.getElementById('productName').value = product ? product.product_name : '';
  document.getElementById('productCategory').value = product ? product.category : 'Coffee';
  document.getElementById('productPrice').value = product ? product.price : '';
  document.getElementById('productStatus').value = product ? product.status : 'available';
  document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const payload = {
    product_name: document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value),
    status: document.getElementById('productStatus').value
  };

  try {
    if (id) {
      await apiRequest(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiRequest('/api/products', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    alert('Could not save product: ' + err.message);
  }
});

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
  try {
    await apiRequest(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    await loadProducts();
  } catch (err) {
    alert('Could not update status: ' + err.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}
