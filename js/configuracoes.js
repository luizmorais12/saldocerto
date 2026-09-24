/**
 * SaldoCerto - Módulo de Configurações, Perfil e Dark Mode
 */

const ConfiguracoesModule = (() => {
  const STORAGE_KEY = 'saldocerto_db_v1';

  const loadSettingsIntoForm = () => {
    const state = SaldoCerto.getState();
    const settings = state.settings || { userName: 'Luiz Morais', userEmail: 'luiz@saldocerto.com.br' };

    const nameInput = document.getElementById('settingUserName');
    const emailInput = document.getElementById('settingUserEmail');

    if (nameInput) nameInput.value = settings.userName || 'Luiz Morais';
    if (emailInput) emailInput.value = settings.userEmail || 'luiz@saldocerto.com.br';

    updateAvatarDisplay(settings.userName || 'Luiz Morais');
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

  const setTheme = (theme) => {
    SaldoCerto.initTheme();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saldocerto_theme', theme);
    
    const state = SaldoCerto.getState();
    state.settings = state.settings || {};
    state.settings.theme = theme;
    SaldoCerto.saveData();

    updateThemePickerDisplay();
    SaldoCerto.showToast(`Modo ${theme === 'dark' ? 'escuro' : 'claro'} ativado.`, 'info');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const name = document.getElementById('settingUserName').value.trim();
    const email = document.getElementById('settingUserEmail').value.trim();

    const state = SaldoCerto.getState();
    state.settings = state.settings || {};
    state.settings.userName = name;
    state.settings.userEmail = email;

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
      'ATENÇÃO: Tem certeza que deseja apagar todos os dados financeiros? Essa ação é irreversível e restaurará os dados de fábrica.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        SaldoCerto.showToast('Todos os dados foram resetados. Reiniciando...', 'info');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      }
    );
  };

  const init = () => {
    SaldoCerto.initShell('configuracoes');
    loadSettingsIntoForm();
  };

  return {
    init,
    setTheme,
    handleSaveProfile,
    handleSavePreferences,
    exportJSON,
    importJSON,
    handleClearAllData
  };
})();

document.addEventListener('DOMContentLoaded', ConfiguracoesModule.init);
