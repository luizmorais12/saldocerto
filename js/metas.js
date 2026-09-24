/**
 * SaldoCerto - Módulo de Metas Financeiras
 */

const MetasModule = (() => {
  const renderGoals = () => {
    const state = SaldoCerto.getState();
    const goals = state.goals || [];

    const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);
    const overallPercent = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;

    document.getElementById('statTotalSavedGoals').textContent = SaldoCerto.formatCurrency(totalSaved);
    document.getElementById('statTotalTargetGoals').textContent = SaldoCerto.formatCurrency(totalTarget);
    document.getElementById('statOverallProgressPercent').textContent = `${overallPercent}%`;
    document.getElementById('statActiveGoalsCount').textContent = goals.length;

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
            <p class="empty-state-desc">Defina objetivos financeiros para motivar sua economia e acompanhar seu progresso.</p>
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
  };

  const openEditGoalModal = (id) => {
    const state = SaldoCerto.getState();
    const g = state.goals.find(goal => goal.id === id);
    if (!g) return;

    document.getElementById('editGoalId').value = g.id;
    document.getElementById('goalName').value = g.name;
    document.getElementById('goalTarget').value = g.targetAmount;
    document.getElementById('goalCurrent').value = g.currentAmount;
    document.getElementById('goalDeadline').value = g.deadline;
    document.getElementById('goalCategory').value = g.category || 'Segurança';
    document.getElementById('goalColor').value = g.color || '#16A34A';
    document.getElementById('goalModalTitle').innerHTML = '<i data-lucide="edit-3" class="text-primary"></i> Editar Meta';

    SaldoCerto.openModal('goalModal');
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    const editId = document.getElementById('editGoalId').value;
    const name = document.getElementById('goalName').value.trim();
    const targetAmount = parseFloat(document.getElementById('goalTarget').value) || 0;
    const currentAmount = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const deadline = document.getElementById('goalDeadline').value;
    const category = document.getElementById('goalCategory').value;
    const color = document.getElementById('goalColor').value;

    const state = SaldoCerto.getState();
    state.goals = state.goals || [];

    if (editId) {
      const g = state.goals.find(goal => goal.id === editId);
      if (g) {
        g.name = name;
        g.targetAmount = targetAmount;
        g.currentAmount = currentAmount;
        g.deadline = deadline;
        g.category = category;
        g.color = color;
        SaldoCerto.saveData();
        SaldoCerto.showToast(`Meta "${g.name}" atualizada!`, 'success');
      }
    } else {
      SaldoCerto.addGoal({ name, targetAmount, currentAmount, deadline, category, color });
    }

    SaldoCerto.closeModal('goalModal');
    renderGoals();
  };

  const openContributeModal = (goalId) => {
    const state = SaldoCerto.getState();
    const g = state.goals.find(goal => goal.id === goalId);
    if (!g) return;

    document.getElementById('contributeGoalId').value = g.id;
    document.getElementById('contributeGoalName').textContent = g.name;
    document.getElementById('contributeAmount').value = '';

    SaldoCerto.openModal('contributeModal');
  };

  const handleContribute = (e) => {
    e.preventDefault();
    const id = document.getElementById('contributeGoalId').value;
    const amount = document.getElementById('contributeAmount').value;

    const success = SaldoCerto.contributeToGoal(id, amount);
    if (success) {
      SaldoCerto.closeModal('contributeModal');
      renderGoals();
    }
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta meta financeira?', () => {
      const state = SaldoCerto.getState();
      state.goals = (state.goals || []).filter(g => g.id !== id);
      SaldoCerto.saveData();
      SaldoCerto.showToast('Meta excluída com sucesso.', 'info');
      renderGoals();
    });
  };

  const init = () => {
    SaldoCerto.initShell('metas');
    renderGoals();
  };

  return {
    init,
    renderGoals,
    openAddGoalModal,
    openEditGoalModal,
    handleSaveGoal,
    openContributeModal,
    handleContribute,
    handleDelete
  };
})();

document.addEventListener('DOMContentLoaded', MetasModule.init);
