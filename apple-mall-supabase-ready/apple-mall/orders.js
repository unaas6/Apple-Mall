
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

async function loadOrders() {
  const orderList = document.getElementById("orderList");

  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    alert("로그인이 필요합니다.");
    location.replace("login.html");
    return;
  }

  const { data: orders, error } = await db
    .from("shop_orders")
    .select(`
      id,
      total,
      status,
      created_at,
      recipient_name,
      recipient_phone,
      shipping_address,
      payment_method,
      shop_order_items (
        qty,
        unit_price,
        shop_products (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    orderList.textContent = "주문 내역을 불러오지 못했습니다.";
    return;
  }

  if (!orders || orders.length === 0) {
    orderList.innerHTML =
      '<div class="empty">아직 주문 내역이 없습니다.</div>';
    return;
  }

  orderList.innerHTML = orders.map(order => {
    const items = (order.shop_order_items || []).map(item => `
      <p>
        ${escapeHtml(item.shop_products?.name || "상품 정보 없음")}
        × ${Number(item.qty)}
        / ${money(item.unit_price)}
      </p>
    `).join("");

    return `
      <div class="library-item">
        <b>주문번호 #${escapeHtml(order.id)}</b>

        <p>
          ${escapeHtml(new Date(order.created_at).toLocaleString("ko-KR"))}
        </p>

        <p>주문 상태: ${escapeHtml(order.status)}</p>

        <p>받는 사람: ${escapeHtml(order.recipient_name || "-")}</p>

        <p>전화번호: ${escapeHtml(order.recipient_phone || "-")}</p>

        <p>배송 주소: ${escapeHtml(order.shipping_address || "-")}</p>

        <p>
          결제수단:
          <b>${escapeHtml(order.payment_method || "기존 주문")}</b>
        </p>

        <div>${items}</div>

        <strong>총 주문 금액: ${money(order.total)}</strong>
      </div>
    `;
  }).join("");
}

loadOrders();
