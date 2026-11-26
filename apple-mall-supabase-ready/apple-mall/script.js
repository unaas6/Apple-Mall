// 상품 표시 정보: 실제 가격·재고·상품명은 Supabase shop_products 테이블에서 읽습니다.
const PRODUCT_VIEW = {
  'AirPods Pro 2세대': { image: 'img/airpods.png', description: '몰입감 있는 사운드와 노이즈 캔슬링', tag: 'BEST' },
  'iPad Air 11형 (M3)': { image: 'img/ipad.png', description: '가벼운 디자인, 강력한 성능', tag: '인기상품' },
  'iPhone 16': { image: 'img/iphone.png', description: '일상을 더 스마트하게', tag: 'BEST' },
  'MacBook Air M4': { image: 'img/macbook.png', description: '가볍고 빠른 퍼포먼스', tag: '추천' }
};
const GRADE_INFO = {
  WELCOME: { label: 'WELCOME', rate: 0.01, min: 0 },
  SILVER: { label: 'SILVER', rate: 0.03, min: 300000 },
  GOLD: { label: 'GOLD', rate: 0.05, min: 1000000 },
  VIP: { label: 'VIP', rate: 0.07, min: 3000000 }
};
const money = value => new Intl.NumberFormat('ko-KR').format(Number(value || 0)) + '원';
let products = [], cart = JSON.parse(localStorage.getItem('am_cart') || '[]');
let currentUser = null, currentProfile = null, currentCategory = '전체';
let slides = [], dots = [], slideIndex = 0, slideTimer = null;
let selectedProductId = null;
let highlightTimer = null;

