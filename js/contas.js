/**
 * SaldoCerto - Módulo de Contas Bancárias
 */

const ContasModule = (() => {
  const renderAccounts = () => {
    const state = SaldoCerto.getState();
    const accounts = state.accounts;

    // Métricas
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const count = accounts.length;

    let topAccName = '—';
    let topAccBalance = 0;

    accounts.forEach(a => {
      if (a.balance > topAccBalance) {
        topAccBalance = a.balance;
        topAccName = a.name;
      }
    });

    document.getElementById('statTotalAccountBalance').textContent = SaldoCerto.formatCurrency(totalBalance);
    document.getElementById('statAccountsCount').textContent = count;
    document.getElementById('statTopAccount').textContent = topAccName;
    document.getElementById('statTopAccountBalance').textContent = SaldoCerto.formatCurrency(topAccBalance);

    const badge = document.getElementById('accountsBadgeCount');
    if (badge) badge.textContent = `${count} ${count === 1 ? 'conta' : 'contas'}`;

    // Grid de Cards
    const grid = document.getElementById('accountsCardsGrid');
    if (!grid) return;

    if (accounts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="landmark"></i></div>
            <h4 class="empty-state-title">Nenhuma conta bancária cadastrada</h4>
            <p class="empty-state-desc">Cadastre suas contas correntes, contas digitais ou carteiras físicas para controlar seus saldos.</p>
            <button class="btn btn-primary btn-sm" onclick="ContasModule.openAddAccountModal()">
              <i data-lucide="plus-circle"></i> Cadastrar Primeira Conta
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = accounts.map(a => {
      const cardColor = a.color || '#16A34A';
      return `
        <div class="card" style="border-top: 4px solid ${cardColor}; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
              <div>
                <span class="badge" style="background-color: var(--color-bg-subtle); color: var(--color-text-secondary); margin-bottom: 6px;">
                  ${a.type}
                </span>
                <h4 style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text);">${a.name}</h4>
              </div>
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: ${cardColor}15; color: ${cardColor}; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="${a.icon || 'landmark'}"></i>
              </div>
            </div>

            <div style="margin: var(--space-4) 0;">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Saldo disponível</span>
              <div style="font-size: 1.6rem; font-weight: 800; color: ${a.balance >= 0 ? 'var(--color-text)' : 'var(--color-danger)'}; letter-spacing: -0.02em;">
                ${SaldoCerto.formatCurrency(a.balance)}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
            <button class="btn btn-outline btn-sm" onclick="ContasModule.openTransferModal('${a.id}')">
              <i data-lucide="arrow-left-right"></i> Transferir
            </button>
            <div style="display: flex; gap: var(--space-1);">
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Editar conta" onclick="ContasModule.openEditAccountModal('${a.id}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir conta" onclick="ContasModule.handleDelete('${a.id}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openAddAccountModal = () => {
    document.getElementById('accountForm').reset();
    document.getElementById('editAccountId').value = '';
    document.getElementById('accountModalTitle').innerHTML = '<i data-lucide="landmark" class="text-primary"></i> Nova Conta';
    SaldoCerto.openModal('accountModal');
  };

  const openEditAccountModal = (id) => {
    const state = SaldoCerto.getState();
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('editAccountId').value = acc.id;
    document.getElementById('accName').value = acc.name;
    document.getElementById('accType').value = acc.type;
    document.getElementById('accBalance').value = acc.balance;
    document.getElementById('accColor').value = acc.color || '#16A34A';
    document.getElementById('accountModalTitle').innerHTML = '<i data-lucide="edit-3" class="text-primary"></i> Editar Conta';

    SaldoCerto.openModal('accountModal');
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    const editId = document.getElementById('editAccountId').value;
    const name = document.getElementById('accName').value.trim();
    const type = document.getElementById('accType').value;
    const balance = parseFloat(document.getElementById('accBalance').value) || 0;
    const color = document.getElementById('accColor').value;

    if (!name) {
      SaldoCerto.showToast('Informe o nome da instituição.', 'warning');
      return;
    }

    const state = SaldoCerto.getState();

    if (editId) {
      const acc = state.accounts.find(a => a.id === editId);
      if (acc) {
        acc.name = name;
        acc.type = type;
        acc.balance = balance;
        acc.color = color;
        SaldoCerto.saveData();
        SaldoCerto.showToast(`Conta "${acc.name}" atualizada!`, 'success');
      }
    } else {
      SaldoCerto.addAccount({ name, type, balance, color });
    }

    SaldoCerto.closeModal('accountModal');
    renderAccounts();
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta conta? O histórico associado permanecerá intacto.', () => {
      SaldoCerto.deleteAccount(id);
      renderAccounts();
    });
  };

  const openTransferModal = (defaultFromId = '') => {
    const state = SaldoCerto.getState();
    const fromSelect = document.getElementById('transferFromAcc');
    const toSelect = document.getElementById('transferToAcc');

    if (!fromSelect || !toSelect) return;

    fromSelect.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.name} (${SaldoCerto.formatCurrency(a.balance)})</option>`).join('');
    toSelect.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.name} (${SaldoCerto.formatCurrency(a.balance)})</option>`).join('');

    if (defaultFromId) fromSelect.value = defaultFromId;
    if (state.accounts.length > 1 && fromSelect.value === toSelect.value) {
      toSelect.selectedIndex = 1;
    }

    SaldoCerto.openModal('transferModal');
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transferFromAcc').value;
    const toId = document.getElementById('transferToAcc').value;
    const amount = document.getElementById('transferAmount').value;

    if (fromId === toId) {
      SaldoCerto.showToast('A conta de origem e destino não podem ser as mesmas.', 'warning');
      return;
    }

    const success = SaldoCerto.transferBetweenAccounts(fromId, toId, amount);
    if (success) {
      SaldoCerto.closeModal('transferModal');
      document.getElementById('transferForm').reset();
      renderAccounts();
    }
  };

  const init = () => {
    SaldoCerto.initShell('contas');
    renderAccounts();
  };

  return {
    init,
    renderAccounts,
    openAddAccountModal,
    openEditAccountModal,
    handleSaveAccount,
    handleDelete,
    openTransferModal,
    handleTransfer
  };
})();

document.addEventListener('DOMContentLoaded', ContasModule.init);
