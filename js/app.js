/* ============================================================================
   VESPA CLASSIC — app.js
   Vanilla JavaScript (ES6+): class-based, modular, terorganisir.
   Fitur:
     1. Data katalog produk (array of objects)
     2. Render katalog + Filter & Search
     3. Modal detail produk
     4. Keranjang belanja (localStorage): add / qty / remove / total
     5. Checkout: form pembeli + simulasi payment gateway
     6. Utilitas: toast, analytics dummy, navbar scroll
   ============================================================================ */

/* ----------------------------------------------------------------------------
   0. KONSTANTA & UTILITAS
---------------------------------------------------------------------------- */

// Format angka ke Rupiah (contoh: 125000000 -> "Rp 125.000.000")
const formatRupiah = (number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);

// Placeholder gambar Unsplash yang gagal dimuat -> fallback ke picsum
const FALLBACK_IMG = (seed) =>
  `https://picsum.photos/seed/${seed}/600/450`;

// Selector helper singkat
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Toast notifikasi sederhana
let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  // force reflow agar transisi terlihat
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 300);
  }, 2200);
}

// Dummy Google Analytics event push (tracking metrik bisnis)
function trackEvent(action, params = {}) {
  if (typeof gtag === "function") {
    gtag("event", action, params);
  }
  // Di console untuk keperluan demo/debug
  console.log(`[Analytics] ${action}`, params);
}

/* ----------------------------------------------------------------------------
   1. DATA PRODUK (Array of Objects)
   Kategori: Smallframe, Largeframe, Wideframe, Special Series
   Status   : Tersedia | Proses Inspeksi | Terjual
---------------------------------------------------------------------------- */
const PRODUCTS = [
  {
    id: 1,
    name: "Vespa V50 Special",
    category: "Smallframe",
    price: 38000000,
    status: "Tersedia",
    year: 1976,
    engine: "50cc 2-Tak",
    image: "v50.png",
    desc: "Smallframe legendaris dengan body ramping, sangat digemari kolektor Eropa. Kondisi orisinal dengan cat period-correct.",
  },
  {
    id: 2,
    name: "Vespa PK125 XL",
    category: "Smallframe",
    price: 52000000,
    status: "Proses Inspeksi",
    year: 1982,
    engine: "125cc 2-Tak",
    image: "pk125.png",
    desc: "Varian PK dengan tenaga lebih besar, cocok untuk daily classic. Sedang menjalani restorasi ringan.",
  },
  {
    id: 3,
    name: "Vespa PX150",
    category: "Largeframe",
    price: 65000000,
    status: "Tersedia",
    year: 1990,
    engine: "150cc 2-Tak",
    image: "PSPX.png",
    desc: "Largeframe paling ikonik. Electric start, suspensi nyaman, dan sparepart melimpah. Siap jalan.",
  },
  {
    id: 4,
    name: "Vespa PX200 E",
    category: "Largeframe",
    price: 89000000,
    status: "Terjual",
    year: 1985,
    engine: "200cc 2-Tak",
    image: "PX200.png",
    desc: "Kapasitas terbesar di family PX. Tenaga buas untuk touring. Unit terjual ke kolektor Jakarta.",
  },
  {
    id: 5,
    name: "Vespa 150 Wideframe",
    category: "Wideframe",
    price: 145000000,
    status: "Tersedia",
    year: 1958,
    engine: "150cc 3-Port",
    image: "150.png",
    desc: "Wideframe era 50-an dengan lekukan body khas vintage. Barang langka, bernilai investasi tinggi.",
  },
  {
    id: 6,
    name: "Vespa 125 Wideframe",
    category: "Wideframe",
    price: 98000000,
    status: "Proses Inspeksi",
    year: 1960,
    engine: "125cc 3-Port",
    image: "125.png",
    desc: "Saudara muda wideframe, desain 'rocket' yang unik. Dalam tahap verifikasi keaslian dokumen.",
  },
];

// Kategori unik untuk filter button (diambil otomatis dari data)
const CATEGORIES = ["Semua", ...new Set(PRODUCTS.map((p) => p.category))];

/* ----------------------------------------------------------------------------
   2. STATE APLIKASI
---------------------------------------------------------------------------- */
const state = {
  search: "",
  category: "Semua",
  cart: loadCart(), // { [productId]: quantity }
};

