-- 기존 SQL에서 상품 예시 데이터가 이미 들어갔다면 이 파일은 실행하지 않아도 됩니다.
-- shop_products 테이블이 비어 있을 때만 아래 INSERT를 실행하세요.
insert into public.shop_products (name, category, price, stock, image_url, is_active)
select * from (values
 ('AirPods Pro 2세대', 'AirPods', 329000, 20, 'img/airpods.png', true),
 ('iPad Air 11형 (M3)', 'iPad', 799000, 15, 'img/ipad.png', true),
 ('iPhone 16', 'iPhone', 1250000, 12, 'img/iphone.png', true),
 ('MacBook Air M4', 'MacBook', 1590000, 8, 'img/macbook.png', true)
) as v(name, category, price, stock, image_url, is_active)
where not exists (select 1 from public.shop_products);
