-- 기존 SQL을 실행한 뒤 Supabase SQL Editor에서 이 파일을 추가로 실행하세요.
-- 테스트 주문을 안전하게 저장하고 재고·포인트·회원 등급을 서버 측에서 갱신합니다.
create or replace function public.shop_complete_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id bigint;
  v_qty integer;
  v_price integer;
  v_stock integer;
  v_total integer := 0;
  v_order_id bigint;
  v_grade text;
  v_rate numeric;
  v_spent integer;
  v_points integer;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '주문 상품이 없습니다.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::bigint;
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty <= 0 then raise exception '상품 수량이 올바르지 않습니다.'; end if;
    select price, stock into v_price, v_stock
      from public.shop_products
      where id = v_product_id and is_active = true
      for update;
    if not found then raise exception '판매 중인 상품을 찾을 수 없습니다. 상품 ID: %', v_product_id; end if;
    if v_stock < v_qty then raise exception '상품 재고가 부족합니다. 상품 ID: %', v_product_id; end if;
    v_total := v_total + (v_price * v_qty);
  end loop;

  select grade into v_grade from public.shop_profiles where id = v_user_id for update;
  if not found then raise exception '회원 프로필을 찾을 수 없습니다.'; end if;
  v_rate := case v_grade when 'VIP' then 0.07 when 'GOLD' then 0.05 when 'SILVER' then 0.03 else 0.01 end;

  insert into public.shop_orders(user_id, total, status)
    values (v_user_id, v_total, '결제완료') returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::bigint;
    v_qty := (v_item->>'qty')::integer;
    select price into v_price from public.shop_products where id = v_product_id;
    insert into public.shop_order_items(order_id, product_id, qty, unit_price)
      values (v_order_id, v_product_id, v_qty, v_price);
    update public.shop_products set stock = stock - v_qty where id = v_product_id;
  end loop;

  v_points := floor(v_total * v_rate);
  update public.shop_profiles
    set points = points + v_points
    where id = v_user_id;

  select coalesce(sum(total),0) into v_spent
    from public.shop_orders
    where user_id = v_user_id and status <> '취소';
  update public.shop_profiles
    set grade = case
      when v_spent >= 3000000 then 'VIP'
      when v_spent >= 1000000 then 'GOLD'
      when v_spent >= 300000 then 'SILVER'
      else 'WELCOME'
    end
    where id = v_user_id;

  return jsonb_build_object('order_id', v_order_id, 'total', v_total, 'earned_points', v_points);
end;
$$;

revoke all on function public.shop_complete_order(jsonb) from public;
grant execute on function public.shop_complete_order(jsonb) to authenticated;