// Ambil keranjang dari localStorage (amankan bila kosong/rusak)
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("vc_cart")) || {};
  } catch {
    return {};
  }
}
// Simpan keranjang ke localStorage
function saveCart() {
  localStorage.setItem("vc_cart", JSON.stringify(state.cart));
}

/* ----------------------------------------------------------------------------
   3. RENDER: FILTER BUTTONS
---------------------------------------------------------------------------- */
function renderFilters() {
  const group = $("#filterGroup");
  group.innerHTML = CATEGORIES.map(
    (cat) =>
      `<button class="filter-btn${cat === state.category ? " active" : ""}" data-category="${cat}">${cat}</button>`
  ).join("");
}

/* ----------------------------------------------------------------------------
   4. RENDER: KATALOG PRODUK (dengan filter + search)
---------------------------------------------------------------------------- */
function getFilteredProducts() {
  const q = state.search.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    const matchCat = state.category === "Semua" || p.category === state.category;
    const matchSearch = p.name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function renderProducts() {
  const grid = $("#productGrid");
  const empty = $("#emptyState");
  const list = getFilteredProducts();

  // Empty state
  empty.hidden = list.length !== 0;

  grid.innerHTML = list
    .map((p) => {
      // mapping status -> class badge
      const statusClass =
        p.status === "Tersedia"
          ? "tersedia"
          : p.status === "Proses Inspeksi"
          ? "inspeksi"
          : "terjual";
      const soldOut = p.status === "Terjual";
      return `
        <article class="card" data-id="${p.id}" tabindex="0">
          <div class="card-media">
            <span class="status-badge ${statusClass}">${p.status}</span>
            <img src="${p.image}" alt="${p.name}"
                 onerror="this.onerror=null;this.src='${FALLBACK_IMG(p.id)}';" loading="lazy" />
          </div>
          <div class="card-body">
            <span class="card-cat">${p.category}</span>
            <h3 class="card-name">${p.name}</h3>
            <span class="card-price">${formatRupiah(p.price)}</span>
            <button class="card-btn" data-add="${p.id}" ${soldOut ? "disabled" : ""}>
              ${soldOut ? "Terjual" : "Tambah ke Keranjang"}
            </button>
          </div>
        </article>`;
    })
    .join("");
}

/* ----------------------------------------------------------------------------
   5. MODAL DETAIL PRODUK
---------------------------------------------------------------------------- */
function openProductModal(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;

  const statusClass =
    p.status === "Tersedia" ? "tersedia" : p.status === "Proses Inspeksi" ? "inspeksi" : "terjual";
  const soldOut = p.status === "Terjual";

  $("#productModalBody").innerHTML = `
    <img src="${p.image}" alt="${p.name}"
         onerror="this.onerror=null;this.src='${FALLBACK_IMG(p.id)}';" />
    <div class="pm-info">
      <span class="pm-cat">${p.category}</span>
      <h2 class="pm-name" id="pmName">${p.name}</h2>
      <div class="pm-price">${formatRupiah(p.price)}</div>
      <div class="pm-status">Status Unit:
        <span class="status-badge ${statusClass}">${p.status}</span>
      </div>
      <p class="pm-desc">${p.desc}</p>
      <div class="pm-specs">
        <div>Tahun<strong>${p.year}</strong></div>
        <div>Mesin<strong>${p.engine}</strong></div>
        <div>Kategori<strong>${p.category}</strong></div>
        <div>Garansi<strong>Keaslian 100%</strong></div>
      </div>
      <div class="pm-actions">
        <button class="btn btn-primary" data-add="${p.id}" ${soldOut ? "disabled" : ""}>
          ${soldOut ? "Unit Terjual" : "Tambah ke Keranjang"}
        </button>
        <button class="btn btn-ghost" data-close-modal> Tutup</button>
      </div>
    </div>`;

  openModal("#productModal");
  trackEvent("view_item", { item_id: p.id, item_name: p.name, value: p.price });
}

/* ----------------------------------------------------------------------------
   6. KERANJANG BELANJA (CART)
---------------------------------------------------------------------------- */
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  renderCart();
  updateCartBadge();
  showToast("Ditambahkan ke keranjang");
  trackEvent("add_to_cart", { item_id: id });
}

