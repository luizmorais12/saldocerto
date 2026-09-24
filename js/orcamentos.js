/**
 * SaldoCerto - Módulo de Orçamentos e Teto de Gastos (Regra 50/30/20)
 */

const OrcamentosModule = (() => {
  const BUDGET_KEY = 'saldocerto_budgets';

  const DEFAULT_BUDGETS = {
    Moradia: 1500.00,
    Alimentação: 800.00,
    Transporte: 300.00,
    Lazer: 350.00,
    Saúde: 300.00,
    Educação: 200.00,
    Assinaturas: 100.00,
    Outros: 250.00
  };

  const getBudgets = () => {
    try {
      const stored = localStorage.getItem(BUDGET_KEY);
      if (stored) return { ...DEFAULT_BUDGETS, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Erro ao carregar orçamentos:', e);
    }
    return DEFAULT_BUDGETS;
  };

  const saveBudgets = (budgets) => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  };

  const renderBudgets = () => {
    const budgets = getBudgets();
    const periodTxs = SaldoCerto.getTransactionsForSelectedPeriod();
    const expenses = periodTxs.filter(t => t.type === 'expense');

    // Agrupa gastos reais por categoria no mês
    const spentMap = {};
    expenses.forEach(t => {
      const cat = t.category || 'Outros';
      spentMap[cat] = (spentMap[cat] || 0) + Number(t.amount || 0);
    });

    // Calcula totais
    let totalLimit = 0;
    let totalSpent = 0;

    Object.keys(budgets).forEach(cat => {
      totalLimit += budgets[cat] || 0;
      totalSpent += spentMap[cat] || 0;
    });

    const totalRemaining = Math.max(0, totalLimit - totalSpent);
    const spentPercent = totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) : 0;

    document.getElementById('statTotalBudgetLimit').textContent = SaldoCerto.formatCurrency(totalLimit);
    document.getElementById('statTotalBudgetSpent').textContent = SaldoCerto.formatCurrency(totalSpent);
    document.getElementById('statBudgetSpentPercent').textContent = `${spentPercent}% do teto consumido`;
    document.getElementById('statTotalBudgetRemaining').textContent = SaldoCerto.formatCurrency(totalRemaining);

    const statusEl = document.getElementById('statBudgetStatus');
    if (spentPercent >= 100) {
      statusEl.textContent = 'Teto Estourado!';
      statusEl.style.color = 'var(--color-danger)';
    } else if (spentPercent >= 80) {
      statusEl.textContent = 'Alerta de Limite';
      statusEl.style.color = 'var(--color-warning)';
    } else {
      statusEl.textContent = 'Sob Controle';
      statusEl.style.color = 'var(--color-success)';
    }

    renderRule503020(spentMap);
    renderCategoryCards(budgets, spentMap);
  };

  const renderRule503020 = (spentMap) => {
    const income = SaldoCerto.calculateIncome() || 6850; // Fallback se renda do mês for 0
    const needsSpent = (spentMap['Moradia'] || 0) + (spentMap['Alimentação'] || 0) + (spentMap['Transporte'] || 0) + (spentMap['Saúde'] || 0) + (spentMap['Educação'] || 0);
    const wantsSpent = (spentMap['Lazer'] || 0) + (spentMap['Assinaturas'] || 0) + (spentMap['Outros'] || 0);
    const savings = Math.max(0, income - (needsSpent + wantsSpent));

    const needsTarget = income * 0.50;
    const wantsTarget = income * 0.30;
    const savingsTarget = income * 0.20;

    const needsPct = income > 0 ? Math.round((needsSpent / income) * 100) : 0;
    const wantsPct = income > 0 ? Math.round((wantsSpent / income) * 100) : 0;
    const savingsPct = income > 0 ? Math.round((savings / income) * 100) : 0;

    document.getElementById('rule50Value').textContent = SaldoCerto.formatCurrency(needsSpent);
    document.getElementById('rule50Target').textContent = `Meta (50%): ${SaldoCerto.formatCurrency(needsTarget)}`;
    document.getElementById('rule50Badge').textContent = `${needsPct}% da renda`;

    document.getElementById('rule30Value').textContent = SaldoCerto.formatCurrency(wantsSpent);
    document.getElementById('rule30Target').textContent = `Meta (30%): ${SaldoCerto.formatCurrency(wantsTarget)}`;
    document.getElementById('rule30Badge').textContent = `${wantsPct}% da renda`;

    document.getElementById('rule20Value').textContent = SaldoCerto.formatCurrency(savings);
    document.getElementById('rule20Target').textContent = `Meta (20%): ${SaldoCerto.formatCurrency(savingsTarget)}`;
    document.getElementById('rule20Badge').textContent = `${savingsPct}% da renda`;
  };

  const renderCategoryCards = (budgets, spentMap) => {
    const grid = document.getElementById('budgetCategoriesGrid');
    if (!grid) return;

    const categoriesConfig = [
      { name: 'Moradia', icon: 'home', color: '#6366F1' },
      { name: 'Alimentação', icon: 'utensils', color: '#F59E0B' },
      { name: 'Transporte', icon: 'car', color: '#3B82F6' },
      { name: 'Lazer', icon: 'gamepad-2', color: '#EC4899' },
      { name: 'Saúde', icon: 'heart-pulse', color: '#EF4444' },
      { name: 'Educação', icon: 'graduation-cap', color: '#8B5CF6' },
      { name: 'Assinaturas', icon: 'tv', color: '#14B8A6' },
      { name: 'Outros', icon: 'more-horizontal', color: '#64748B' }
    ];

    grid.innerHTML = categoriesConfig.map(cat => {
      const limit = budgets[cat.name] || 0;
      const spent = spentMap[cat.name] || 0;
      const pct = limit > 0 ? Math.min(150, Math.round((spent / limit) * 100)) : 0;
      const isExceeded = spent > limit;

      let barColor = 'var(--color-primary)';
      let badgeClass = 'badge-success';
      let statusText = `${pct}% utilizado`;

      if (isExceeded) {
        barColor = 'var(--color-danger)';
        badgeClass = 'badge-danger';
        statusText = '🚨 Teto Estourado!';
      } else if (pct >= 80) {
        barColor = 'var(--color-warning)';
        badgeClass = 'badge-warning';
        statusText = `${pct}% em atenção`;
      }

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: ${cat.color}15; color: ${cat.color}; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="${cat.icon}"></i>
                </div>
                <div>
                  <h4 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-text);">${cat.name}</h4>
                  <span style="font-size: 11px; color: var(--color-text-muted);">Teto: ${SaldoCerto.formatCurrency(limit)}</span>
                </div>
              </div>
              <span class="badge ${badgeClass}">${statusText}</span>
            </div>

            <!-- Valores -->
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin: var(--space-3) 0 var(--space-2);">
              <span style="font-size: 1.35rem; font-weight: 800; color: ${isExceeded ? 'var(--color-danger)' : 'var(--color-text)'};">
                ${SaldoCerto.formatCurrency(spent)}
              </span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                de ${SaldoCerto.formatCurrency(limit)}
              </span>
            </div>

            <!-- Barra de Progresso do Teto -->
            <div style="width: 100%; height: 8px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; margin-bottom: var(--space-3);">
              <div style="width: ${Math.min(100, pct)}%; height: 100%; background: ${barColor}; border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--color-text-muted);">
              <span>${isExceeded ? 'Excedeu:' : 'Resta:'} <strong style="color: ${isExceeded ? 'var(--color-danger)' : 'var(--color-success)'};">${SaldoCerto.formatCurrency(Math.abs(limit - spent))}</strong></span>
              <span>${limit > 0 ? (100 - pct) : 0}% livre</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openEditBudgetModal = () => {
    const budgets = getBudgets();
    document.getElementById('budget_moradia').value = budgets['Moradia'] || 1500;
    document.getElementById('budget_alimentacao').value = budgets['Alimentação'] || 800;
    document.getElementById('budget_transporte').value = budgets['Transporte'] || 300;
    document.getElementById('budget_lazer').value = budgets['Lazer'] || 350;
    document.getElementById('budget_saude').value = budgets['Saúde'] || 300;
    document.getElementById('budget_educacao').value = budgets['Educação'] || 200;
    document.getElementById('budget_assinaturas').value = budgets['Assinaturas'] || 100;
    document.getElementById('budget_outros').value = budgets['Outros'] || 250;

    SaldoCerto.openModal('budgetModal');
  };

  const handleSaveBudgets = (e) => {
    e.preventDefault();
    const updated = {
      Moradia: parseFloat(document.getElementById('budget_moradia').value) || 0,
      Alimentação: parseFloat(document.getElementById('budget_alimentacao').value) || 0,
      Transporte: parseFloat(document.getElementById('budget_transporte').value) || 0,
      Lazer: parseFloat(document.getElementById('budget_lazer').value) || 0,
      Saúde: parseFloat(document.getElementById('budget_saude').value) || 0,
      Educação: parseFloat(document.getElementById('budget_educacao').value) || 0,
      Assinaturas: parseFloat(document.getElementById('budget_assinaturas').value) || 0,
      Outros: parseFloat(document.getElementById('budget_outros').value) || 0
    };

    saveBudgets(updated);
    SaldoCerto.showToast('Tetos de gastos atualizados com sucesso!', 'success');
    SaldoCerto.closeModal('budgetModal');
    renderBudgets();
  };

  const init = () => {
    SaldoCerto.initShell('orcamentos');
    renderBudgets();

    window.addEventListener('saldocerto:monthChanged', renderBudgets);
    window.addEventListener('saldocerto:transactionSaved', renderBudgets);
  };

  return {
    init,
    renderBudgets,
    openEditBudgetModal,
    handleSaveBudgets
  };
})();

document.addEventListener('DOMContentLoaded', OrcamentosModule.init);
