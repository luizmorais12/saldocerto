/**
 * SaldoCerto - Módulo de Metas Financeiras (Supabase Integrado)
 * CRUD completo, aportes inteligentes e cálculo de progresso com RLS.
 */

const MetasModule = (() => {

  /**
   * Busca todas as metas do usuário no Supabase
   */
  const getGoals = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('goals')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Metas Supabase] Erro ao buscar metas:', error);
          return SaldoCerto.getState().goals || [];
        }

        const mapped = (data || []).map(g => ({
          id: g.id,
          name: g.name,
          category: g.description || 'Objetivo',
          targetAmount: Number(g.target_amount),
          currentAmount: Number(g.current_amount || 0),
          deadline: g.deadline || '',
          color: g.color || '#16A34A',
          icon: g.icon || 'target'
        }));

        SaldoCerto.getState().goals = mapped;
        return mapped;
      } catch (err) {
        console.error('[Metas Supabase] Exceção em getGoals:', err);
        return SaldoCerto.getState().goals || [];
      }
    }
    return SaldoCerto.getState().goals || [];
  };

  /**
   * Cria uma nova meta no Supabase
   */
  const createGoal = async (goalData) => {
    const target = parseFloat(goalData.targetAmount) || 0;
    const current = parseFloat(goalData.currentAmount) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('goals')
        .insert({
          user_id: user.id,
          name: goalData.name.trim(),
          description: goalData.category || 'Objetivo',
          target_amount: target,
          current_amount: current,
          deadline: goalData.deadline || null,
          color: goalData.color || '#16A34A',
          icon: goalData.icon || 'target'
        })
        .select()
        .single();

      if (error) {
        console.error('[Metas Supabase] Erro ao criar meta:', error);
        throw error;
      }

      const created = {
        id: data.id,
        name: data.name,
        category: data.description,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        deadline: data.deadline,
        color: data.color,
        icon: data.icon
      };

      SaldoCerto.getState().goals.push(created);
      return created;
    } else {
      return SaldoCerto.addGoal(goalData);
    }
  };

  /**
   * Atualiza dados de uma meta existente
   */
  const updateGoal = async (id, goalData) => {
    const target = parseFloat(goalData.targetAmount) || 0;
    const current = parseFloat(goalData.currentAmount) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('goals')
        .update({
          name: goalData.name.trim(),
          description: goalData.category || 'Objetivo',
          target_amount: target,
          current_amount: current,
          deadline: goalData.deadline || null,
          color: goalData.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const g = (SaldoCerto.getState().goals || []).find(goal => goal.id === id);
      if (g) {
        g.name = goalData.name;
        g.category = goalData.category;
        g.targetAmount = target;
        g.currentAmount = current;
        g.deadline = goalData.deadline;
        g.color = goalData.color;
        SaldoCerto.saveData();
      }
      return g;
    }
  };

  /**
   * Exclui uma meta
   */
  const deleteGoal = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Metas Supabase] Erro ao deletar meta:', error);
        throw error;
      }
    }

    SaldoCerto.getState().goals = (SaldoCerto.getState().goals || []).filter(g => g.id !== id);
    SaldoCerto.saveData();
  };

  /**
   * Realiza um aporte na meta
   */
  const addGoalContribution = async (goalId, amount, fromAccount = '') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return false;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) return false;

      const currentGoal = (SaldoCerto.getState().goals || []).find(g => g.id === goalId);
      if (!currentGoal) return false;

      const newCurrent = currentGoal.currentAmount + val;

      // Atualiza meta
      const { error: goalErr } = await window.supabaseClient
        .from('goals')
        .update({
          current_amount: newCurrent,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (goalErr) {
        console.error('[Metas Supabase] Erro ao registrar aporte na meta:', goalErr);
        throw goalErr;
      }

      currentGoal.currentAmount = newCurrent;

      // Se houver conta bancária de origem selecionada, debita dela e cria transação
      if (fromAccount) {
        const acc = SaldoCerto.getState().accounts.find(a => a.name === fromAccount || a.id === fromAccount);
        if (acc) {
          const newBal = acc.balance - val;
          await window.supabaseClient
            .from('accounts')
            .update({ current_balance: newBal })
            .eq('id', acc.id)
            .eq('user_id', user.id);
          acc.balance = newBal;

          await window.supabaseClient
            .from('transactions')
            .insert({
              user_id: user.id,
              account_id: acc.id,
              type: 'expense',
              description: `Aporte na meta: ${currentGoal.name}`,
              amount: val,
              category: 'Investimentos',
              payment_method: 'Transferência',
              transaction_date: new Date().toISOString().split('T')[0]
            });
        }
      }

      return true;
    } else {
      return SaldoCerto.contributeToGoal(goalId, val, fromAccount);
    }
  };

  /**
   * Renderização visual das metas
   */
  const renderGoals = async () => {
    const goals = await getGoals();

    const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);
    const overallPercent = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;

    const statSaved = document.getElementById('statTotalSavedGoals');
    if (statSaved) statSaved.textContent = SaldoCerto.formatCurrency(totalSaved);
    const statTarget = document.getElementById('statTotalTargetGoals');
    if (statTarget) statTarget.textContent = SaldoCerto.formatCurrency(totalTarget);
    const statPct = document.getElementById('statOverallProgressPercent');
    if (statPct) statPct.textContent = `${overallPercent}%`;
    const statCount = document.getElementById('statActiveGoalsCount');
    if (statCount) statCount.textContent = goals.length;

    const badge = document.getElementById('goalsBadgeCount');
    if (badge) badge.textContent = `${goals.length} ${goals.length === 1 ? 'meta' : 'metas'}`;

    const grid = document.getElementById('goalsCardsGrid');
    if (!grid) return;

    if (goals.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="target"></i></div>
            <h4 class="empty-state-title">Nenhuma meta cadastrada</h4>
            <p class="empty-state-desc">Defina objetivos financeiros para motivar sua economia e acompanhar seu progresso no Supabase.</p>
            <button class="btn btn-primary btn-sm" onclick="MetasModule.openAddGoalModal()">
              <i data-lucide="plus-circle"></i> Criar Primeira Meta
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = goals.map(g => {
      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      const cardColor = g.color || '#16A34A';
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <!-- Header do Card -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
              <div>
                <span class="badge" style="background: var(--color-bg-subtle); color: var(--color-text-secondary); margin-bottom: 6px;">
                  ${g.category || 'Objetivo'}
                </span>
                <h4 style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text);">${g.name}</h4>
              </div>
              <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: ${cardColor}15; color: ${cardColor}; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="${g.icon || 'target'}"></i>
              </div>
            </div>

            <!-- Valores e Percentual -->
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-2);">
              <div>
                <span style="font-size: 1.35rem; font-weight: 800; color: var(--color-text);">${SaldoCerto.formatCurrency(g.currentAmount)}</span>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);"> / ${SaldoCerto.formatCurrency(g.targetAmount)}</span>
              </div>
              <span class="badge badge-success" style="font-size: var(--font-size-xs); font-weight: 700;">${pct}%</span>
            </div>

            <!-- Barra de Progresso Animada -->
            <div style="width: 100%; height: 10px; background-color: var(--color-border); border-radius: var(--radius-full); overflow: hidden; margin-bottom: var(--space-3);">
              <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${cardColor}, #16A34A); border-radius: var(--radius-full); transition: width 0.6s ease;"></div>
            </div>

            <!-- Prazo e Restante -->
            <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-4);">
              <span>Falta: <strong style="color: var(--color-text);">${SaldoCerto.formatCurrency(remaining)}</strong></span>
              <span>Prazo: <strong>${SaldoCerto.formatDate(g.deadline)}</strong></span>
            </div>
          </div>

          <!-- Ações -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <button class="btn btn-primary btn-sm" onclick="MetasModule.openContributeModal('${g.id}')">
              <i data-lucide="plus-circle"></i> Fazer Aporte
            </button>
            <div style="display: flex; gap: var(--space-1);">
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Editar meta" onclick="MetasModule.openEditGoalModal('${g.id}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir meta" onclick="MetasModule.handleDelete('${g.id}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openAddGoalModal = () => {
    document.getElementById('goalForm').reset();
    document.getElementById('editGoalId').value = '';
    document.getElementById('goalModalTitle').innerHTML = '<i data-lucide="target" class="text-primary"></i> Nova Meta Financeira';
    SaldoCerto.openModal('goalModal');
    if (window.lucide) window.lucide.createIcons();
  };

  const openEditGoalModal = (id) => {
    const g = (SaldoCerto.getState().goals || []).find(goal => goal.id === id);
    if (!g) return;

    document.getElementById('editGoalId').value = g.id;
    document.getElementById('goalName').value = g.name;
    document.getElementById('goalCategory').value = g.category;
    document.getElementById('goalTarget').value = g.targetAmount;
    document.getElementById('goalCurrent').value = g.currentAmount;
    document.getElementById('goalDeadline').value = g.deadline || '';
    document.getElementById('goalColor').value = g.color || '#16A34A';
    document.getElementById('goalModalTitle').innerHTML = '<i data-lucide="edit-3" class="text-primary"></i> Editar Meta';

    SaldoCerto.openModal('goalModal');
    if (window.lucide) window.lucide.createIcons();
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editGoalId').value;
    const name = document.getElementById('goalName').value.trim();
    const category = document.getElementById('goalCategory').value.trim();
    const targetAmount = document.getElementById('goalTarget').value;
    const currentAmount = document.getElementById('goalCurrent').value;
    const deadline = document.getElementById('goalDeadline').value;
    const color = document.getElementById('goalColor').value;

    if (!name || !targetAmount) {
      SaldoCerto.showToast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    try {
      if (editId) {
        await updateGoal(editId, { name, category, targetAmount, currentAmount, deadline, color });
        SaldoCerto.showToast(`Meta "${name}" atualizada!`, 'success');
      } else {
        await createGoal({ name, category, targetAmount, currentAmount, deadline, color });
        SaldoCerto.showToast(`Meta "${name}" criada com sucesso!`, 'success');
      }

      SaldoCerto.closeModal('goalModal');
      await renderGoals();
    } catch (err) {
      SaldoCerto.showToast('Erro ao salvar meta.', 'danger');
    }
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta meta financeira?', async () => {
      try {
        await deleteGoal(id);
        SaldoCerto.showToast('Meta excluída com sucesso.', 'info');
        await renderGoals();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir meta.', 'danger');
      }
    });
  };

  const openContributeModal = (goalId) => {
    const g = (SaldoCerto.getState().goals || []).find(goal => goal.id === goalId);
    if (!g) return;

    document.getElementById('contribGoalId').value = g.id;
    document.getElementById('contribGoalName').textContent = g.name;

    const accSelect = document.getElementById('contribAccount');
    if (accSelect) {
      accSelect.innerHTML = `
        <option value="">Não debitar de nenhuma conta</option>
        ${SaldoCerto.getState().accounts.map(a => `<option value="${a.name}">${a.name} (${SaldoCerto.formatCurrency(a.balance)})</option>`).join('')}
      `;
    }

    document.getElementById('contribForm').reset();
    SaldoCerto.openModal('contributeModal');
  };

  const handleSaveContribution = async (e) => {
    e.preventDefault();
    const goalId = document.getElementById('contribGoalId').value;
    const amount = document.getElementById('contribAmount').value;
    const fromAccount = document.getElementById('contribAccount').value;

    try {
      const success = await addGoalContribution(goalId, amount, fromAccount);
      if (success) {
        SaldoCerto.closeModal('contributeModal');
        SaldoCerto.showToast(`Aporte de ${SaldoCerto.formatCurrency(amount)} realizado com sucesso!`, 'success');
        await renderGoals();
      }
    } catch (err) {
      SaldoCerto.showToast('Erro ao realizar aporte.', 'danger');
    }
  };

  const init = async () => {
    SaldoCerto.initShell('metas');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    await renderGoals();
  };

  return {
    init,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalContribution,
    renderGoals,
    openAddGoalModal,
    openEditGoalModal,
    handleSaveGoal,
    handleDelete,
    openContributeModal,
    handleSaveContribution
  };
})();

document.addEventListener('DOMContentLoaded', MetasModule.init);
