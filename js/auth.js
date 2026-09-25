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
   * Verifica se um endereço de e-mail está na lista de assinantes autorizados pela Kiwify
   * @param {string} email
   */
  const isEmailAuthorizedSubscriber = async (email) => {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();

    // Conta do Dono / Administrador sempre autorizada e liberada
    const adminEmails = ['luuizmorais@gmail.com', 'luiz@saldocerto.com.br'];
    if (adminEmails.includes(cleanEmail)) return true;

    if (!window.supabaseClient || !window.isSupabaseConfigured()) {
      return true; // Modo fallback se não houver Supabase ativo
    }

    try {
      // 1. Checa tabela de assinantes autorizados da Kiwify
      const { data: subData, error: subError } = await window.supabaseClient
        .from('authorized_subscribers')
        .select('id, status')
        .eq('email', cleanEmail)
        .eq('status', 'active')
        .maybeSingle();

      if (!subError && subData) {
        return true;
      }

      // 2. Checa tabela de perfis de usuários
      const { data: profData, error: profError } = await window.supabaseClient
        .from('profiles')
        .select('id, subscription_status')
        .eq('email', cleanEmail)
        .eq('subscription_status', 'active')
        .maybeSingle();

      if (!profError && profData) {
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[SaldoCerto Auth] Erro ao consultar assinante:', err);
      return false;
    }
  };

  /**
   * Modal bloqueador de acesso para usuários sem assinatura ativa (Paywall)
   */
  const showPaywallModal = (user) => {
    if (document.getElementById('paywallModalOverlay')) return;

    const email = user?.email || 'sua conta';
    const modalHtml = `
      <div id="paywallModalOverlay" class="modal-overlay active" style="z-index: 99999; backdrop-filter: blur(10px); background: rgba(11, 17, 32, 0.88); display: flex; align-items: center; justify-content: center;">
        <div class="modal-dialog" style="max-width: 480px; text-align: center; border: 1px solid var(--color-border); box-shadow: 0 25px 60px -15px rgba(0,0,0,0.6); margin: 16px;">
          <div style="padding: var(--space-8) var(--space-6);">
            <div style="width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%; background: rgba(220, 38, 38, 0.12); display: flex; align-items: center; justify-content: center; color: var(--color-danger);">
              <i data-lucide="lock" style="width: 30px; height: 30px;"></i>
            </div>
            
            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin-bottom: 8px;">
              Assinatura Necessária
            </h3>
            
            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 20px;">
              O e-mail <strong>${email}</strong> não possui uma assinatura ativa no SaldoCerto. Para ter acesso liberado a todos os gráficos, planejamento, relatórios e controle financeiro completo, assine agora por apenas <strong>R$ 19,90/mês</strong>.
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a href="https://pay.kiwify.com.br/uKfAHEc" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg" style="justify-content: center; font-weight: 700; font-size: 1rem; padding: 14px;">
                <i data-lucide="credit-card"></i>
                <span>Assinar SaldoCerto na Kiwify (R$ 19,90)</span>
              </a>

              <button type="button" class="btn btn-secondary" onclick="window.location.reload()" style="justify-content: center;">
                <i data-lucide="refresh-cw"></i>
                <span>Já paguei, verificar novamente</span>
              </button>

              <button type="button" class="btn btn-outline" onclick="SaldoCertoAuth.signOut()" style="justify-content: center; font-size: 12px; margin-top: 4px; border: none; color: var(--color-text-muted);">
                <i data-lucide="log-out"></i>
                <span>Sair desta conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  };

  /**
   * Checa se o usuário atual tem assinatura ativa
   * @param {Object} user
   */
  const checkSubscription = async (user) => {
    if (!user) return { active: false };

    // Dono / Administrador sempre liberado (Acesso Vitalício Master)
    const adminEmails = ['luuizmorais@gmail.com', 'luiz@saldocerto.com.br'];
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      return { active: true, plan: 'owner_lifetime' };
    }

    if (!window.supabaseClient || !window.isSupabaseConfigured()) {
      return { active: true, plan: 'offline' };
    }

    try {
      // 1. Checa status em profiles
      const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('subscription_status, kiwify_order_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile && profile.subscription_status === 'active') {
        return { active: true, profile };
      }

      // 2. Se profile ainda não está 'active', checa authorized_subscribers pelo e-mail
      const { data: subData } = await window.supabaseClient
        .from('authorized_subscribers')
        .select('id, status, order_id')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'active')
        .maybeSingle();

      if (subData) {
        // Atualiza profile em segundo plano
        await window.supabaseClient
          .from('profiles')
          .update({ subscription_status: 'active', kiwify_order_id: subData.order_id })
          .eq('user_id', user.id);

        return { active: true, subscriber: subData };
      }

      return { active: false, reason: 'unpaid' };
    } catch (err) {
      console.warn('[SaldoCerto Auth] Erro ao checar assinatura:', err);
      return { active: true, fallback: true };
    }
  };

  /**
   * Guarda de Rotas Protegidas:
   * Bloqueia acesso a páginas privadas (dashboard, receitas, contas, etc) caso o usuário não esteja logado
   * OU caso sua assinatura não esteja ativa.
   */
  const requireAuth = async () => {
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      console.info('[SaldoCerto Auth] Supabase com credenciais padrão ou offline.');
      return null;
    }

    const session = await getSession();
    if (!session || !session.user) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?redirect=${currentPath}`;
      return null;
    }

    // Validação estrita de assinatura paga (Paywall Guard)
    const sub = await checkSubscription(session.user);
    if (!sub || !sub.active) {
      showPaywallModal(session.user);
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
        const publicPages = ['index.html', 'login.html', 'cadastro.html', 'obrigado.html', 'recuperar-senha.html'];
        const isPublic = publicPages.some(page => window.location.pathname.endsWith(page) || window.location.pathname === '/');
        if (!isPublic) {
          window.location.href = 'login.html';
        }
      } else if (event === 'SIGNED_IN') {
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
    redirectIfAuthenticated,
    isEmailAuthorizedSubscriber,
    checkSubscription,
    showPaywallModal
  };
})();

// Expõe globalmente
window.SaldoCertoAuth = SaldoCertoAuth;
