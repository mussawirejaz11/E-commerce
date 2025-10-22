// product.js
const API_URL = 'https://fakestoreapi.com/products';
const FALLBACK = 'products.json';
const productDetailEl = document.getElementById('productDetail');
const cartBtn = document.getElementById('cartBtn');
const cartCountEl = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCart');
const checkoutBtn = document.getElementById('checkoutBtn');

let cart = JSON.parse(localStorage.getItem('mycart_v1') || '[]');

function money(n){ return '₨' + Number(n).toFixed(2); }
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getIdFromUrl(){
  const qs = new URLSearchParams(location.search);
  return qs.get('id');
}

async function fetchProduct(id){
  try {
    const r = await fetch(`${API_URL}/${id}`);
    if(!r.ok) throw new Error('API error');
    return await r.json();
  } catch(err) {
    // fallback: fetch all and find
    const r = await fetch(FALLBACK);
    const arr = await r.json();
    return arr.find(p=>String(p.id)===String(id));
  }
}

function renderProduct(p){
  if(!p) { productDetailEl.innerHTML = '<p>Product not found</p>'; return; }
  productDetailEl.innerHTML = `
    <img src="${p.image}" alt="${escapeHtml(p.title)}" />
    <div>
      <h2>${escapeHtml(p.title)}</h2>
      <div class="price">${money(p.price)}</div>
      <p style="color:var(--muted)">${escapeHtml(p.description)}</p>
      <div style="margin-top:12px">
        <label>Quantity: <input id="qtyInput" type="number" min="1" value="1" style="width:60px"/></label>
        <button id="addToCartBtn" class="single-add-btn" >Add to Cart</button>
      </div>
    </div>
  `;

  document.getElementById('addToCartBtn').addEventListener('click', ()=>{
    const q = parseInt(document.getElementById('qtyInput').value)||1;
    addToCart(p, q);
    showToast("Product added to cart 🛒");
  });
}

function addToCart(prod, qty=1){
  const existing = cart.find(c=>c.id==prod.id);
  if(existing) existing.qty += qty;
  else cart.push({ id:prod.id, title:prod.title, price:prod.price, image:prod.image, qty });
  localStorage.setItem('mycart_v1', JSON.stringify(cart));
  updateCartUI();
  //openCart();
}

/* cart UI functions similar to main.js */
function updateCartUI(){
  cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0);
  const total = cart.reduce((s,i)=>s + i.qty*i.price,0);
  cartTotalEl.textContent = money(total);

  if(cartItemsEl){
    cartItemsEl.innerHTML = '';
    if(cart.length===0) { cartItemsEl.innerHTML = '<p>Your cart is empty</p>'; return; }
    cart.forEach(ci=>{
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
  localStorage.setItem('mycart_v1', JSON.stringify(cart));
  updateCartUI();
}
function removeFromCart(id){ cart = cart.filter(c=>c.id!==id); localStorage.setItem('mycart_v1', JSON.stringify(cart)); updateCartUI();}
function clearCart(){ if(!confirm('Clear cart?')) return; cart=[]; localStorage.setItem('mycart_v1', JSON.stringify(cart)); updateCartUI();}
function openCart(){ cartModal.classList.remove('hidden'); cartModal.setAttribute('aria-hidden','false'); }
function closeCartModal(){ cartModal.classList.add('hidden'); cartModal.setAttribute('aria-hidden','true'); }

function generateInvoice(){
  if(cart.length===0) return alert('Cart is empty');
  // similar invoice code as main.js (kept minimal here)
  const subtotal = cart.reduce((s,i)=>s+i.qty*i.price,0);
  const tax = +(subtotal * 0.1).toFixed(2);
  const grand = subtotal + tax;
  const itemsRows = cart.map(i => `<tr><td>${escapeHtml(i.title)}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${money(i.price)}</td><td style="text-align:right">${money(i.qty*i.price)}</td></tr>`).join('');
  const invoiceHtml = `
    <html><head><title>
    Invoice</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}td,
    th{padding:8px;border-bottom:1px solid #ddd}.right{text-align:right}
    </style></head>
    <body><h2>Invoice — My Store</h2><table><thead><tr><th>Item</th>
    <th style="text-align:center">Qty</th><th style="text-align:right">Unit</th>
    <th style="text-align:right">Total</th></tr></thead><tbody>${itemsRows}</tbody>
    <tfoot><tr><td colspan="3" class="right">Subtotal</td><td class="right">${money(subtotal)}</td></tr><tr>
    <td colspan="3" class="right">Tax (10%)</td><td class="right">${money(tax)}</td></tr><tr><td colspan="3" class="right">
    <strong>Grand Total</strong></td><td class="right"><strong>${money(grand)}</strong></td></tr></tfoot></table>
    <!-- <script>window.print()</script> -->
    </body></html> `;

    //i have commented out above line of code " <script>window.print()</script> "

  const w = window.open('', '_blank');
  w.document.write(invoiceHtml);
  w.document.close();
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

/* init */
(async function init(){
  const id = getIdFromUrl();
  if(!id) { productDetailEl.innerHTML = '<p>No product ID provided.</p>'; return; }
  try {
    const p = await fetchProduct(id);
    renderProduct(p);
  } catch(err){
    productDetailEl.innerHTML = '<p>Error loading product.</p>';
    console.error(err);
  }
  // cart UI
  cartBtn.addEventListener('click', openCart);
  if(closeCart) closeCart.addEventListener('click', closeCartModal);
  if(clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
  if(checkoutBtn) checkoutBtn.addEventListener('click', generateInvoice);
  updateCartUI();
})();
