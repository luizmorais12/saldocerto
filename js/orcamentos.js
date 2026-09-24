/**
 * SaldoCerto - Módulo de Orçamentos e Teto de Gastos (Supabase Integrado)
 * Planejamento mensal por categoria, monitoramento de tetos com cores dinâmicas e Regra 50/30/20 com RLS.
 */

const OrcamentosModule = (() => {
  const DEFAULT_BUDGETS = {
    'Moradia': 1500.00,
    'Alimentação': 800.00,
    'Transporte': 300.00,
    'Lazer': 350.00,
    'Saúde': 300.00,
    'Educação': 200.00,
    'Assinaturas': 100.00,
    'Outros': 250.00
  };

  /**
   * Busca orçamentos do usuário no Supabase para o mês e ano selecionados
   */
  const getBudgets = async (month = null, year = null) => {
    const state = SaldoCerto.getState();
    const targetMonth = month || (state.selectedMonth + 1); // 1-indexed
    const targetYear = year || state.selectedYear;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return DEFAULT_BUDGETS;

        const { data, error } = await window.supabaseClient
          .from('budgets')
          .select('*')
          .eq('month', targetMonth)
          .eq('year', targetYear);

        if (error) {
          console.error('[Orcamentos Supabase] Erro ao buscar orçamentos:', error);
          return DEFAULT_BUDGETS;
        }

        if (data && data.length > 0) {
          const map = {};
          data.forEach(b => {
            map[b.category] = Number(b.monthly_limit);
          });
          return { ...DEFAULT_BUDGETS, ...map };
        }
      } catch (err) {
        console.error('[Orcamentos Supabase] Exceção:', err);
      }
    }

    // Fallback local
    try {
      const stored = localStorage.getItem('saldocerto_budgets');
      if (stored) return { ...DEFAULT_BUDGETS, ...JSON.parse(stored) };
    } catch (e) {}

    return DEFAULT_BUDGETS;
  };

  /**
   * Cria ou atualiza um orçamento por categoria
   */
  const createBudget = async (category, limit, month = null, year = null) => {
    const state = SaldoCerto.getState();
    const targetMonth = month || (state.selectedMonth + 1);
    const targetYear = year || state.selectedYear;
    const numLimit = parseFloat(limit) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('budgets')
        .upsert({
          user_id: user.id,
          category: category,
          monthly_limit: numLimit,
          month: targetMonth,
          year: targetYear,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, category, month, year' })
        .select()
        .single();

      if (error) {
        console.error('[Orcamentos Supabase] Erro ao salvar orçamento:', error);
        throw error;
      }
      return data;
    } else {
      const current = await getBudgets();
      current[category] = numLimit;
      localStorage.setItem('saldocerto_budgets', JSON.stringify(current));
      return { category, monthly_limit: numLimit };
    }
  };

  const updateBudget = async (id, budgetData) => createBudget(budgetData.category, budgetData.monthly_limit, budgetData.month, budgetData.year);

  const deleteBudget = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) return;
      await window.supabaseClient.from('budgets').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  /**
   * Determina as cores conforme as faixas de consumo:
   * 0–70% → verde
   * 70–90% → amarelo
   * 90–100% → vermelho
   * >100% → vermelho intenso
   */
  const getBudgetColor = (pct) => {
    if (pct > 100) return '#991B1B'; // Vermelho intenso
    if (pct >= 90) return '#DC2626';  // Vermelho
    if (pct >= 70) return '#D97706';  // Amarelo
    return '#16A34A';                // Verde
  };

  /**
   * Renderização dos orçamentos, regra 50/30/20 e cards
   */
  const renderBudgets = async () => {
    const budgets = await getBudgets();
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

    const statLimit = document.getElementById('statTotalBudgetLimit');
    if (statLimit) statLimit.textContent = SaldoCerto.formatCurrency(totalLimit);
    const statSpent = document.getElementById('statTotalBudgetSpent');
    if (statSpent) statSpent.textContent = SaldoCerto.formatCurrency(totalSpent);
    const statPct = document.getElementById('statBudgetSpentPercent');
    if (statPct) statPct.textContent = `${spentPercent}% do teto consumido`;
    const statRem = document.getElementById('statTotalBudgetRemaining');
    if (statRem) statRem.textContent = SaldoCerto.formatCurrency(totalRemaining);

    const statusEl = document.getElementById('statBudgetStatus');
    if (statusEl) {
      if (spentPercent > 100) {
        statusEl.textContent = 'Teto Estourado!';
        statusEl.style.color = '#991B1B';
      } else if (spentPercent >= 90) {
        statusEl.textContent = 'Limite Crítico';
        statusEl.style.color = '#DC2626';
      } else if (spentPercent >= 70) {
        statusEl.textContent = 'Atenção';
        statusEl.style.color = '#D97706';
      } else {
        statusEl.textContent = 'Sob Controle';
        statusEl.style.color = '#16A34A';
      }
    }

    renderRule503020(spentMap);
    renderCategoryCards(budgets, spentMap);
  };

  /**
   * Cálculo e apresentação da Regra 50/30/20
   */
  const renderRule503020 = (spentMap) => {
    const income = SaldoCerto.calculateIncome() || 6850;
    const needsSpent = (spentMap['Moradia'] || 0) + (spentMap['Alimentação'] || 0) + (spentMap['Transporte'] || 0) + (spentMap['Saúde'] || 0) + (spentMap['Educação'] || 0);
    const wantsSpent = (spentMap['Lazer'] || 0) + (spentMap['Assinaturas'] || 0) + (spentMap['Outros'] || 0);
    const savings = Math.max(0, income - (needsSpent + wantsSpent));

    const needsTarget = income * 0.50;
    const wantsTarget = income * 0.30;
    const savingsTarget = income * 0.20;

    const needsPct = income > 0 ? Math.round((needsSpent / income) * 100) : 0;
    const wantsPct = income > 0 ? Math.round((wantsSpent / income) * 100) : 0;
    const savingsPct = income > 0 ? Math.round((savings / income) * 100) : 0;

    const r50Val = document.getElementById('rule50Value');
    if (r50Val) r50Val.textContent = SaldoCerto.formatCurrency(needsSpent);
    const r50Tgt = document.getElementById('rule50Target');
    if (r50Tgt) r50Tgt.textContent = `Meta (50%): ${SaldoCerto.formatCurrency(needsTarget)}`;
    const r50Bdg = document.getElementById('rule50Badge');
    if (r50Bdg) r50Bdg.textContent = `${needsPct}% da renda`;

    const r30Val = document.getElementById('rule30Value');
    if (r30Val) r30Val.textContent = SaldoCerto.formatCurrency(wantsSpent);
    const r30Tgt = document.getElementById('rule30Target');
    if (r30Tgt) r30Tgt.textContent = `Meta (30%): ${SaldoCerto.formatCurrency(wantsTarget)}`;
    const r30Bdg = document.getElementById('rule30Badge');
    if (r30Bdg) r30Bdg.textContent = `${wantsPct}% da renda`;

    const r20Val = document.getElementById('rule20Value');
    if (r20Val) r20Val.textContent = SaldoCerto.formatCurrency(savings);
    const r20Tgt = document.getElementById('rule20Target');
    if (r20Tgt) r20Tgt.textContent = `Meta (20%): ${SaldoCerto.formatCurrency(savingsTarget)}`;
    const r20Bdg = document.getElementById('rule20Badge');
    if (r20Bdg) r20Bdg.textContent = `${savingsPct}% da renda`;

    const p50 = document.getElementById('rule50Progress');
    if (p50) p50.style.width = `${Math.min(100, needsPct)}%`;
    const p30 = document.getElementById('rule30Progress');
    if (p30) p30.style.width = `${Math.min(100, wantsPct)}%`;
    const p20 = document.getElementById('rule20Progress');
    if (p20) p20.style.width = `${Math.min(100, savingsPct)}%`;
  };

  /**
   * Renderização dos cartões de categoria
   */
  const renderCategoryCards = (budgets, spentMap) => {
    const grid = document.getElementById('budgetCategoryGrid');
    if (!grid) return;

    const categories = Object.keys(budgets);

    grid.innerHTML = categories.map(cat => {
      const limit = budgets[cat] || 0;
      const spent = spentMap[cat] || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      const barColor = getBudgetColor(pct);
      const remaining = limit - spent;

      return `
        <div class="card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
              <div>
                <span class="badge" style="background: var(--color-bg-subtle); color: var(--color-text-secondary); margin-bottom: 6px;">
                  Categoria
                </span>
                <h4 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-text);">${cat}</h4>
              </div>
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Ajustar teto" onclick="OrcamentosModule.openEditBudgetModal('${cat}', ${limit})">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-2);">
              <div>
                <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-text);">${SaldoCerto.formatCurrency(spent)}</span>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);"> de ${SaldoCerto.formatCurrency(limit)}</span>
              </div>
              <span class="badge" style="background: ${barColor}15; color: ${barColor}; font-weight: 700;">
                ${pct.toFixed(0)}%
              </span>
            </div>

            <!-- Barra de Progresso com Cor Semântica -->
            <div style="width: 100%; height: 8px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; margin-bottom: var(--space-3);">
              <div style="width: ${Math.min(100, pct)}%; height: 100%; background: ${barColor}; border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted);">
              <span>${remaining >= 0 ? 'Disponível:' : 'Estourado:'}</span>
              <strong style="color: ${remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                ${SaldoCerto.formatCurrency(Math.abs(remaining))}
              </strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openEditBudgetModal = async (category = '', currentLimit = 0) => {
    const budgets = await getBudgets();
    const map = {
      budget_moradia: budgets['Moradia'] || 1500,
      budget_alimentacao: budgets['Alimentação'] || 800,
      budget_transporte: budgets['Transporte'] || 300,
      budget_lazer: budgets['Lazer'] || 350,
      budget_saude: budgets['Saúde'] || 300,
      budget_educacao: budgets['Educação'] || 200,
      budget_assinaturas: budgets['Assinaturas'] || 100,
      budget_outros: budgets['Outros'] || 250
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }

    SaldoCerto.openModal('budgetModal');
  };

  const handleSaveBudgets = async (e) => {
    e.preventDefault();
    const categoriesMap = {
      'Moradia': document.getElementById('budget_moradia')?.value,
      'Alimentação': document.getElementById('budget_alimentacao')?.value,
      'Transporte': document.getElementById('budget_transporte')?.value,
      'Lazer': document.getElementById('budget_lazer')?.value,
      'Saúde': document.getElementById('budget_saude')?.value,
      'Educação': document.getElementById('budget_educacao')?.value,
      'Assinaturas': document.getElementById('budget_assinaturas')?.value,
      'Outros': document.getElementById('budget_outros')?.value
    };

    try {
      for (const [cat, val] of Object.entries(categoriesMap)) {
        if (val !== undefined && val !== '') {
          await createBudget(cat, parseFloat(val) || 0);
        }
      }
      SaldoCerto.closeModal('budgetModal');
      SaldoCerto.showToast('Tetos de gastos atualizados com sucesso!', 'success');
      await renderBudgets();
    } catch (err) {
      SaldoCerto.showToast('Erro ao salvar tetos de gastos.', 'danger');
    }
  };

  const init = async () => {
    SaldoCerto.initShell('orcamentos');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    if (window.SaldoCertoTransactions) {
      await SaldoCertoTransactions.getTransactions();
    }
    await renderBudgets();

    window.addEventListener('saldocerto:monthChanged', renderBudgets);
    window.addEventListener('saldocerto:transactionSaved', renderBudgets);
  };

  return {
    init,
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    renderBudgets,
    openEditBudgetModal,
    handleSaveBudgets,
    handleSaveBudget: handleSaveBudgets
  };
})();

document.addEventListener('DOMContentLoaded', OrcamentosModule.init);
