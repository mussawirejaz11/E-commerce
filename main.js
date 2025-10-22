// main.js
const API_URL = 'https://fakestoreapi.com/products'; // remote API
const FALLBACK = 'products.json'; // optional local fallback file in your folder

// DOM refs
const productsEl = document.getElementById('products');
const sortSelect = document.getElementById('sortSelect');
const cartBtn = document.getElementById('cartBtn');
const cartCountEl = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCart');
const checkoutBtn = document.getElementById('checkoutBtn');

let products = [];
let cart = loadCart();

function money(n){ return '₨' + Number(n).toFixed(2); }

async function fetchProducts(){
  try {
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error('Remote API failed');
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Remote fetch failed, trying fallback:', err);
    const res = await fetch(FALLBACK);
    if(!res.ok) throw err;
    return await res.json();
  }
}

function renderProducts(list){
  productsEl.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image}" alt="${escapeHtml(p.title)}" />
      <h3>${escapeHtml(p.title)}</h3>
      <div class="price">${money(p.price)}</div>
      <div class="actions">
        <a class="small-btn" href="product.html?id=${p.id}">View</a>
        <button data-id="${p.id}" class="addBtn">Add to Cart</button>
      </div>
    `;
    productsEl.appendChild(card);
  });

  // attach add to cart handlers
  document.querySelectorAll('.addBtn').forEach(b => {
    b.addEventListener('click', () => addToCart(Number(b.dataset.id), 1));
  });
}

function sortProducts(mode){
  let sorted = [...products];
  if(mode === 'price-asc') sorted.sort((a,b)=>a.price-b.price);
  else if(mode === 'price-desc') sorted.sort((a,b)=>b.price-a.price);
  else if(mode === 'title-asc') sorted.sort((a,b)=>a.title.localeCompare(b.title));
  else if(mode === 'title-desc') sorted.sort((a,b)=>b.title.localeCompare(a.title)).reverse();
  renderProducts(sorted);
}

function addToCart(id, qty=1){
  const item = products.find(p=>p.id==id);
  if(!item) return alert('Product not found');
  const existing = cart.find(c=>c.id==id);
  if(existing) existing.qty += qty;
  else cart.push({ id:item.id, title:item.title, price:item.price, image:item.image, qty });
  saveCart();
  updateCartUI();
  //openCart();
  //showToast(`${item.title} added to cart 🛒`); //this code line call each product name added to cart
  showToast(`Product added to Cart 🛒`);
}

function updateCartUI(){
  const totalCount = cart.reduce((s,i)=>s+i.qty,0);
  const totalPrice = cart.reduce((s,i)=>s + i.qty * i.price,0);
  cartCountEl.textContent = totalCount;
  cartTotalEl.textContent = money(totalPrice);

  // render items list (if cart modal present)
  if(cartItemsEl){
    cartItemsEl.innerHTML = '';
    if(cart.length===0) { cartItemsEl.innerHTML = '<p>Your cart is empty</p>'; return; }
    cart.forEach(ci => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${ci.image}" alt="${escapeHtml(ci.title)}" />
        <div style="flex:1">
          <div style="font-size:13px">${escapeHtml(ci.title)}</div>
          <div style="color:var(--muted); font-size:12px">${money(ci.price)} × ${ci.qty} = <strong>${money(ci.price*ci.qty)}</strong></div>
          <div style="margin-top:6px">
            <button class="small-btn dec" data-id="${ci.id}">-</button>
            <span style="margin:0 8px">${ci.qty}</span>
            <button class="small-btn inc" data-id="${ci.id}">+</button>
            <button class="small-btn remove" data-id="${ci.id}">Remove</button>
          </div>
        </div>`;
      cartItemsEl.appendChild(div);
    });

    // attach controls
    cartItemsEl.querySelectorAll('.inc').forEach(b => b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), 1)));
    cartItemsEl.querySelectorAll('.dec').forEach(b => b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), -1)));
    cartItemsEl.querySelectorAll('.remove').forEach(b => b.addEventListener('click', ()=> removeFromCart(Number(b.dataset.id))));
  }
}

function changeQty(id, delta){
  const it = cart.find(c=>c.id===id);
  if(!it) return;
  it.qty += delta;
  if(it.qty <= 0) cart = cart.filter(c=>c.id!==id);
  saveCart();
  updateCartUI();
}

function removeFromCart(id){
  cart = cart.filter(c=>c.id!==id);
  saveCart();
  updateCartUI();
}

function clearCart(){
  if(!confirm('Clear cart?')) return;
  cart = [];
  saveCart();
  updateCartUI();
}

function saveCart(){
  localStorage.setItem('mycart_v1', JSON.stringify(cart));
}

function loadCart(){
  try {
    return JSON.parse(localStorage.getItem('mycart_v1')) || [];
  } catch(e){ return []; }
}

function openCart(){ cartModal.classList.remove('hidden'); cartModal.setAttribute('aria-hidden','false'); }
function closeCartModal(){ cartModal.classList.add('hidden'); cartModal.setAttribute('aria-hidden','true'); }

function generateInvoice(){
  if(cart.length===0) return alert('Cart is empty');
  const invoiceItems = cart.map(i=>{
    return `<tr>
      <td>${escapeHtml(i.title)}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${money(i.price)}</td>
      <td style="text-align:right">${money(i.price * i.qty)}</td>
    </tr>`;
  }).join('');
  const subtotal = cart.reduce((s,i)=>s+i.qty*i.price,0);
  const tax = +(subtotal * 0.1).toFixed(2); // e.g., 10% tax example
  const grand = subtotal + tax;

  const now = new Date();
  const invoiceHtml = `
    <html><head><title>Invoice</title>
    <style>
      body{font-family:Arial; padding:20px}
      table{width:100%; border-collapse:collapse}
      td,th{padding:8px; border-bottom:1px solid #ddd}
      .right{text-align:right}
      h2{margin-top:0}
    </style>
    </head>
    <body>
      <h2>Invoice — My Store</h2>
      <div>Generated: ${now.toLocaleString()}</div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${invoiceItems}
        </tbody>
        <tfoot>
          <tr><td colspan="3" class="right">Subtotal</td><td class="right">${money(subtotal)}</td></tr>
          <tr><td colspan="3" class="right">Tax (10%)</td><td class="right">${money(tax)}</td></tr>
          <tr><td colspan="3" class="right"><strong>Grand Total</strong></td><td class="right"><strong>${money(grand)}</strong></td></tr>
        </tfoot>
      </table>
      <p>Thank you for your purchase!</p>
      <!-- <script>window.print()</script> -->
    </body></html>
  `;
//i have commented out above line of code " <script>window.print()</script> "

  const w = window.open('', '_blank');
  w.document.write(invoiceHtml);
  w.document.close();
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto remove after 2 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}


/* Init */
(async function init(){
  try {
    products = await fetchProducts();
    renderProducts(products);
    sortSelect.addEventListener('change', ()=> sortProducts(sortSelect.value));
    cartBtn.addEventListener('click', openCart);
    if(closeCart) closeCart.addEventListener('click', closeCartModal);
    if(clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
    if(checkoutBtn) checkoutBtn.addEventListener('click', generateInvoice);
    cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0);
    updateCartUI();
  } catch(err) {
    productsEl.innerHTML = '<p>Unable to load products. Try again later.</p>';
    console.error(err);
  }
})();
