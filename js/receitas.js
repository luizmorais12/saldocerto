/**
 * SaldoCerto - Módulo de Receitas (Supabase Integrado)
 * Listagem, filtros por período e categoria, gráficos, busca e edição com RLS.
 */

const ReceitasModule = (() => {
  let incomeChart = null;

  const normalizeStr = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const getFilteredIncomes = () => {
    const periodTxs = SaldoCerto.getTransactionsForSelectedPeriod();
    let incomes = periodTxs.filter(t => t.type === 'income');

    const searchRaw = (document.getElementById('incomeSearchInput')?.value || '').trim();
    const search = normalizeStr(searchRaw);
    const catFilter = document.getElementById('incomeCategoryFilter')?.value || 'all';

    if (search) {
      // Tenta filtrar no mês selecionado
      let filtered = incomes.filter(t => {
        const d = normalizeStr(t.description);
        const c = normalizeStr(t.category);
        const a = normalizeStr(t.account);
        const n = normalizeStr(t.notes);
        const amt = String(t.amount || '');
        const amtFmt = normalizeStr(SaldoCerto.formatCurrency(t.amount));
        return d.includes(search) || c.includes(search) || a.includes(search) || n.includes(search) || amt.includes(search) || amtFmt.includes(search);
      });

      // Se não houver correspondência no mês atual mas o usuário pesquisou algo específico, busca em todas as receitas
      if (filtered.length === 0) {
        const allIncomes = SaldoCerto.getState().transactions.filter(t => t.type === 'income');
        filtered = allIncomes.filter(t => {
          const d = normalizeStr(t.description);
          const c = normalizeStr(t.category);
          const a = normalizeStr(t.account);
          const n = normalizeStr(t.notes);
          const amt = String(t.amount || '');
          const amtFmt = normalizeStr(SaldoCerto.formatCurrency(t.amount));
          return d.includes(search) || c.includes(search) || a.includes(search) || n.includes(search) || amt.includes(search) || amtFmt.includes(search);
        });
      }
      incomes = filtered;
    }

    if (catFilter !== 'all') {
      const normCatFilter = normalizeStr(catFilter);
      incomes = incomes.filter(t => {
        const cat = normalizeStr(t.category);
        return cat === normCatFilter || cat.includes(normCatFilter);
      });
    }

    return incomes;
  };

  const renderStats = (incomes) => {
    const total = incomes.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const count = incomes.length;
    const avg = count > 0 ? total / count : 0;

    // Acha a maior categoria
    const catMap = {};
    incomes.forEach(t => {
      const catClean = (t.category || 'Outras').split('(')[0].trim();
      catMap[catClean] = (catMap[catClean] || 0) + Number(t.amount || 0);
    });

    let topCat = '—';
    let maxVal = 0;
    for (const [cat, val] of Object.entries(catMap)) {
      if (val > maxVal) {
        maxVal = val;
        topCat = cat;
      }
    }

    const statTotal = document.getElementById('statTotalIncome');
    if (statTotal) statTotal.textContent = SaldoCerto.formatCurrency(total);
    const statCount = document.getElementById('statIncomeCount');
    if (statCount) statCount.textContent = count;
    const statAvg = document.getElementById('statIncomeAverage');
    if (statAvg) statAvg.textContent = SaldoCerto.formatCurrency(avg);
    const statTop = document.getElementById('statTopCategory');
    if (statTop) statTop.textContent = topCat;

    const badge = document.getElementById('incomeBadgeCount');
    if (badge) badge.textContent = `${count} ${count === 1 ? 'receita listada' : 'receitas listadas'}`;
  };

  const INCOME_PALETTE = [
    '#16A34A', '#0D9488', '#0891B2', '#2563EB', '#7C3AED',
    '#F59E0B', '#10B981', '#6366F1', '#84CC16', '#64748B'
  ];

  const renderChart = (incomes) => {
    const canvas = document.getElementById('incomeCategoryChart');
    const pillsContainer = document.getElementById('incomeCategoryPills');
    const totalSummaryEl = document.getElementById('incomeChartTotalSummary');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (incomeChart) incomeChart.destroy();

    const catMap = {};
    let totalIncomeAmount = 0;

    incomes.forEach(t => {
      const catName = (t.category || 'Outras').split('(')[0].trim();
      const amt = Number(t.amount || 0);
      catMap[catName] = (catMap[catName] || 0) + amt;
      totalIncomeAmount += amt;
    });

    if (totalSummaryEl) {
      totalSummaryEl.textContent = totalIncomeAmount > 0 
        ? `Total Mapeado: ${SaldoCerto.formatCurrency(totalIncomeAmount)}`
        : '';
    }

    // Ordena da maior para a menor receita
    const sortedEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    let labels = sortedEntries.map(e => e[0]);
    let values = sortedEntries.map(e => e[1]);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    if (labels.length === 0 || totalIncomeAmount === 0) {
      if (pillsContainer) {
        pillsContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-muted);">
            <i data-lucide="inbox" style="width: 32px; height: 32px; stroke-width: 1.5; margin-bottom: 8px;"></i>
            <p style="font-size: var(--font-size-sm); margin: 0;">Nenhuma receita para o gráfico no período.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }

      incomeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sem Receitas'],
          datasets: [{
            data: [1],
            backgroundColor: [isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    const chartColors = labels.map((_, i) => INCOME_PALETTE[i % INCOME_PALETTE.length]);

    incomeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: isDark ? '#1E293B' : '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const pct = totalIncomeAmount > 0 ? ((val / totalIncomeAmount) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${SaldoCerto.formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Renderiza lista lateral com percentuais e barras de progresso elegantes
    if (pillsContainer) {
      pillsContainer.innerHTML = sortedEntries.map(([cat, val], index) => {
        const color = chartColors[index];
        const pct = totalIncomeAmount > 0 ? ((val / totalIncomeAmount) * 100).toFixed(1) : 0;
        return `
          <div style="background: var(--color-surface); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-xs);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                ${cat}
              </span>
              <span style="font-weight: 700; color: var(--color-success);">${SaldoCerto.formatCurrency(val)} <span style="color: var(--color-text-muted); font-size: 10px;">(${pct}%)</span></span>
            </div>
            <div style="width: 100%; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  };

  const renderTable = (incomes) => {
    const tbody = document.getElementById('incomesTableBody') || document.getElementById('incomeTableBody');
    if (!tbody) return;

    if (incomes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--space-8);">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
              <h4 class="empty-state-title">Nenhuma receita encontrada</h4>
              <p class="empty-state-desc">Nenhum lançamento de entrada localizado para os filtros e período selecionados.</p>
              <button class="btn btn-primary btn-sm" onclick="ReceitasModule.openAddIncomeModal()">
                <i data-lucide="plus-circle"></i> Adicionar Receita
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = incomes.map(t => {
      const instInfo = SaldoCerto.getInstallmentInfo ? SaldoCerto.getInstallmentInfo(t) : { isInstallment: false };
      const isInstallment = instInfo.isInstallment;
      const isRecurring = t.recurrence === 'Mensal' || (t.notes && t.notes.includes('[RECORRENTE MENSAL]'));

      let installmentBadge = '';
      if (isInstallment) {
        installmentBadge = `<span class="badge badge-warning" style="font-size: 10px; font-weight: 700; margin-left: 6px;">${instInfo.badgeText}</span>`;
      } else if (isRecurring) {
        installmentBadge = `<span class="badge badge-info" style="font-size: 10px; font-weight: 700; margin-left: 6px;">Mensal</span>`;
      }

      // Detalhes mostrados embaixo do valor
      let underAmountHtml = '';
      if (isInstallment) {
        underAmountHtml = `
          <div class="tx-installment-subtext" style="font-size: 11px; font-weight: 600; color: #16A34A; margin-top: 3px; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="layers" style="width: 12px; height: 12px;"></i>
            <span>${instInfo.summaryText} • Total: ${instInfo.totalText}</span>
          </div>
        `;
      } else if (isRecurring) {
        underAmountHtml = `
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">
            <span>🔄 Recorrente todo mês</span>
          </div>
        `;
      }

      const cleanNotes = (t.notes || '').replace(/\[PARCELADO [^\]]+\]/g, '').replace(/\[RECORRENTE MENSAL\]/g, '').trim();

      return `
        <tr>
          <td><strong>${SaldoCerto.formatDate(t.date || t.transaction_date)}</strong></td>
          <td>
            <div style="font-weight: 600; display: flex; align-items: center; flex-wrap: wrap;">
              <span>${t.description}</span>
              ${installmentBadge}
            </div>
            <span style="font-size: 11px; color: var(--color-text-muted); display: block; margin-top: 2px;">
              ${cleanNotes || (isInstallment ? `${instInfo.summaryText} (Total: ${instInfo.totalText})` : 'Sem observações')}
            </span>
          </td>
          <td><span class="badge badge-success">${t.category}</span></td>
          <td><span class="badge badge-info">${t.account || 'Principal'}</span></td>
          <td>
            <div style="color: var(--color-success); font-weight: 700; font-size: var(--font-size-base);">
              + ${SaldoCerto.formatCurrency(t.amount)}
            </div>
            ${underAmountHtml}
          </td>
          <td>
            <div class="table-actions" style="display: flex; gap: 4px; align-items: center;">
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Editar receita" onclick="SaldoCerto.openEditTransactionModal('${t.id}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px; color: var(--color-primary);"></i>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir receita" onclick="ReceitasModule.handleDelete('${t.id}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta receita? O saldo da conta será ajustado.', async () => {
      if (window.SaldoCertoTransactions) {
        await SaldoCertoTransactions.deleteIncome(id);
      } else {
        SaldoCerto.deleteTransaction(id);
      }
      await refresh();
    });
  };

  const openAddIncomeModal = () => {
    SaldoCerto.initTransactionModal && SaldoCerto.initTransactionModal();
    const modalIdInput = document.getElementById('modalTxId');
    if (modalIdInput) modalIdInput.value = '';

    const titleText = document.getElementById('modalTxTitleText');
    if (titleText) titleText.textContent = 'Nova Receita';
    const btnSubmitText = document.getElementById('btnSubmitTxText');
    if (btnSubmitText) btnSubmitText.textContent = 'Salvar Receita';

    SaldoCerto.setModalTxType('income');
    SaldoCerto.openModal('newTransactionModal');
  };

  const refresh = async () => {
    if (window.SaldoCertoTransactions && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      await SaldoCertoTransactions.getTransactions();
    }
    const incomes = getFilteredIncomes();
    renderStats(incomes);
    renderChart(incomes);
    renderTable(incomes);
  };

  const init = async () => {
    SaldoCerto.initShell('receitas');
    if (window.SaldoCertoAuth) {
      const user = await SaldoCertoAuth.requireAuth();
      if (!user) return;
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    if (window.SaldoCertoTransactions) {
      await SaldoCertoTransactions.getTransactions();
    }
    refresh();

    document.getElementById('incomeSearchInput')?.addEventListener('input', refresh);
    document.getElementById('incomeCategoryFilter')?.addEventListener('change', refresh);

    window.addEventListener('saldocerto:monthChanged', refresh);
    window.addEventListener('saldocerto:transactionSaved', refresh);
    window.addEventListener('saldocerto:themeChanged', refresh);
  };

  return {
    init,
    refresh,
    openAddIncomeModal,
    handleDelete
  };
})();

document.addEventListener('DOMContentLoaded', ReceitasModule.init);
