/**
 * SaldoCerto - Módulo de Investimentos
 */

const InvestimentosModule = (() => {
  let invChart = null;

  const renderInvestments = () => {
    const state = SaldoCerto.getState();
    const list = state.investments || [];

    const totalInvested = list.reduce((sum, inv) => sum + Number(inv.currentAmount || 0), 0);
    const totalPrincipal = list.reduce((sum, inv) => sum + Number(inv.investedAmount || 0), 0);
    const totalProfit = totalInvested - totalPrincipal;
    const yieldPercent = totalPrincipal > 0 ? ((totalProfit / totalPrincipal) * 100).toFixed(2) : 0;

    document.getElementById('statInvestedTotal').textContent = SaldoCerto.formatCurrency(totalInvested);
    document.getElementById('statPrincipalTotal').textContent = SaldoCerto.formatCurrency(totalPrincipal);
    
    const profitEl = document.getElementById('statProfitTotal');
    profitEl.textContent = `${totalProfit >= 0 ? '+' : '-'} ${SaldoCerto.formatCurrency(Math.abs(totalProfit))}`;
    profitEl.style.color = totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    const yieldEl = document.getElementById('statYieldPercent');
    yieldEl.textContent = `${yieldPercent >= 0 ? '+' : ''}${yieldPercent}%`;
    yieldEl.style.color = yieldPercent >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    const badge = document.getElementById('investmentsBadgeCount');
    if (badge) badge.textContent = `${list.length} ${list.length === 1 ? 'ativo' : 'ativos'}`;

    renderChart(list);
    renderTable(list);
  };

  const renderChart = (list) => {
    const canvas = document.getElementById('investmentsChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (invChart) invChart.destroy();

    const catMap = {};
    list.forEach(inv => {
      catMap[inv.category] = (catMap[inv.category] || 0) + Number(inv.currentAmount || 0);
    });

    let labels = Object.keys(catMap);
    let values = Object.values(catMap);

    if (labels.length === 0) {
      labels = ['Sem investimentos'];
      values = [1];
    }

    const colors = [
      '#16A34A', '#2563EB', '#D97706', '#8B5CF6',
      '#EC4899', '#06B6D4', '#10B981', '#64748B'
    ];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    invChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: isDark ? '#1E293B' : '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              color: textColor,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${SaldoCerto.formatCurrency(context.raw)}`
            }
          }
        }
      }
    });
  };

  const renderTable = (list) => {
    const tbody = document.getElementById('investmentsTableBody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="trending-up"></i></div>
              <h4 class="empty-state-title">Nenhum investimento registrado</h4>
              <p class="empty-state-desc">Cadastre suas aplicações financeiras para acompanhar a rentabilidade e rendimento.</p>
              <button class="btn btn-primary btn-sm" onclick="InvestimentosModule.openAddInvestmentModal()">
                <i data-lucide="plus-circle"></i> Adicionar Ativo
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = list.map(inv => {
      const profit = inv.currentAmount - inv.investedAmount;
      const pct = inv.investedAmount > 0 ? ((profit / inv.investedAmount) * 100).toFixed(2) : 0;
      const profitColor = profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
      const profitSign = profit >= 0 ? '+' : '-';

      return `
        <tr>
          <td><strong>${inv.name}</strong></td>
          <td><span class="badge badge-info">${inv.category}</span></td>
          <td><span class="badge badge-warning">${inv.institution}</span></td>
          <td>${SaldoCerto.formatCurrency(inv.investedAmount)}</td>
          <td><strong>${SaldoCerto.formatCurrency(inv.currentAmount)}</strong></td>
          <td style="color: ${profitColor}; font-weight: 700;">
            ${profitSign} ${SaldoCerto.formatCurrency(Math.abs(profit))}
          </td>
          <td style="color: ${profitColor}; font-weight: 700;">
            ${pct >= 0 ? '+' : ''}${pct}%
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Editar ativo" onclick="InvestimentosModule.openEditInvestmentModal('${inv.id}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir ativo" onclick="InvestimentosModule.handleDelete('${inv.id}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openAddInvestmentModal = () => {
    document.getElementById('investmentForm').reset();
    document.getElementById('editInvId').value = '';
    document.getElementById('invModalTitle').innerHTML = '<i data-lucide="trending-up" class="text-primary"></i> Novo Ativo de Investimento';
    SaldoCerto.openModal('investmentModal');
  };

  const openEditInvestmentModal = (id) => {
    const state = SaldoCerto.getState();
    const inv = state.investments.find(i => i.id === id);
    if (!inv) return;

    document.getElementById('editInvId').value = inv.id;
    document.getElementById('invName').value = inv.name;
    document.getElementById('invCategory').value = inv.category;
    document.getElementById('invInstitution').value = inv.institution;
    document.getElementById('invInvestedAmount').value = inv.investedAmount;
    document.getElementById('invCurrentAmount').value = inv.currentAmount;
    document.getElementById('invModalTitle').innerHTML = '<i data-lucide="edit-3" class="text-primary"></i> Editar Investimento';

    SaldoCerto.openModal('investmentModal');
  };

  const handleSaveInvestment = (e) => {
    e.preventDefault();
    const editId = document.getElementById('editInvId').value;
    const name = document.getElementById('invName').value.trim();
    const category = document.getElementById('invCategory').value;
    const institution = document.getElementById('invInstitution').value.trim();
    const investedAmount = parseFloat(document.getElementById('invInvestedAmount').value) || 0;
    const currentAmount = parseFloat(document.getElementById('invCurrentAmount').value) || 0;

    const state = SaldoCerto.getState();
    state.investments = state.investments || [];

    if (editId) {
      const inv = state.investments.find(i => i.id === editId);
      if (inv) {
        inv.name = name;
        inv.category = category;
        inv.institution = institution;
        inv.investedAmount = investedAmount;
        inv.currentAmount = currentAmount;
        SaldoCerto.saveData();
        SaldoCerto.showToast(`Investimento "${inv.name}" atualizado!`, 'success');
      }
    } else {
      SaldoCerto.addInvestment({ name, category, institution, investedAmount, currentAmount });
    }

    SaldoCerto.closeModal('investmentModal');
    renderInvestments();
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja remover este ativo da carteira?', () => {
      const state = SaldoCerto.getState();
      state.investments = (state.investments || []).filter(i => i.id !== id);
      SaldoCerto.saveData();
      SaldoCerto.showToast('Investimento removido.', 'info');
      renderInvestments();
    });
  };

  const init = () => {
    SaldoCerto.initShell('investimentos');
    renderInvestments();
  };

  return {
    init,
    renderInvestments,
    openAddInvestmentModal,
    openEditInvestmentModal,
    handleSaveInvestment,
    handleDelete
  };
})();

document.addEventListener('DOMContentLoaded', InvestimentosModule.init);
