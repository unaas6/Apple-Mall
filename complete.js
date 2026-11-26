
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

async function loadCompleteOrder() {
  const target = document.getElementById("completeDetails");
  const orderId = new URLSearchParams(location.search).get("order_id");

  if (!orderId) {
    target.textContent = "주문번호가 없습니다. 주문 내역에서 확인해 주세요.";
    return;
  }

  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    location.replace("login.html");
    return;
  }

  const { data: order, error } = await db
    .from("shop_orders")
    .select("id,total,status,created_at,recipient_name,recipient_phone,shipping_address,payment_method")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (error || !order) {
    console.error(error);
    target.textContent = "주문 정보를 불러오지 못했습니다. 주문 내역에서 확인해 주세요.";
    return;
  }

  target.innerHTML = `
    <div><b>주문번호</b> : #${escapeHtml(order.id)}</div>
    <div><b>주문일시</b> : ${escapeHtml(new Date(order.created_at).toLocaleString("ko-KR"))}</div>
    <div><b>주문 상태</b> : ${escapeHtml(order.status)}</div>
    <div><b>받는 사람</b> : ${escapeHtml(order.recipient_name)}</div>
    <div><b>전화번호</b> : ${escapeHtml(order.recipient_phone)}</div>
    <div><b>배송 주소</b> : ${escapeHtml(order.shipping_address)}</div>
    <div><b>결제수단</b> : ${escapeHtml(order.payment_method)}</div>
    <div><b>결제 금액</b> : ${money(order.total)}</div>
  `;
}

loadCompleteOrder();
