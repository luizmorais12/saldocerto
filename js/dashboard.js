/**
 * SaldoCerto - Lógica do Dashboard Financeiro
 * Renderização dinâmica, métricas em tempo real e gráficos Chart.js
 */

const DashboardModule = (() => {
  let flowChartInstance = null;
  let categoryChartInstance = null;
  let currentFlowFilter = '30d'; // '7d', '30d', '6m', '12m'

  /**
   * Renderiza as 4 métricas principais calculadas dinamicamente
   */
  const renderMetrics = () => {
    const balance = SaldoCerto.calculateBalance();
    const income = SaldoCerto.calculateIncome();
    const expenses = SaldoCerto.calculateExpenses();
    const investments = SaldoCerto.calculateInvestments();

    const balanceEl = document.getElementById('metricBalance');
    const incomeEl = document.getElementById('metricIncome');
    const expenseEl = document.getElementById('metricExpenses');
    const investmentEl = document.getElementById('metricInvestments');

    if (balanceEl) balanceEl.textContent = SaldoCerto.formatCurrency(balance);
    if (incomeEl) incomeEl.textContent = SaldoCerto.formatCurrency(income);
    if (expenseEl) expenseEl.textContent = SaldoCerto.formatCurrency(expenses);
    if (investmentEl) investmentEl.textContent = SaldoCerto.formatCurrency(investments);

    // Indicador dinâmico de economia mensal
    const trendEl = document.getElementById('metricBalanceTrend');
    if (trendEl) {
      const netSavings = income - expenses;
      const rate = income > 0 ? ((netSavings / income) * 100).toFixed(1) : 0;
      trendEl.textContent = `${rate >= 0 ? '+' : ''}${rate}% este mês`;
      trendEl.className = `metric-trend ${rate >= 0 ? 'positive' : 'negative'}`;
    }
  };

  /**
   * Renderiza lista de transações recentes
   */
  const renderRecentTransactions = () => {
    const listEl = document.getElementById('recentTransactionsList');
    if (!listEl) return;

    const state = SaldoCerto.getState();
    const txs = state.transactions.slice(0, 6);

    if (txs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="receipt"></i></div>
          <h4 class="empty-state-title">Nenhuma transação recente</h4>
          <p class="empty-state-desc">Adicione sua primeira movimentação para começar a acompanhar suas finanças.</p>
          <button class="btn btn-primary btn-sm" onclick="SaldoCerto.openModal('newTransactionModal')">
            <i data-lucide="plus-circle"></i> Adicionar Transação
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    listEl.innerHTML = txs.map(tx => {
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'income' : 'expense';
      const iconName = isIncome ? 'arrow-up-circle' : 'arrow-down-circle';
      const iconBg = isIncome ? 'var(--color-primary-light)' : 'var(--color-danger-light)';
      const iconColor = isIncome ? 'var(--color-primary)' : 'var(--color-danger)';

      return `
        <div class="transaction-item">
          <div class="tx-left">
            <div class="tx-icon" style="background-color: ${iconBg}; color: ${iconColor};">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="tx-info">
              <span class="tx-title">${tx.description}</span>
              <span class="tx-meta">
                <span>${tx.category}</span> • 
                <span>${SaldoCerto.formatDate(tx.date)}</span> • 
                <span class="badge badge-info" style="font-size: 11px;">${tx.account || 'Principal'}</span>
              </span>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${amountClass}">${sign} ${SaldoCerto.formatCurrency(tx.amount)}</span>
            <span class="tx-account-badge">${tx.paymentMethod || 'PIX'}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  /**
   * Gráfico de Fluxo Financeiro (Chart.js)
   */
  const initFlowChart = () => {
    const canvas = document.getElementById('flowChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (flowChartInstance) {
      flowChartInstance.destroy();
    }

    // Gera dados de exemplo dinâmicos com base no filtro selecionado
    let labels = [];
    let incomesData = [];
    let expensesData = [];

    if (currentFlowFilter === '7d') {
      labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      incomesData = [0, 450, 0, 850, 0, 1500, 0];
      expensesData = [120, 350, 45, 180, 210, 85, 90];
    } else if (currentFlowFilter === '30d') {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      const totalInc = SaldoCerto.calculateIncome();
      const totalExp = SaldoCerto.calculateExpenses();
      incomesData = [totalInc * 0.6, totalInc * 0.25, totalInc * 0.15, 0];
      expensesData = [totalExp * 0.35, totalExp * 0.25, totalExp * 0.25, totalExp * 0.15];
    } else if (currentFlowFilter === '6m') {
      labels = ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'];
      incomesData = [5800, 6100, 5950, 6400, 6200, SaldoCerto.calculateIncome()];
      expensesData = [2900, 3100, 3450, 3200, 3050, SaldoCerto.calculateExpenses()];
    } else {
      labels = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'];
      incomesData = [5200, 5400, 8200, 5600, 5800, 5900, 5800, 6100, 5950, 6400, 6200, SaldoCerto.calculateIncome()];
      expensesData = [2800, 3200, 5400, 3100, 3200, 3150, 2900, 3100, 3450, 3200, 3050, SaldoCerto.calculateExpenses()];
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    flowChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receitas',
            data: incomesData,
            backgroundColor: '#16A34A',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.6
          },
          {
            label: 'Despesas',
            data: expensesData,
            backgroundColor: '#DC2626',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              color: textColor,
              font: { family: 'Inter', size: 12, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${SaldoCerto.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 11 },
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  };

  /**
   * Gráfico de Rosca de Despesas por Categoria (Chart.js)
   */
  const initCategoryChart = () => {
    const canvas = document.getElementById('categoryChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    const state = SaldoCerto.getState();
    const periodTxs = SaldoCerto.getTransactionsForSelectedPeriod();
    const expenses = periodTxs.filter(t => t.type === 'expense');

    // Agrupa por categoria
    const categoryTotals = {};
    expenses.forEach(t => {
      const cat = t.category || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
    });

    let catLabels = Object.keys(categoryTotals);
    let catValues = Object.values(categoryTotals);

    // Se estiver vazio, exibe fallback amigável
    if (catLabels.length === 0) {
      catLabels = ['Moradia', 'Alimentação', 'Transporte', 'Lazer'];
      catValues = [1200, 350, 120, 180];
    }

    const catColors = [
      '#6366F1', '#F59E0B', '#3B82F6', '#EC4899',
      '#EF4444', '#8B5CF6', '#14B8A6', '#64748B'
    ];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: catColors.slice(0, catLabels.length),
          borderWidth: 2,
          borderColor: isDark ? '#1E293B' : '#FFFFFF',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              color: textColor,
              font: { family: 'Inter', size: 11, weight: '500' }
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

  /**
   * Configura filtros de período do gráfico
   */
  const setupChartFilters = () => {
    const filterBtns = document.querySelectorAll('.chart-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFlowFilter = btn.getAttribute('data-filter') || '30d';
        initFlowChart();
      });
    });
  };

  /**
   * Atualização global do dashboard
   */
  const updateAll = () => {
    renderMetrics();
    renderRecentTransactions();
    initFlowChart();
    initCategoryChart();
  };

  const init = () => {
    SaldoCerto.initShell('dashboard');
    updateAll();
    setupChartFilters();

    // Reage à mudança de mês
    window.addEventListener('saldocerto:monthChanged', updateAll);
    // Reage à inserção/edição de transações
    window.addEventListener('saldocerto:transactionSaved', updateAll);
  };

  return {
    init,
    updateAll
  };
})();

document.addEventListener('DOMContentLoaded', DashboardModule.init);
