// Supabase 프로젝트 연결 설정
// Publishable key는 브라우저 공개용 키만 사용하세요. Secret key는 절대 넣지 마세요.
const SUPABASE_URL = 'https://tglnmzmbvokbycjwfyar.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hGp3ez6hOHuxslXwJWhZKg_A5Qg4cA2';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
