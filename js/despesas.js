/**
 * SaldoCerto - Módulo de Despesas (Supabase Integrado)
 * Listagem, filtros por categoria e pagamento, gráficos e exclusão com RLS.
 */

const DespesasModule = (() => {
  let expenseChart = null;

  const getFilteredExpenses = () => {
    const periodTxs = SaldoCerto.getTransactionsForSelectedPeriod();
    let expenses = periodTxs.filter(t => t.type === 'expense');

    const search = (document.getElementById('expenseSearchInput')?.value || '').toLowerCase().trim();
    const catFilter = document.getElementById('expenseCategoryFilter')?.value || 'all';
    const payFilter = document.getElementById('expensePaymentFilter')?.value || 'all';

    if (search) {
      expenses = expenses.filter(t => t.description.toLowerCase().includes(search));
    }
    if (catFilter !== 'all') {
      expenses = expenses.filter(t => t.category === catFilter);
    }
    if (payFilter !== 'all') {
      expenses = expenses.filter(t => t.paymentMethod === payFilter);
    }

    return expenses;
  };

  const renderStats = (expenses) => {
    const total = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const count = expenses.length;
    const dailyAvg = total / 30;

    const catMap = {};
    expenses.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    let topCat = '—';
    let maxVal = 0;
    for (const [cat, val] of Object.entries(catMap)) {
      if (val > maxVal) {
        maxVal = val;
        topCat = cat;
      }
    }

    const statTotal = document.getElementById('statTotalExpense');
    if (statTotal) statTotal.textContent = SaldoCerto.formatCurrency(total);
    const statTop = document.getElementById('statTopExpenseCategory');
    if (statTop) statTop.textContent = topCat;
    const statCount = document.getElementById('statExpenseCount');
    if (statCount) statCount.textContent = count;
    const statAvg = document.getElementById('statExpenseDailyAvg');
    if (statAvg) statAvg.textContent = SaldoCerto.formatCurrency(dailyAvg);

    const badge = document.getElementById('expenseBadgeCount');
    if (badge) badge.textContent = `${count} ${count === 1 ? 'despesa listada' : 'despesas listadas'}`;
  };

  const renderChart = (expenses) => {
    const canvas = document.getElementById('expenseCategoryChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (expenseChart) expenseChart.destroy();

    const catMap = {};
    expenses.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    let labels = Object.keys(catMap);
    let values = Object.values(catMap);

    if (labels.length === 0) {
      labels = ['Nenhuma despesa'];
      values = [0];
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    expenseChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Gasto',
          data: values,
          backgroundColor: '#DC2626',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${SaldoCerto.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: textColor,
              callback: (value) => `R$ ${value}`
            },
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    });
  };

  const renderTable = (expenses) => {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;

    if (expenses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: var(--space-8);">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
              <h4 class="empty-state-title">Nenhuma despesa encontrada</h4>
              <p class="empty-state-desc">Nenhum gasto localizado para os filtros e período selecionados.</p>
              <button class="btn btn-danger btn-sm" onclick="DespesasModule.openAddExpenseModal()">
                <i data-lucide="plus-circle"></i> Adicionar Despesa
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = expenses.map(t => `
      <tr>
        <td><strong>${SaldoCerto.formatDate(t.date)}</strong></td>
        <td>
          <div style="font-weight: 600;">${t.description}</div>
          <span style="font-size: 11px; color: var(--color-text-muted);">${t.notes || 'Sem observações'}</span>
        </td>
        <td><span class="badge badge-danger">${t.category}</span></td>
        <td><span class="badge badge-info">${t.account || 'Principal'}</span></td>
        <td><span class="badge" style="background: var(--color-bg-subtle); color: var(--color-text-secondary);">${t.paymentMethod || 'PIX'}</span></td>
        <td style="color: var(--color-danger); font-weight: 700; font-size: var(--font-size-base);">
          - ${SaldoCerto.formatCurrency(t.amount)}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir despesa" onclick="DespesasModule.handleDelete('${t.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta despesa? O saldo da conta correspondente será estornado.', async () => {
      if (window.SaldoCertoTransactions) {
        await SaldoCertoTransactions.deleteExpense(id);
      } else {
        SaldoCerto.deleteTransaction(id);
      }
      refresh();
    });
  };

  const openAddExpenseModal = () => {
    SaldoCerto.setModalTxType('expense');
    SaldoCerto.openModal('newTransactionModal');
  };

  const refresh = async () => {
    const expenses = getFilteredExpenses();
    renderStats(expenses);
    renderChart(expenses);
    renderTable(expenses);
  };

  const init = async () => {
    SaldoCerto.initShell('despesas');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    if (window.SaldoCertoTransactions) {
      await SaldoCertoTransactions.getTransactions();
    }
    refresh();

    document.getElementById('expenseSearchInput')?.addEventListener('input', refresh);
    document.getElementById('expenseCategoryFilter')?.addEventListener('change', refresh);
    document.getElementById('expensePaymentFilter')?.addEventListener('change', refresh);

    window.addEventListener('saldocerto:monthChanged', refresh);
    window.addEventListener('saldocerto:transactionSaved', refresh);
    window.addEventListener('saldocerto:themeChanged', refresh);
  };

  return {
    init,
    refresh,
    openAddExpenseModal,
    handleDelete
  };
})();

document.addEventListener('DOMContentLoaded', DespesasModule.init);