function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
function openModal(title, html) { document.getElementById('modalTitle').textContent = title; document.getElementById('modalContent').innerHTML = html; document.getElementById('modalBg').classList.add('show'); }
function closeModal() { document.getElementById('modalBg').classList.remove('show'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function updateCartCount() { document.getElementById('cartCount').textContent = cart.reduce((sum, item) => sum + item.qty, 0); }
function saveCart() { localStorage.setItem('am_cart', JSON.stringify(cart)); updateCartCount(); }
function pointRate() { return GRADE_INFO[currentProfile?.grade || 'WELCOME']?.rate || 0.01; }

async function loadSession() {
  const { data: { session }, error } = await db.auth.getSession();
  if (error) console.error(error);
  currentUser = session?.user || null;
  await loadProfile();
}
async function loadProfile() {
  currentProfile = null;
  if (!currentUser) return;
  const { data, error } = await db.from('shop_profiles').select('id,email,name,phone,grade,points,role,created_at').eq('id', currentUser.id).single();
  if (error) { console.error(error); toast('회원 정보를 불러오지 못했습니다.'); return; }
  currentProfile = data;
}
async function loadProducts() {
  const status = document.getElementById('productStatus');
  const { data, error } = await db.from('shop_products').select('id,name,category,price,stock,image_url,is_active').eq('is_active', true).order('id');
  if (error) { status.textContent = '상품 조회 오류'; document.getElementById('productGrid').innerHTML = '<div class="empty">상품을 불러오지 못했습니다. Supabase 상품 테이블과 RLS 정책을 확인하세요.</div>'; console.error(error); return; }
  products = data || []; status.textContent = `${products.length}개 상품`;
  renderProducts();
}
function productImage(product) { return product.image_url || PRODUCT_VIEW[product.name]?.image || 'img/digital-delivery.png'; }

function renderProducts() {
  const q = (document.getElementById('searchInput').value || '')
    .trim()
    .toLowerCase();

  const list = products.filter(p =>
    (currentCategory === '전체' || p.category === currentCategory) &&
    (
      p.name.toLowerCase().includes(q) ||
      String(p.category).toLowerCase().includes(q)
    )
  );

  document.getElementById('productGrid').innerHTML = list.length
    ? list.map(p => {
        const view = PRODUCT_VIEW[p.name] || {};
        const stockText = Number(p.stock) > 0
          ? `재고 ${p.stock}개`
          : '품절';
        const disabled = Number(p.stock) <= 0;

        return `
          <article
            class="product ${Number(p.id) === Number(selectedProductId) ? 'product-highlight' : ''}"
            id="product-card-${Number(p.id)}"
          >
            <div class="product-img">
              <img
                src="${escapeHtml(productImage(p))}"
                alt="${escapeHtml(p.name)}"
                onerror="this.src='img/digital-delivery.png'"
              >
            </div>

            <div class="product-info">
              <span class="tag">${escapeHtml(view.tag || p.category || '상품')}</span>
              <h3>${escapeHtml(p.name)}</h3>
              <div class="desc">${escapeHtml(view.description || p.category || '')}</div>

              <div class="price-row">
                <div>
                  <div class="price">${money(p.price)}</div>
                  <div class="point">
                    ${stockText} · +${money(Math.floor(Number(p.price) * pointRate())).replace('원','P')}
                  </div>
                </div>

                <button
                  class="add"
                  ${disabled ? 'disabled' : ''}
                  onclick="addCart(${Number(p.id)})"
                  aria-label="장바구니 담기"
                >＋</button>
              </div>
            </div>
          </article>
        `;
      }).join('')
    : '<div class="empty">검색 결과가 없습니다.</div>';
}

function showSearchSuggestions() {
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggestions');
  const q = input.value.trim().toLowerCase();

  if (!q) {
    box.innerHTML = '';
    box.classList.remove('show');
    return;
  }

  const matches = products
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, 6);

  if (matches.length === 0) {
    box.innerHTML = '<div class="suggestion-empty">검색 결과가 없습니다.</div>';
    box.classList.add('show');
    return;
  }

  box.innerHTML = matches.map(p => `
    <button
      type="button"
      class="suggestion-item"
      onclick="selectSearchSuggestion(${Number(p.id)})"
    >
      <span>⌕</span>
      <span>${escapeHtml(p.name)}</span>
      <small>${escapeHtml(p.category || '상품')}</small>
    </button>
  `).join('');

  box.classList.add('show');
}

function selectSearchSuggestion(id) {
  const product = products.find(p => Number(p.id) === Number(id));

  if (!product) return;

  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggestions');

  input.value = product.name;
  box.classList.remove('show');

  currentCategory = '전체';
  selectedProductId = Number(product.id);

  if (highlightTimer) clearTimeout(highlightTimer);

  renderProducts();

  const card = document.getElementById(`product-card-${product.id}`);

  if (card) {
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  highlightTimer = setTimeout(() => {
    selectedProductId = null;

    const selectedCard = document.getElementById(`product-card-${id}`);

    if (selectedCard) {
      selectedCard.classList.remove('product-highlight');
    }
  }, 2200);
}

function setCategory(category) { currentCategory = category; if (document.getElementById('productGrid')) renderProducts(); }
document.getElementById('searchInput').addEventListener('input', function() {
  currentCategory = '전체';
  selectedProductId = null;

  if (highlightTimer) clearTimeout(highlightTimer);

  renderProducts();
  showSearchSuggestions();
});

document.addEventListener('click', function(event) {
  const searchBox = document.querySelector('.search-box');
  const suggestions = document.getElementById('searchSuggestions');

  if (!searchBox.contains(event.target)) {
    suggestions.classList.remove('show');
  }
});

document.getElementById('searchInput').addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    document.getElementById('searchSuggestions').classList.remove('show');
  }
});
function addCart(id) {
  const p = products.find(item => Number(item.id) === Number(id)); if (!p) return;
  if (Number(p.stock) <= 0) return toast('품절된 상품입니다.');
  const found = cart.find(item => Number(item.id) === Number(id));
  if (found) { if (found.qty >= Number(p.stock)) return toast('재고 수량을 초과할 수 없습니다.'); found.qty++; }
  else cart.push({ id: Number(id), qty: 1 });
  saveCart(); toast('장바구니에 담았습니다.');
}
function openCart() {
  location.href = "cart.html";
}
function changeQty(id, amount) { const item = cart.find(x => Number(x.id) === Number(id)); const p = products.find(x => Number(x.id) === Number(id)); if (!item || !p) return; item.qty += amount; if (item.qty <= 0) cart = cart.filter(x => x !== item); else if (item.qty > Number(p.stock)) { item.qty = Number(p.stock); toast('재고 수량까지만 담을 수 있습니다.'); } saveCart(); openCart(); }
function removeCart(id) { cart = cart.filter(x => Number(x.id) !== Number(id)); saveCart(); openCart(); }

