/**
 * SaldoCerto - Cliente Supabase
 * Inicialização e configuração do Supabase Client para autenticação e banco de dados.
 * 
 * ATENÇÃO DE SEGURANÇA:
 * Utilize apenas a URL pública e a Anon Key / Publishable Key.
 * NUNCA insira service_role, secret keys ou credenciais administrativas no frontend.
 */

// Permite obter credenciais via localStorage (configurações do app), variáveis globais ou constantes padrão
const DEFAULT_SUPABASE_URL = 'https://seu-projeto.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sua-chave-anon-publica-aqui';

// Carrega de localStorage caso o usuário tenha configurado via tela de configurações, ou usa padrões
const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('saldocerto_supabase_url') : null;
const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('saldocerto_supabase_anon_key') : null;

const SUPABASE_URL = (typeof window !== 'undefined' && window.__ENV_SUPABASE_URL) 
  || storedUrl 
  || DEFAULT_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY = (typeof window !== 'undefined' && window.__ENV_SUPABASE_ANON_KEY) 
  || storedKey 
  || DEFAULT_SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase utilizando a biblioteca oficial (@supabase/supabase-js via CDN)
let supabaseClient = null;

if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    });
  } catch (err) {
    console.error('[SaldoCerto Supabase] Erro ao inicializar cliente Supabase:', err);
  }
} else {
  console.warn('[SaldoCerto Supabase] Biblioteca @supabase/supabase-js não encontrada no escopo global. Certifique-se de incluir a tag script CDN antes de supabase.js.');
}

/**
 * Verifica se o Supabase está com credenciais reais configuradas (diferentes do placeholder)
 */
function isSupabaseConfigured() {
  if (!supabaseClient) return false;
  const isDefaultUrl = SUPABASE_URL.includes('seu-projeto.supabase.co') || SUPABASE_URL === 'SUA_URL';
  const isDefaultKey = SUPABASE_PUBLISHABLE_KEY.includes('sua-chave-anon') || SUPABASE_PUBLISHABLE_KEY === 'SUA_CHAVE_PUBLICAVEL';
  return !isDefaultUrl && !isDefaultKey && SUPABASE_URL.startsWith('http');
}

/**
 * Salva credenciais do Supabase no navegador (para facilitar conexão sem rebuild)
 */
function configureSupabaseCredentials(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('URL e Chave Pública são obrigatórias.');
  }
  localStorage.setItem('saldocerto_supabase_url', url.trim());
  localStorage.setItem('saldocerto_supabase_anon_key', anonKey.trim());
  window.location.reload();
}

/**
 * Limpa credenciais salvas e restaura padrões
 */
function resetSupabaseCredentials() {
  localStorage.removeItem('saldocerto_supabase_url');
  localStorage.removeItem('saldocerto_supabase_anon_key');
  window.location.reload();
}

// Expõe globalmente
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.configureSupabaseCredentials = configureSupabaseCredentials;
window.resetSupabaseCredentials = resetSupabaseCredentials;
