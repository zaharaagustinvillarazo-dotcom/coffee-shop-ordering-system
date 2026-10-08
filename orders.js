// ============================================================
// New Order (POS) Page Logic
// ============================================================

let allProducts = [];
let currentCategory = 'All';

// cart is an object: { productId: { product, quantity } }
let cart = {};

(async function init() {
  const user = await requireAuth({ adminOnly: false });
  if (!user) return;

  document.getElementById('appLayout').insertAdjacentHTML('afterbegin', renderSidebar(user, 'orders'));

  await loadProducts();
  setupCategoryFilters();

  document.getElementById('completeOrderBtn').addEventListener('click', completeOrder);

  // Change updates instantly while the cashier types
  const amountInput = document.getElementById('amountReceived');
  amountInput.addEventListener('input', updatePaymentUI);
  amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') completeOrder();
  });

  document.getElementById('printReceiptBtn').addEventListener('click', () => window.print());
  document.getElementById('newOrderBtn').addEventListener('click', () => {
    document.getElementById('successModal').style.display = 'none';
    amountInput.focus();
  });

  updatePaymentUI();
})();

async function loadProducts() {
  try {
    // Only show products marked "available" to the cashier
    allProducts = await apiRequest('/api/products?onlyAvailable=true');
    renderProductGrid();
  } catch (err) {
    document.getElementById('productGrid').innerHTML = `<p>Could not load products: ${err.message}</p>`;
  }
}

function setupCategoryFilters() {
  const buttons = document.querySelectorAll('#categoryFilters button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderProductGrid();
    });
  });
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  const filtered = currentCategory === 'All'
    ? allProducts
    : allProducts.filter((p) => p.category === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = '<p>No products in this category.</p>';
    return;
  }

  grid.innerHTML = filtered.map((p) => `
    <div class="product-card" onclick="addToCart(${p.id})">
      <div class="category-tag">${p.category}</div>
      <div class="name">${p.product_name}</div>
      <div class="price">${formatPeso(p.price)}</div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  if (cart[productId]) {
    cart[productId].quantity += 1;
  } else {
    cart[productId] = { product, quantity: 1 };
  }
  renderCart();
}

function changeQuantity(productId, delta) {
  if (!cart[productId]) return;
  cart[productId].quantity += delta;
  if (cart[productId].quantity <= 0) {
    delete cart[productId];
  }
  renderCart();
}

function removeFromCart(productId) {
  delete cart[productId];
  renderCart();
}

// Cart total in whole centavos (integers), so decimals never drift
function getCartTotalCents() {
  return Object.values(cart).reduce(
    (sum, { product, quantity }) => sum + Math.round(Number(product.price) * 100) * quantity, 0
  );
}

function renderCart() {
  const cartItemsEl = document.getElementById('cartItems');
  const entries = Object.values(cart);

  if (entries.length === 0) {
    cartItemsEl.innerHTML = '<div class="empty-cart-msg">Cart is empty. Click a product to add it.</div>';
    document.getElementById('cartTotal').textContent = formatPeso(0);
    updatePaymentUI();
    return;
  }

  cartItemsEl.innerHTML = entries.map(({ product, quantity }) => {
    const subtotal = product.price * quantity;
    return `
      <div class="cart-item">
        <div>
          <div>${product.product_name}</div>
          <div style="color:#8d8d8d; font-size:12px;">${formatPeso(product.price)} x ${quantity} = ${formatPeso(subtotal)}</div>
        </div>
        <div class="qty-controls" style="display:flex; align-items:center; gap:6px;">
          <button onclick="changeQuantity(${product.id}, -1)">-</button>
          <span>${quantity}</span>
          <button onclick="changeQuantity(${product.id}, 1)">+</button>
          <button onclick="removeFromCart(${product.id})" style="border:none;background:none;color:#c0392b;cursor:pointer;">✕</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotal').textContent = formatPeso(getCartTotalCents() / 100);
  updatePaymentUI();
}

