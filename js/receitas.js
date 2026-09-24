/**
 * SaldoCerto - Módulo de Receitas
 */

const ReceitasModule = (() => {
  let incomeChart = null;

  const getFilteredIncomes = () => {
    const periodTxs = SaldoCerto.getTransactionsForSelectedPeriod();
    let incomes = periodTxs.filter(t => t.type === 'income');

    const search = (document.getElementById('incomeSearchInput')?.value || '').toLowerCase().trim();
    const catFilter = document.getElementById('incomeCategoryFilter')?.value || 'all';

    if (search) {
      incomes = incomes.filter(t => t.description.toLowerCase().includes(search));
    }
    if (catFilter !== 'all') {
      incomes = incomes.filter(t => t.category === catFilter);
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

    document.getElementById('statTotalIncome').textContent = SaldoCerto.formatCurrency(total);
    document.getElementById('statIncomeCount').textContent = count;
    document.getElementById('statIncomeAverage').textContent = SaldoCerto.formatCurrency(avg);
    document.getElementById('statTopCategory').textContent = topCat;

    const badge = document.getElementById('incomeBadgeCount');
    if (badge) badge.textContent = `${count} ${count === 1 ? 'receita listada' : 'receitas listadas'}`;
  };

  const renderChart = (incomes) => {
    const canvas = document.getElementById('incomeCategoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (incomeChart) incomeChart.destroy();

    const catMap = {};
    incomes.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount || 0);
    });

    let labels = Object.keys(catMap);
    let values = Object.values(catMap);

    if (labels.length === 0) {
      labels = ['Nenhuma receita'];
      values = [0];
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    incomeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valor Recebido',
          data: values,
          backgroundColor: '#16A34A',
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
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter', size: 12 } }
          },
          y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
            ticks: {
              color: textColor,
              callback: (val) => 'R$ ' + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  };

  const renderTable = (incomes) => {
    const tbody = document.getElementById('incomesTableBody');
    if (!tbody) return;

    if (incomes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
              <h4 class="empty-state-title">Nenhuma receita encontrada</h4>
              <p class="empty-state-desc">Você ainda não possui receitas registradas neste período ou com os filtros aplicados.</p>
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

    tbody.innerHTML = incomes.map(t => `
      <tr>
        <td><strong>${SaldoCerto.formatDate(t.date)}</strong></td>
        <td>
          <div style="font-weight: 600;">${t.description}</div>
          <span style="font-size: 11px; color: var(--color-text-muted);">${t.notes || 'Sem observações'}</span>
        </td>
        <td><span class="badge badge-success">${t.category}</span></td>
        <td><span class="badge badge-info">${t.account || 'Principal'}</span></td>
        <td style="color: var(--color-success); font-weight: 700; font-size: var(--font-size-base);">
          + ${SaldoCerto.formatCurrency(t.amount)}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir receita" onclick="ReceitasModule.handleDelete('${t.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta receita? O saldo da conta será ajustado.', () => {
      SaldoCerto.deleteTransaction(id);
      refresh();
    });
  };

  const openAddIncomeModal = () => {
    SaldoCerto.setModalTxType('income');
    SaldoCerto.openModal('newTransactionModal');
  };

  const refresh = () => {
    const incomes = getFilteredIncomes();
    renderStats(incomes);
    renderChart(incomes);
    renderTable(incomes);
  };

  const init = () => {
    SaldoCerto.initShell('receitas');
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