function updateQty(id, delta) {
  const current = state.cart[id] || 0;
  const next = current + delta;
  if (next <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeFromCart(id) {
  delete state.cart[id];
  saveCart();
  renderCart();
  updateCartBadge();
  showToast("Item dihapus");
}

// Hitung total item (untuk badge)
function cartCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}
// Hitung total harga
function cartTotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const product = PRODUCTS.find((p) => p.id === Number(id));
    return sum + (product ? product.price * qty : 0);
  }, 0);
}

function updateCartBadge() {
  const badge = $("#cartBadge");
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "grid" : "none";
}

function renderCart() {
  const wrap = $("#cartItems");
  const ids = Object.keys(state.cart);

  if (ids.length === 0) {
    wrap.innerHTML = `<p class="cart-empty">Keranjang Anda masih kosong.<br/>Yuk, pilih unit impian Anda!</p>`;
    $("#cartTotal").textContent = formatRupiah(0);
    $("#checkoutBtn").disabled = true;
    return;
  }

  wrap.innerHTML = ids
    .map((id) => {
      const p = PRODUCTS.find((x) => x.id === Number(id));
      const qty = state.cart[id];
      return `
        <div class="cart-item" data-id="${id}">
          <img src="${p.image}" alt="${p.name}"
               onerror="this.onerror=null;this.src='${FALLBACK_IMG(p.id)}';" />
          <div class="cart-item-info">
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-price">${formatRupiah(p.price)}</div>
            <div class="qty-control">
              <button class="qty-btn" data-qty="-1" data-id="${id}" aria-label="Kurangi">−</button>
              <span class="qty-val">${qty}</span>
              <button class="qty-btn" data-qty="1" data-id="${id}" aria-label="Tambah">+</button>
            </div>
            <button class="cart-item-remove" data-remove="${id}">Hapus</button>
          </div>
        </div>`;
    })
    .join("");

  $("#cartTotal").textContent = formatRupiah(cartTotal());
  $("#checkoutBtn").disabled = false;
}

/* ----------------------------------------------------------------------------
   7. CHECKOUT (Form + Simulasi Payment Gateway)
---------------------------------------------------------------------------- */
function openCheckout() {
  // Reset tampilan step
  $("#checkoutFormWrap").hidden = false;
  $("#checkoutLoading").hidden = true;
  $("#checkoutSuccess").hidden = true;

  // Ringkasan pesanan
  const summary = $("#checkoutSummary");
  const rows = Object.entries(state.cart)
    .map(([id, qty]) => {
      const p = PRODUCTS.find((x) => x.id === Number(id));
      return `<div class="row"><span>${p.name} × ${qty}</span><span>${formatRupiah(p.price * qty)}</span></div>`;
    })
    .join("");
  summary.innerHTML = `
    ${rows}
    <div class="row total"><span>Total Pembayaran</span><span>${formatRupiah(cartTotal())}</span></div>`;

  closeCartDrawer();
  openModal("#checkoutModal");
}

function submitCheckout(e) {
  e.preventDefault();

  // Validasi form sederhana
  const form = e.target;
  const name = $("#buyerName").value.trim();
  const phone = $("#buyerPhone").value.trim();
  const address = $("#buyerAddress").value.trim();
  let valid = true;

  [["#buyerName", name], ["#buyerPhone", phone], ["#buyerAddress", address]].forEach(
    ([sel, val]) => {
      const el = $(sel);
      if (!val) {
        el.classList.add("err");
        valid = false;
      } else {
        el.classList.remove("err");
      }
    }
  );
  if (!valid) {
    showToast("Lengkapi data pembeli terlebih dahulu");
    return;
  }

  const payment = form.payment.value;
  trackEvent("begin_checkout", { payment_method: payment, value: cartTotal() });

  // STEP 2: Simulasi loading payment gateway
  $("#checkoutFormWrap").hidden = true;
  $("#checkoutLoading").hidden = false;

  setTimeout(() => {
    // STEP 3: Sukses
    $("#checkoutLoading").hidden = true;
    $("#checkoutSuccess").hidden = false;
    $("#successMsg").textContent = `Pembayaran via ${payment} berhasil. Pesanan akan kami proses ke ${address}.`;
    trackEvent("purchase", { payment_method: payment, value: cartTotal() });

    // Kosongkan keranjang setelah pembayaran sukses
    state.cart = {};
    saveCart();
    renderCart();
    updateCartBadge();
  }, 2000);
}

