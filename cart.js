
let cart = JSON.parse(localStorage.getItem("am_cart") || "[]");
let products = [];

const money = value =>
  new Intl.NumberFormat("ko-KR").format(Number(value || 0)) + "원";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function saveCart() {
  localStorage.setItem("am_cart", JSON.stringify(cart));
  renderCart();
}

async function loadCart() {
  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    alert("로그인이 필요합니다.");
    location.replace("login.html");
    return;
  }

  if (cart.length === 0) {
    renderCart();
    return;
  }

  const ids = cart.map(item => Number(item.id));

  const { data, error } = await db
    .from("shop_products")
    .select("id,name,price,stock,image_url,is_active")
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    console.error(error);
    document.getElementById("cartItems").textContent =
      "상품 정보를 불러오지 못했습니다.";
    return;
  }

  products = data || [];
  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  cart = cart.filter(item =>
    products.some(p => Number(p.id) === Number(item.id))
  );

  const total = cart.reduce((sum, item) => {
    const product = products.find(p =>
      Number(p.id) === Number(item.id)
    );

    return sum + Number(product?.price || 0) * item.qty;
  }, 0);

  cartTotal.textContent = money(total);

  if (cart.length === 0) {
    cartItems.innerHTML =
      '<div class="empty">장바구니가 비어 있습니다.</div>';
    document.getElementById("checkoutBtn").disabled = true;
    return;
  }

  document.getElementById("checkoutBtn").disabled = false;

  cartItems.innerHTML = cart.map(item => {
    const product = products.find(p =>
      Number(p.id) === Number(item.id)
    );

    if (!product) return "";

    return `
      <div class="cart-line">
        <div>
          <b>${escapeHtml(product.name)}</b>
          <div class="muted">${money(product.price)}</div>
          <div class="muted">재고 ${product.stock}개</div>
        </div>

        <div class="qty">
          <button onclick="changeQty(${product.id}, -1)">−</button>
          ${item.qty}
          <button onclick="changeQty(${product.id}, 1)">＋</button>
          <button onclick="removeCart(${product.id})">×</button>
        </div>
      </div>
    `;
  }).join("");

  localStorage.setItem("am_cart", JSON.stringify(cart));
}

function changeQty(id, amount) {
  const item = cart.find(x => Number(x.id) === Number(id));
  const product = products.find(x => Number(x.id) === Number(id));

  if (!item || !product) return;

  const newQty = item.qty + amount;

  if (newQty <= 0) {
    removeCart(id);
    return;
  }

  if (newQty > Number(product.stock)) {
    alert("재고 수량을 초과할 수 없습니다.");
    return;
  }

  item.qty = newQty;
  saveCart();
}

function removeCart(id) {
  cart = cart.filter(item => Number(item.id) !== Number(id));
  saveCart();
}


function checkout() {
  if (cart.length === 0) {
    alert("장바구니가 비어 있습니다.");
    return;
  }

  location.href = "checkout.html";
}


document
  .getElementById("checkoutBtn")
  .addEventListener("click", checkout);

loadCart();
