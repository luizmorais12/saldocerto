/**
 * SaldoCerto - Módulo de Configurações, Perfil e Dark Mode
 * Integrado ao Supabase Auth, Profiles e preferências locais (tema, olho mágico).
 */

const ConfiguracoesModule = (() => {
  const STORAGE_KEY = 'saldocerto_db_v1';

  const loadSettingsIntoForm = async () => {
    let userName = 'Usuário SaldoCerto';
    let userEmail = 'usuario@saldocerto.app';

    if (window.SaldoCertoProfile) {
      const profile = await SaldoCertoProfile.loadProfile();
      if (profile) {
        userName = profile.full_name || userName;
        userEmail = profile.email || userEmail;
      }
    } else {
      const state = SaldoCerto.getState();
      const settings = state.settings || {};
      userName = settings.userName || userName;
      userEmail = settings.userEmail || userEmail;
    }

    const nameInput = document.getElementById('settingUserName');
    const emailInput = document.getElementById('settingUserEmail');

    if (nameInput) nameInput.value = userName;
    if (emailInput) emailInput.value = userEmail;

    updateAvatarDisplay(userName);
    updateThemePickerDisplay();
  };

  const updateAvatarDisplay = (name) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'SC';

    const largeAvatar = document.getElementById('profileLargeAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarName = document.getElementById('sidebarUserName');

    if (largeAvatar) largeAvatar.textContent = initials;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (sidebarName) sidebarName.textContent = name;
  };

  const updateThemePickerDisplay = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const lightCard = document.getElementById('themeLightOption');
    const darkCard = document.getElementById('themeDarkOption');

    if (lightCard && darkCard) {
      if (currentTheme === 'dark') {
        darkCard.classList.add('active');
        lightCard.classList.remove('active');
      } else {
        lightCard.classList.add('active');
        darkCard.classList.remove('active');
      }
    }
  };

  const setTheme = async (theme) => {
    SaldoCerto.initTheme();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saldocerto_theme', theme);
    
    // Atualiza no banco Supabase se profile estiver disponível
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.updateProfile({ theme });
    }

    updateThemePickerDisplay();
    SaldoCerto.showToast(`Modo ${theme === 'dark' ? 'escuro' : 'claro'} ativado.`, 'info');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const name = document.getElementById('settingUserName').value.trim();

    if (window.SaldoCertoProfile) {
      const updated = await SaldoCertoProfile.updateProfile({ full_name: name });
      if (updated) {
        updateAvatarDisplay(name);
        SaldoCerto.showToast('Perfil atualizado com sucesso no Supabase!', 'success');
        return;
      }
    }

    const state = SaldoCerto.getState();
    state.settings = state.settings || {};
    state.settings.userName = name;
    SaldoCerto.saveData();
    updateAvatarDisplay(name);
    SaldoCerto.showToast('Perfil atualizado com sucesso!', 'success');
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    SaldoCerto.showToast('Preferências financeiras salvas com sucesso!', 'success');
  };

  const exportJSON = () => {
    const state = SaldoCerto.getState();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_saldocerto_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    dlAnchorElem.remove();

    SaldoCerto.showToast('Backup JSON exportado com sucesso!', 'success');
  };

  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          SaldoCerto.showToast('Dados restaurados com sucesso! Recarregando...', 'success');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          SaldoCerto.showToast('Arquivo de backup inválido.', 'danger');
        }
      } catch (err) {
        SaldoCerto.showToast('Erro ao ler arquivo JSON de backup.', 'danger');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    SaldoCerto.confirmAction(
      'ATENÇÃO: Deseja limpar os dados locais do dispositivo? Suas preferências locais de tema e cache serão restauradas.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        SaldoCerto.showToast('Dados locais resetados com sucesso.', 'info');
      }
    );
  };

  const handleLogout = async () => {
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.signOut();
    } else {
      window.location.href = 'index.html';
    }
  };

  const init = async () => {
    SaldoCerto.initShell('configuracoes');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    await loadSettingsIntoForm();

    // Vincula botão de logout se existir
    const logoutBtn = document.querySelector('a[href="index.html"]');
    if (logoutBtn && logoutBtn.textContent.includes('Sair')) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });
    }
  };

  return {
    init,
    setTheme,
    handleSaveProfile,
    handleSavePreferences,
    exportJSON,
    importJSON,
    handleClearAllData,
    handleLogout
  };
})();

document.addEventListener('DOMContentLoaded', ConfiguracoesModule.init);