function openAccount(mode) { if (currentUser && currentProfile) showMyPage(); else if (mode === 'signup') signupForm(); else loginForm(); }
function loginForm() { openModal('로그인', `<div class="field"><label>이메일</label><input id="loginEmail" type="email" autocomplete="email" placeholder="email@example.com"></div><div class="field"><label>비밀번호</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="비밀번호"></div><button class="full" onclick="login()">로그인</button><div class="switch">아직 회원이 아니신가요? <button onclick="signupForm()">회원가입</button></div>`); }
function signupForm() { openModal('회원가입', `<div class="field"><label>이름</label><input id="signupName" autocomplete="name" placeholder="이름"></div><div class="field"><label>이메일</label><input id="signupEmail" type="email" autocomplete="email" placeholder="email@example.com"></div><div class="field"><label>전화번호</label><input id="signupPhone" type="tel" autocomplete="tel" placeholder="01012345678"></div><div class="field"><label>비밀번호 (6자 이상)</label><input id="signupPassword" type="password" autocomplete="new-password" placeholder="비밀번호"></div><button class="full green" onclick="signup()">가입하고 3,000P 받기</button><div class="switch">이미 회원이신가요? <button onclick="loginForm()">로그인</button></div><div class="notice">가입 후 이메일 인증이 필요한 경우, Supabase에 등록한 이메일로 인증 링크가 발송됩니다.</div>`); }
async function signup() {
  const name = document.getElementById('signupName').value.trim(), email = document.getElementById('signupEmail').value.trim(), phone = document.getElementById('signupPhone').value.trim(), password = document.getElementById('signupPassword').value;
  if (!name || !email.includes('@') || !phone || password.length < 6) return toast('이름, 이메일, 전화번호와 6자 이상 비밀번호를 입력하세요.');
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { name, phone } } });
  if (error) return toast(error.message);
  if (data.session) { currentUser = data.user; await loadProfile(); closeModal(); renderProducts(); toast('회원가입이 완료되었습니다. 3,000P가 지급되었습니다.'); }
  else { closeModal(); toast('가입 요청 완료. 이메일 인증 후 로그인하세요.'); }
}
async function login() {
  const email = document.getElementById('loginEmail').value.trim(), password = document.getElementById('loginPassword').value;
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return toast(error.message);
  currentUser = data.user; await loadProfile(); closeModal(); renderProducts(); toast('로그인되었습니다.');
}
async function logout() { const { error } = await db.auth.signOut(); if (error) return toast(error.message); currentUser = null; currentProfile = null; closeModal(); renderProducts(); toast('로그아웃되었습니다.'); }
async function showMyPage() {
  if (!currentUser) return loginForm(); await loadProfile(); if (!currentProfile) return;
  const p = currentProfile;
  openModal('마이페이지', `<div class="account-panel"><strong>${escapeHtml(p.name)}님</strong><p>${escapeHtml(GRADE_INFO[p.grade]?.label || p.grade)} · 포인트 <b style="color:var(--green-dark)">${money(p.points).replace('원','P')}</b></p><p class="muted">${escapeHtml(p.email || currentUser.email)}</p><p class="muted">전화번호: ${escapeHtml(p.phone || '-')}</p></div><button class="full green" onclick="showOrders()">주문 내역 확인</button><button class="full" onclick="logout()">로그아웃</button>`);
}
async function showOrders() {
  if (!currentUser) {
    location.href = "login.html";
    return;
  }

  location.href = "orders.html";
}
async function checkout() {
  if (!currentUser) { loginForm(); return toast('주문하려면 먼저 로그인하세요.'); }
  if (!cart.length) return toast('장바구니가 비어 있습니다.');
  const invalid = cart.some(item => { const p = products.find(x => Number(x.id) === Number(item.id)); return !p || item.qty > Number(p.stock); });
  if (invalid) { await loadProducts(); return toast('상품 재고가 변경되었습니다. 장바구니를 확인하세요.'); }
  const items = cart.map(item => ({ product_id: Number(item.id), qty: item.qty }));
  openModal('주문 확인', `<div class="account-panel"><p>주문 상품 ${items.length}종</p><p>예상 적립률 ${Math.round(pointRate()*100)}%</p><p>실제 카드 결제 없이 테스트 주문으로 저장됩니다.</p></div><button class="full green" onclick='completeOrder(${JSON.stringify(items)})'>테스트 주문 완료</button><div class="notice">주문 완료 시 Supabase에 주문과 주문 상품이 저장되고 재고·포인트가 갱신됩니다.</div>`);
}
async function completeOrder(items) {
  const { data, error } = await db.rpc("shop_complete_order", {
    p_items: items
  });

  if (error) {
    toast("주문 실패: " + error.message);
    return;
  }

  cart = [];
  saveCart();

  await loadProfile();
  await loadProducts();

  alert(
    "주문이 완료되었습니다.\n주문번호: #" +
    (data?.order_id ?? data?.id ?? "확인 필요")
  );

  location.href = "orders.html";
}
function showMembership() { openModal('회원 등급 및 포인트', `<div class="library-item"><b>WELCOME · 1% 적립</b><p>가입 시 기본 등급</p></div><div class="library-item"><b>SILVER · 3% 적립</b><p>누적 구매 300,000원 이상</p></div><div class="library-item"><b>GOLD · 5% 적립</b><p>누적 구매 1,000,000원 이상</p></div><div class="library-item"><b>VIP · 7% 적립</b><p>누적 구매 3,000,000원 이상</p></div><p class="muted">등급과 포인트는 주문 완료 후 업데이트 됩니다.</p>`); }

function goSlide(n) { slideIndex = (n + slides.length) % slides.length; slides.forEach((el,i) => el.classList.toggle('active', i === slideIndex)); dots.forEach((el,i) => el.classList.toggle('active', i === slideIndex)); }
function moveSlide(n) { goSlide(slideIndex + n); }
function startCarousel() { slides = [...document.querySelectorAll('.hero-slide')]; dots = [...document.querySelectorAll('.dot')]; if (slideTimer) clearInterval(slideTimer); slideTimer = setInterval(() => moveSlide(1), 6000); }

db.auth.onAuthStateChange((_event, session) => { currentUser = session?.user || null; setTimeout(async () => { await loadProfile(); renderProducts(); }, 0); });  
(async function init() { startCarousel(); updateCartCount(); await loadSession(); await loadProducts(); })();
