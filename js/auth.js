/**
 * SaldoCerto - Módulo de Autenticação Supabase Auth
 * Gerenciamento seguro de sessão, login, cadastro, logout e recuperação de senha.
 */

const SaldoCertoAuth = (() => {

  /**
   * Obtém a sessão atual
   */
  const getSession = async () => {
    if (!window.supabaseClient) {
      console.warn('[SaldoCerto Auth] Supabase Client não disponível.');
      return null;
    }
    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (error) {
        console.error('[SaldoCerto Auth] Erro ao obter sessão:', error);
        return null;
      }
      return session;
    } catch (err) {
      console.error('[SaldoCerto Auth] Exceção ao obter sessão:', err);
      return null;
    }
  };

  /**
   * Obtém o usuário autenticado atualmente
   */
  const getCurrentUser = async () => {
    const session = await getSession();
    return session?.user || null;
  };

  /**
   * Cadastro de novo usuário
   * @param {string} fullName Nome completo do usuário
   * @param {string} email E-mail de acesso
   * @param {string} password Senha
   */
  const signUp = async (fullName, email, password) => {
    if (!window.supabaseClient) {
      throw new Error('Supabase Client não inicializado. Verifique js/supabase.js');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const { data, error } = await window.supabaseClient.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName
        },
        emailRedirectTo: `${window.location.origin}/onboarding.html`
      }
    });

    if (error) {
      throw error;
    }

    // Se o usuário foi criado e já há sessão ativa (confirmação de email desligada no Supabase)
    if (data.session || data.user) {
      // Criação ou garantia de profile na tabela profiles caso trigger ainda não tenha executado
      try {
        if (data.user) {
          await window.supabaseClient.from('profiles').upsert({
            user_id: data.user.id,
            full_name: cleanName,
            email: cleanEmail,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }
      } catch (profileErr) {
        console.warn('[SaldoCerto Auth] Aviso ao verificar profile:', profileErr);
      }
    }

    return data;
  };

  /**
   * Login com E-mail e Senha
   * @param {string} email
   * @param {string} password
   */
  const signIn = async (email, password) => {
    if (!window.supabaseClient) {
      throw new Error('Supabase Client não inicializado.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      throw error;
    }

    return data;
  };

  /**
   * Logout da aplicação e redirecionamento para index.html
   */
  const signOut = async () => {
    try {
      if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (err) {
      console.warn('[SaldoCerto Auth] Erro ao encerrar sessão no Supabase:', err);
    } finally {
      // Limpa dados de sessão temporários se houver
      window.location.href = 'index.html';
    }
  };

  /**
   * Solicitação de recuperação de senha por e-mail
   * @param {string} email
   */
  const resetPassword = async (email) => {
    if (!window.supabaseClient) {
      throw new Error('Supabase Client não inicializado.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/recuperar-senha.html?reset=true`
    });

    if (error) {
      throw error;
    }

    return data;
  };

  /**
   * Atualização de senha para usuário conectado
   * @param {string} newPassword
   */
  const updatePassword = async (newPassword) => {
    if (!window.supabaseClient) {
      throw new Error('Supabase Client não inicializado.');
    }

    const { data, error } = await window.supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    return data;
  };

  /**
   * Guarda de Rotas Protegidas:
   * Bloqueia acesso a páginas privadas (dashboard, receitas, contas, etc) caso o usuário não esteja logado.
   */
  const requireAuth = async () => {
    // Se o cliente Supabase não estiver configurado com credenciais válidas,
    // verifica se deve alertar ou dar fallback amigável
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      console.info('[SaldoCerto Auth] Supabase com credenciais padrão ou offline.');
      // Permite navegação local com banner informativo na tela de configuração
      return null;
    }

    const session = await getSession();
    if (!session || !session.user) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?redirect=${currentPath}`;
      return null;
    }

    return session.user;
  };

  /**
   * Guarda de Rotas Públicas de Auth:
   * Se o usuário já estiver logado e acessar login.html ou cadastro.html, redireciona para dashboard.html
   */
  const redirectIfAuthenticated = async () => {
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      return;
    }

    const session = await getSession();
    if (session && session.user) {
      window.location.href = 'dashboard.html';
    }
  };

  /**
   * Listener global de alterações de autenticação
   */
  const initAuthListener = () => {
    if (!window.supabaseClient) return;

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        const publicPages = ['index.html', 'login.html', 'cadastro.html', 'recuperar-senha.html'];
        const isPublic = publicPages.some(page => window.location.pathname.endsWith(page) || window.location.pathname === '/');
        if (!isPublic) {
          window.location.href = 'login.html';
        }
      } else if (event === 'SIGNED_IN') {
        // Dispara evento para reatualizar componentes e UI
        window.dispatchEvent(new CustomEvent('saldocerto:authChanged', { detail: { session } }));
      }
    });
  };

  // Inicializa o listener de autenticação
  initAuthListener();

  return {
    getSession,
    getCurrentUser,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    requireAuth,
    redirectIfAuthenticated
  };
})();

// Expõe globalmente
window.SaldoCertoAuth = SaldoCertoAuth;
