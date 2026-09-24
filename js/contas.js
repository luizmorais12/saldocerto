/**
 * SaldoCerto - Módulo de Contas Bancárias (Supabase Integrado)
 * CRUD completo e transferências entre contas com persistência no PostgreSQL e RLS.
 */

const ContasModule = (() => {

  /**
   * Busca contas bancárias do usuário no Supabase
   */
  const getAccounts = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Contas Supabase] Erro ao buscar contas:', error);
          SaldoCerto.showToast('Erro ao carregar contas do banco.', 'danger');
          return SaldoCerto.getState().accounts;
        }

        // Mapeia formato do banco para o estado da aplicação
        const mapped = (data || []).map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          bank_name: a.bank_name || a.name,
          balance: Number(a.current_balance || a.initial_balance || 0),
          color: a.color || '#16A34A',
          icon: a.type === 'wallet' || a.type === 'cash' ? 'banknote' : 'landmark'
        }));

        SaldoCerto.getState().accounts = mapped;
        return mapped;
      } catch (err) {
        console.error('[Contas Supabase] Exceção:', err);
        return SaldoCerto.getState().accounts;
      }
    }
    return SaldoCerto.getState().accounts;
  };

  /**
   * Cria uma nova conta no Supabase
   */
  const createAccount = async ({ name, type, balance, color }) => {
    const numBalance = parseFloat(balance) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('accounts')
        .insert({
          user_id: user.id,
          name: name.trim(),
          type: type || 'checking',
          bank_name: name.trim(),
          initial_balance: numBalance,
          current_balance: numBalance,
          color: color || '#16A34A'
        })
        .select()
        .single();

      if (error) {
        console.error('[Contas Supabase] Erro ao criar conta:', error);
        throw error;
      }

      const newAcc = {
        id: data.id,
        name: data.name,
        type: data.type,
        bank_name: data.bank_name,
        balance: Number(data.current_balance),
        color: data.color,
        icon: 'landmark'
      };

      SaldoCerto.getState().accounts.push(newAcc);
      return newAcc;
    } else {
      return SaldoCerto.addAccount({ name, type, balance: numBalance, color });
    }
  };

  /**
   * Atualiza dados de uma conta existente no Supabase
   */
  const updateAccount = async (id, { name, type, balance, color }) => {
    const numBalance = parseFloat(balance) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('accounts')
        .update({
          name: name.trim(),
          type: type,
          bank_name: name.trim(),
          current_balance: numBalance,
          color: color,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[Contas Supabase] Erro ao atualizar conta:', error);
        throw error;
      }

      const state = SaldoCerto.getState();
      const idx = state.accounts.findIndex(a => a.id === id);
      if (idx !== -1) {
        state.accounts[idx] = {
          ...state.accounts[idx],
          name: data.name,
          type: data.type,
          balance: Number(data.current_balance),
          color: data.color
        };
      }
      return data;
    } else {
      const state = SaldoCerto.getState();
      const acc = state.accounts.find(a => a.id === id);
      if (acc) {
        acc.name = name;
        acc.type = type;
        acc.balance = numBalance;
        acc.color = color;
        SaldoCerto.saveData();
      }
      return acc;
    }
  };

  /**
   * Exclui uma conta bancária
   */
  const deleteAccount = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Contas Supabase] Erro ao deletar conta:', error);
        throw error;
      }
    }

    SaldoCerto.deleteAccount(id);
  };

  /**
   * Realiza transferência entre contas:
   * - Reduz saldo da origem
   * - Aumenta saldo do destino
   * - Registra operações na tabela transactions
   */
  const transferBetweenAccounts = async (fromId, toId, amount) => {
    const val = parseFloat(amount);
    const state = SaldoCerto.getState();
    const fromAcc = state.accounts.find(a => a.id === fromId);
    const toAcc = state.accounts.find(a => a.id === toId);

    if (!fromAcc || !toAcc || isNaN(val) || val <= 0) {
      SaldoCerto.showToast('Dados de transferência inválidos.', 'danger');
      return false;
    }

    if (fromAcc.balance < val) {
      SaldoCerto.showToast(`Saldo insuficiente em ${fromAcc.name}.`, 'warning');
      return false;
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) return false;

      try {
        const newFromBalance = fromAcc.balance - val;
        const newToBalance = toAcc.balance + val;

        // Atualiza conta de origem
        await window.supabaseClient
          .from('accounts')
          .update({ current_balance: newFromBalance })
          .eq('id', fromId)
          .eq('user_id', user.id);

        // Atualiza conta de destino
        await window.supabaseClient
          .from('accounts')
          .update({ current_balance: newToBalance })
          .eq('id', toId)
          .eq('user_id', user.id);

        // Registra saída da conta origem
        await window.supabaseClient
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: fromId,
            type: 'expense',
            description: `Transferência para ${toAcc.name}`,
            amount: val,
            category: 'Outros',
            payment_method: 'Transferência',
            transaction_date: new Date().toISOString().split('T')[0],
            notes: 'Transferência entre contas próprias'
          });

        // Registra entrada na conta destino
        await window.supabaseClient
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: toId,
            type: 'income',
            description: `Transferência recebida de ${fromAcc.name}`,
            amount: val,
            category: 'Outros',
            payment_method: 'Transferência',
            transaction_date: new Date().toISOString().split('T')[0],
            notes: 'Transferência entre contas próprias'
          });

        fromAcc.balance = newFromBalance;
        toAcc.balance = newToBalance;
        SaldoCerto.showToast(`Transferência de ${SaldoCerto.formatCurrency(val)} realizada com sucesso!`, 'success');
        return true;
      } catch (err) {
        console.error('[Contas Supabase] Erro ao transferir:', err);
        SaldoCerto.showToast('Erro ao registrar transferência no banco.', 'danger');
        return false;
      }
    }

    return SaldoCerto.transferBetweenAccounts(fromId, toId, amount);
  };

  /**
   * Renderização visual da lista de contas e métricas no DOM
   */
  const renderAccounts = async () => {
    const grid = document.getElementById('accountsCardsGrid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-8); color: var(--color-text-muted);">
          <div class="skeleton" style="height: 120px; border-radius: var(--radius-lg); margin-bottom: var(--space-4);"></div>
          <span>Carregando suas contas...</span>
        </div>
      `;
    }

    const accounts = await getAccounts();

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

    const statTotal = document.getElementById('statTotalAccountBalance');
    if (statTotal) statTotal.textContent = SaldoCerto.formatCurrency(totalBalance);
    const statCount = document.getElementById('statAccountsCount');
    if (statCount) statCount.textContent = count;
    const statTop = document.getElementById('statTopAccount');
    if (statTop) statTop.textContent = topAccName;
    const statTopBal = document.getElementById('statTopAccountBalance');
    if (statTopBal) statTopBal.textContent = SaldoCerto.formatCurrency(topAccBalance);

    const badge = document.getElementById('accountsBadgeCount');
    if (badge) badge.textContent = `${count} ${count === 1 ? 'conta' : 'contas'}`;

    if (!grid) return;

    if (accounts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="landmark"></i></div>
            <h4 class="empty-state-title">Nenhuma conta bancária cadastrada</h4>
            <p class="empty-state-desc">Cadastre suas contas correntes, contas digitais ou carteiras físicas para controlar seus saldos em tempo real.</p>
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
    if (window.lucide) window.lucide.createIcons();
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
    if (window.lucide) window.lucide.createIcons();
  };

  const handleSaveAccount = async (e) => {
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

    try {
      if (editId) {
        await updateAccount(editId, { name, type, balance, color });
        SaldoCerto.showToast(`Conta "${name}" atualizada!`, 'success');
      } else {
        await createAccount({ name, type, balance, color });
        SaldoCerto.showToast(`Conta "${name}" criada com sucesso!`, 'success');
      }

      SaldoCerto.closeModal('accountModal');
      await renderAccounts();
    } catch (err) {
      SaldoCerto.showToast('Não foi possível salvar a conta. Tente novamente.', 'danger');
    }
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta conta? O histórico associado permanecerá intacto.', async () => {
      try {
        await deleteAccount(id);
        SaldoCerto.showToast('Conta excluída com sucesso.', 'info');
        await renderAccounts();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir conta.', 'danger');
      }
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

  const handleTransfer = async (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transferFromAcc').value;
    const toId = document.getElementById('transferToAcc').value;
    const amount = document.getElementById('transferAmount').value;

    if (fromId === toId) {
      SaldoCerto.showToast('A conta de origem e destino não podem ser as mesmas.', 'warning');
      return;
    }

    const success = await transferBetweenAccounts(fromId, toId, amount);
    if (success) {
      SaldoCerto.closeModal('transferModal');
      document.getElementById('transferForm').reset();
      await renderAccounts();
    }
  };

  const init = async () => {
    SaldoCerto.initShell('contas');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    await renderAccounts();
  };

  return {
    init,
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    transferBetweenAccounts,
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
