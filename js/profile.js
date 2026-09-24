/**
 * SaldoCerto - Módulo de Perfil e Onboarding
 * Gerenciamento do perfil do usuário e fluxo de configuração inicial no Supabase.
 */

const SaldoCertoProfile = (() => {

  /**
   * Obtém o perfil do usuário logado na tabela public.profiles
   */
  const getProfile = async () => {
    if (!window.supabaseClient) {
      console.warn('[SaldoCerto Profile] Supabase não inicializado.');
      return null;
    }

    try {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) return null;

      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[SaldoCerto Profile] Erro ao buscar perfil:', error);
        return null;
      }

      // Se o perfil não existir ainda, tenta criar um padrão
      if (!data) {
        const newProfile = {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          currency: 'BRL',
          theme: localStorage.getItem('saldocerto_theme') || 'light'
        };

        const { data: inserted, error: insertErr } = await window.supabaseClient
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertErr) {
          console.warn('[SaldoCerto Profile] Não foi possível criar perfil inicial:', insertErr);
          return newProfile;
        }
        return inserted;
      }

      return data;
    } catch (err) {
      console.error('[SaldoCerto Profile] Exceção em getProfile:', err);
      return null;
    }
  };

  /**
   * Atualiza dados do perfil do usuário logado
   * @param {Object} updates
   */
  const updateProfile = async (updates) => {
    if (!window.supabaseClient) throw new Error('Supabase não inicializado.');

    const user = await SaldoCertoAuth.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await window.supabaseClient
      .from('profiles')
      .update(payload)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[SaldoCerto Profile] Erro ao atualizar perfil:', error);
      throw error;
    }

    // Atualiza tema localmente se alterado
    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
      localStorage.setItem('saldocerto_theme', updates.theme);
    }

    // Sincroniza a interface
    syncUserProfileUI(data);

    return data;
  };

  /**
   * Salva os dados do fluxo de onboarding inicial
   * @param {Object} data Dados informados no formulário de boas-vindas
   */
  const saveOnboarding = async (onboardingData) => {
    if (!window.supabaseClient) throw new Error('Supabase não inicializado.');

    const user = await SaldoCertoAuth.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado.');

    // 1. Atualiza perfil com renda, objetivo e marca onboarding como concluído
    const profileUpdates = {
      full_name: onboardingData.fullName || user.user_metadata?.full_name || '',
      monthly_income: Number(onboardingData.monthlyIncome) || 0,
      financial_goal: onboardingData.financialGoal || '',
      monthly_savings_target: Number(onboardingData.monthlySavings) || 0,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    };

    const { error: profileErr } = await window.supabaseClient
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', user.id);

    if (profileErr) {
      console.error('[SaldoCerto Profile] Erro ao salvar perfil no onboarding:', profileErr);
      throw profileErr;
    }

    // 2. Se o usuário cadastrou uma conta bancária inicial
    if (onboardingData.hasAccount && onboardingData.accountName) {
      const initialBal = Number(onboardingData.accountBalance) || 0;
      await window.supabaseClient.from('accounts').insert({
        user_id: user.id,
        name: onboardingData.accountName,
        bank_name: onboardingData.accountName,
        type: onboardingData.accountType || 'checking',
        initial_balance: initialBal,
        current_balance: initialBal,
        color: '#16A34A'
      });
    }

    // 3. Se o usuário cadastrou um cartão de crédito inicial
    if (onboardingData.hasCard && onboardingData.cardName) {
      const limit = Number(onboardingData.cardLimit) || 0;
      await window.supabaseClient.from('credit_cards').insert({
        user_id: user.id,
        name: onboardingData.cardName,
        bank_name: onboardingData.cardName,
        credit_limit: limit,
        closing_day: 10,
        due_day: 17,
        color: '#8A05BE'
      });
    }

    // 4. Se o usuário definiu uma meta financeira inicial
    if (onboardingData.financialGoal && onboardingData.goalTargetAmount) {
      await window.supabaseClient.from('goals').insert({
        user_id: user.id,
        name: onboardingData.financialGoal,
        target_amount: Number(onboardingData.goalTargetAmount) || 5000,
        current_amount: 0,
        color: '#2563EB',
        icon: 'target'
      });
    }

    return true;
  };

  /**
   * Sincroniza o cabeçalho e sidebar do app com as informações do usuário
   */
  const syncUserProfileUI = async (profileData = null) => {
    let profile = profileData;
    if (!profile) {
      profile = await getProfile();
    }
    if (!profile) return;

    const nameElements = document.querySelectorAll('.user-name, [data-user-name]');
    const avatarElements = document.querySelectorAll('.user-avatar, [data-user-avatar]');
    const greetingTitle = document.querySelector('.greeting-title');

    const name = profile.full_name || 'Usuário';
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SC';

    nameElements.forEach(el => { el.textContent = name; });
    avatarElements.forEach(el => { el.textContent = initials; });
    if (greetingTitle) {
      greetingTitle.textContent = `Olá, ${name.split(' ')[0]} 👋`;
    }
  };

  return {
    getProfile,
    updateProfile,
    saveOnboarding,
    syncUserProfileUI
  };
})();

// Expõe globalmente
window.SaldoCertoProfile = SaldoCertoProfile;