/* ----------------------------------------------------------------------------
   8. MODAL / DRAWER HELPERS
---------------------------------------------------------------------------- */
function openModal(sel) {
  $(sel).hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(sel) {
  $(sel).hidden = true;
  document.body.style.overflow = "";
}
function openCartDrawer() {
  $("#cartDrawer").classList.add("open");
  $("#cartOverlay").hidden = false;
}
function closeCartDrawer() {
  $("#cartDrawer").classList.remove("open");
  $("#cartOverlay").hidden = true;
}

/* ----------------------------------------------------------------------------
   9. EVENT LISTENERS (Event Delegation)
---------------------------------------------------------------------------- */
function bindEvents() {
  // --- Navbar: hamburger menu (mobile) ---
  const hamburger = $("#hamburger");
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    $("#navLinks").classList.toggle("open");
  });
  // Tutup menu mobile saat link diklik
  $$("#navLinks a").forEach((a) =>
    a.addEventListener("click", () => {
      hamburger.classList.remove("active");
      $("#navLinks").classList.remove("open");
    })
  );

  // --- Navbar: shadow saat scroll ---
  window.addEventListener("scroll", () => {
    $("#navbar").classList.toggle("scrolled", window.scrollY > 10);
  });

  // --- Search input ---
  $("#searchInput").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderProducts();
  });

  // --- Filter kategori (delegation) ---
  $("#filterGroup").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    state.category = btn.dataset.category;
    renderFilters();
    renderProducts();
  });

  // --- Klik produk (buka modal) & tambah ke cart (delegation pada grid) ---
  $("#productGrid").addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    const card = e.target.closest(".card");
    if (addBtn) {
      e.stopPropagation();
      addToCart(Number(addBtn.dataset.add));
      return;
    }
    if (card) openProductModal(Number(card.dataset.id));
  });
  // Aksesibilitas: Enter/Space pada kartu membuka modal
  $("#productGrid").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
      e.preventDefault();
      openProductModal(Number(e.target.dataset.id));
    }
  });

  // --- Modal produk: tombol tambah & tutup (delegation) ---
  $("#productModal").addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      addToCart(Number(addBtn.dataset.add));
      closeModal("#productModal");
      return;
    }
    if (e.target.hasAttribute("data-close-modal") || e.target.id === "productModal") {
      closeModal("#productModal");
    }
  });

  // --- Tutup modal umum (overlay klik / tombol close) ---
  $$(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.hasAttribute("data-close-modal")) {
        closeModal("#" + overlay.id);
      }
    });
  });
  // Escape menutup modal/drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $$(".modal-overlay").forEach((o) => (o.hidden = true));
      closeCartDrawer();
      document.body.style.overflow = "";
    }
  });

  // --- Keranjang: toggle drawer ---
  $("#cartToggle").addEventListener("click", openCartDrawer);
  $("#cartClose").addEventListener("click", closeCartDrawer);
  $("#cartOverlay").addEventListener("click", closeCartDrawer);

  // --- Keranjang: qty & remove (delegation) ---
  $("#cartItems").addEventListener("click", (e) => {
    const qtyBtn = e.target.closest("[data-qty]");
    const rmBtn = e.target.closest("[data-remove]");
    if (qtyBtn) updateQty(Number(qtyBtn.dataset.id), Number(qtyBtn.dataset.qty));
    if (rmBtn) removeFromCart(Number(rmBtn.dataset.id));
  });

  // --- Checkout flow ---
  $("#checkoutBtn").addEventListener("click", openCheckout);
  $("#checkoutForm").addEventListener("submit", submitCheckout);
  $("#successClose").addEventListener("click", () => closeModal("#checkoutModal"));

  // --- Footer kategori link -> set filter & scroll ---
  $$("[data-footer-cat]").forEach((a) =>
    a.addEventListener("click", () => {
      state.category = a.dataset.footerCat;
      renderFilters();
      renderProducts();
    })
  );
}

/* ----------------------------------------------------------------------------
   10. INIT (Entry Point)
---------------------------------------------------------------------------- */
function init() {
  $("#year").textContent = new Date().getFullYear(); // footer year
  renderFilters();
  renderProducts();
  renderCart();
  updateCartBadge();
  bindEvents();
  trackEvent("page_view", { page: "home" });
}

// Jalankan saat DOM siap
document.addEventListener("DOMContentLoaded", init);