// ------------------------------------------------------------
// PAYMENT: Change = Amount Received - Total
// ------------------------------------------------------------

// Reads the "Amount Received" box.
// Returns { state, cents } where state is one of:
//   'empty'    - nothing typed yet
//   'invalid'  - not a valid non-negative number
//   'ok'       - valid (cents = amount in whole centavos)
function readAmountReceived() {
  const raw = document.getElementById('amountReceived').value.trim();
  if (raw === '') return { state: 'empty' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { state: 'invalid' };
  return { state: 'ok', cents: Math.round(n * 100) };
}

// Shows the change and the message under the input.
// Returns true when the payment is good enough to check out.
function updatePaymentUI() {
  const changeEl = document.getElementById('changeAmount');
  const msgEl = document.getElementById('paymentMsg');
  const totalCents = getCartTotalCents();
  const received = readAmountReceived();

  msgEl.textContent = '';
  msgEl.className = 'payment-msg';
  changeEl.className = '';
  changeEl.textContent = formatPeso(0);

  if (totalCents === 0 || received.state === 'empty') return false;

  if (received.state === 'invalid') {
    msgEl.textContent = 'Please enter a valid amount.';
    msgEl.className = 'payment-msg error';
    return false;
  }

  if (received.cents < totalCents) {
    // Never show negative change - show a clear message instead
    msgEl.textContent = 'Insufficient payment.';
    msgEl.className = 'payment-msg error';
    return false;
  }

  changeEl.textContent = formatPeso((received.cents - totalCents) / 100);
  changeEl.className = 'change-ok';
  return true;
}

async function completeOrder() {
  const btn = document.getElementById('completeOrderBtn');
  const entries = Object.values(cart);
  if (entries.length === 0) {
    alert('Cart is empty. Add at least one product first.');
    return;
  }

  // Block checkout unless payment covers the total
  const msgEl = document.getElementById('paymentMsg');
  const received = readAmountReceived();
  if (received.state === 'empty') {
    msgEl.textContent = 'Please enter the amount received.';
    msgEl.className = 'payment-msg error';
    document.getElementById('amountReceived').focus();
    return;
  }
  if (!updatePaymentUI()) {
    document.getElementById('amountReceived').focus();
    return;
  }

  const items = entries.map(({ product, quantity }) => ({
    product_id: product.id,
    quantity
  }));

  btn.disabled = true; // stops accidental double-clicks creating two orders
  try {
    const result = await apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, amount_received: received.cents / 100 })
    });

    showReceipt(result);

    // Reset the cart AND the payment fields
    cart = {};
    document.getElementById('amountReceived').value = '';
    renderCart();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'payment-msg error';
  } finally {
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// RECEIPT (uses the data the server saved, so it always matches the database)
// ------------------------------------------------------------
function showReceipt(order) {
  document.getElementById('rcOrderId').textContent = order.order_id;
  document.getElementById('rcDate').textContent = formatDate(order.created_at);
  document.getElementById('rcTime').textContent = formatTime(order.created_at);
  document.getElementById('rcCashier').textContent = order.cashier_name;

  document.getElementById('rcItems').innerHTML = order.items.map((item) => `
    <tr>
      <td class="rc-name">${escapeHtml(item.product_name)}</td>
      <td class="rc-num">${item.quantity}</td>
      <td class="rc-num">${formatPeso(item.price)}</td>
      <td class="rc-num">${formatPeso(item.subtotal)}</td>
    </tr>
  `).join('');

  document.getElementById('rcTotal').textContent = formatPeso(order.total_amount);
  document.getElementById('rcReceived').textContent = formatPeso(order.amount_received);
  document.getElementById('rcChange').textContent = formatPeso(order.change_amount);

  const modal = document.getElementById('successModal');
  modal.style.display = 'flex';

  // Restart the checkmark draw animation every time the modal opens
  const svg = modal.querySelector('.success-check svg');
  svg.style.animation = 'none';
  void svg.offsetWidth; // force reflow so the animation can restart
  svg.style.animation = '';
}
