
async function loadMyPage() {
  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
    location.replace("login.html");
    return;
  }

  const { data: profile, error: profileError } = await db
    .from("shop_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(profileError);
    alert("회원 정보를 불러오지 못했습니다.");
    return;
  }

  document.getElementById("memberName").textContent =
    profile.name || "이름 없음";

  document.getElementById("memberEmail").textContent =
    profile.email || user.email;

  document.getElementById("memberPhone").textContent =
    profile.phone || "등록된 전화번호 없음";

  document.getElementById("memberGrade").textContent =
    profile.grade || "WELCOME";

  document.getElementById("memberPoints").textContent =
    Number(profile.points).toLocaleString("ko-KR") + "P";

  await loadMyOrders(user.id);
}

async function loadMyOrders(userId) {
  const orderList = document.getElementById("orderList");

  const { data: orders, error } = await db
    .from("shop_orders")
    .select(`
      *,
      shop_order_items (
        qty,
        unit_price,
        shop_products (
          name
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("주문 내역 조회 오류:", error);
    orderList.textContent = "주문 내역을 불러오지 못했습니다.";
    return;
  }

  if (!orders || orders.length === 0) {
    orderList.textContent = "아직 주문 내역이 없습니다.";
    return;
  }

  orderList.innerHTML = "";

  orders.forEach(function(order) {
    const orderItem = document.createElement("div");

    orderItem.className = "info-row";
    orderItem.style.display = "block";

    let productList = "";

    (order.shop_order_items || []).forEach(function(item) {
      const productName = item.shop_products
        ? item.shop_products.name
        : "상품 정보 없음";

      productList += `
        <p>
          ${escapeHtml(productName)}
          × ${Number(item.qty)}
          (${Number(item.unit_price).toLocaleString("ko-KR")}원)
        </p>
      `;
    });

    orderItem.innerHTML = `
      <div>
        <strong>주문번호: #${escapeHtml(order.id)}</strong>

        <p>
          ${escapeHtml(new Date(order.created_at).toLocaleString("ko-KR"))}
        </p>

        <p>받는 사람: ${escapeHtml(order.recipient_name || "-")}</p>

        <p>전화번호: ${escapeHtml(order.recipient_phone || "-")}</p>

        <p>배송 주소: ${escapeHtml(order.shipping_address || "-")}</p>

        <p>
          결제수단:
          ${escapeHtml(order.payment_method || "기존 주문")}
        </p>

        <div>${productList}</div>
      </div>

      <div style="margin-top:10px;">
        <strong>
          ${Number(order.total).toLocaleString("ko-KR")}원
        </strong>

        <p>${escapeHtml(order.status)}</p>
      </div>
    `;

    orderList.appendChild(orderItem);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

document.getElementById("logoutBtn").addEventListener("click", async function(event) {
  event.preventDefault();

  const { error } = await db.auth.signOut();

  if (error) {
    alert("로그아웃에 실패했습니다.");
    console.error(error);
    return;
  }

  alert("로그아웃되었습니다.");
  location.href = "index.html";
});

loadMyPage();
