
let cart = JSON.parse(localStorage.getItem("am_cart") || "[]");
let products = [];
let currentUser = null;

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

function updatePayButton() {
  const form = document.getElementById("checkoutForm");
  const button = document.getElementById("payButton");

  button.disabled = !form.checkValidity();
}

async function loadCheckout() {
  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    alert("로그인이 필요합니다.");
    location.replace("login.html");
    return;
  }

  currentUser = user;

  if (!cart.length) {
    alert("장바구니가 비어 있습니다.");
    location.replace("cart.html");
    return;
  }

  const { data: profile, error: profileError } = await db
    .from("shop_profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(profileError);
    alert("회원 정보를 불러오지 못했습니다.");
    return;
  }

  document.getElementById("recipientName").value = profile.name || "";
  document.getElementById("recipientPhone").value = profile.phone || "";

  const ids = cart.map(item => Number(item.id));

  const { data, error } = await db
    .from("shop_products")
    .select("id,name,price,stock,is_active")
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    console.error(error);
    alert("상품 정보를 불러오지 못했습니다.");
    return;
  }

  products = data || [];

  const missing = cart.some(item => {
    const product = products.find(p => Number(p.id) === Number(item.id));

    return !product ||
      Number(item.qty) <= 0 ||
      Number(item.qty) > Number(product.stock);
  });

  if (missing) {
    alert("상품이 품절되었거나 재고가 변경되었습니다. 장바구니를 확인해 주세요.");
    location.replace("cart.html");
    return;
  }

  renderCheckoutItems();
  updatePayButton();
}

function renderCheckoutItems() {
  const rows = cart.map(item => {
    const product = products.find(p => Number(p.id) === Number(item.id));

    return `
      <div class="cart-line">
        <div>
          <b>${escapeHtml(product.name)}</b>
          <div class="muted">${item.qty}개 × ${money(product.price)}</div>
        </div>

        <strong>${money(Number(product.price) * Number(item.qty))}</strong>
      </div>
    `;
  }).join("");

  const total = cart.reduce((sum, item) => {
    const product = products.find(p => Number(p.id) === Number(item.id));

    return sum + Number(product.price) * Number(item.qty);
  }, 0);

  document.getElementById("checkoutItems").innerHTML = rows;
  document.getElementById("checkoutTotal").textContent = money(total);
}

document.getElementById("checkoutForm").addEventListener("input", updatePayButton);
document.getElementById("checkoutForm").addEventListener("change", updatePayButton);

document.getElementById("checkoutForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) return;
  if (!currentUser || !cart.length) return;

  const recipientName = document.getElementById("recipientName").value.trim();
  const recipientPhone = document.getElementById("recipientPhone").value.trim();
  const shippingAddress = document.getElementById("shippingAddress").value.trim();
  const paymentMethod = document.getElementById("paymentMethod").value;

  if (!recipientName || !recipientPhone || !shippingAddress || !paymentMethod) {
    alert("모든 필수 정보를 입력하고 결제수단을 선택해 주세요.");
    return;
  }

  const items = cart.map(item => ({
    product_id: Number(item.id),
    qty: Number(item.qty)
  }));

  const button = document.getElementById("payButton");

  button.disabled = true;
  button.textContent = "주문 처리 중...";

  const { data, error } = await db.rpc("shop_complete_order", {
    p_items: items,
    p_recipient_name: recipientName,
    p_recipient_phone: recipientPhone,
    p_shipping_address: shippingAddress,
    p_payment_method: paymentMethod
  });

  if (error) {
    console.error(error);
    alert("주문 처리에 실패했습니다: " + error.message);

    button.textContent = "결제하기";
    updatePayButton();
    return;
  }

  localStorage.setItem("am_cart", JSON.stringify([]));

  const orderId = data?.order_id ?? data?.id;

  if (!orderId) {
    alert("주문은 저장되었지만 주문번호를 확인하지 못했습니다. 주문 내역을 확인해 주세요.");
    location.replace("orders.html");
    return;
  }

  location.href = "complete.html?order_id=" + encodeURIComponent(orderId);
});

loadCheckout();
