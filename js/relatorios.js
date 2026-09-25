/**
 * SaldoCerto - Módulo de Relatórios Financeiros e Exportação CSV
 */

const RelatoriosModule = (() => {
  let comparisonChart = null;
  let categoryChart = null;
  let activePeriod = 'semester'; // 'month', 'quarter', 'semester', 'year'

  const renderReports = () => {
    const state = SaldoCerto.getState();
    const txs = state.transactions || [];

    // Monta dados reais dos meses selecionados baseados no histórico do usuário
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const countMonths = activePeriod === 'month' ? 1 : activePeriod === 'quarter' ? 3 : activePeriod === 'semester' ? 6 : 12;
    const filteredMonths = [];

    for (let i = countMonths - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mName = monthNames[mIdx];

      // Filtra transações deste mês
      const mIncomes = txs
        .filter(t => {
          if (t.type !== 'income') return false;
          const dateStr = t.date || t.transaction_date;
          if (!dateStr) return false;
          const td = new Date(dateStr + 'T00:00:00');
          return td.getFullYear() === yr && td.getMonth() === mIdx;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const mExpenses = txs
        .filter(t => {
          if (t.type !== 'expense') return false;
          const dateStr = t.date || t.transaction_date;
          if (!dateStr) return false;
          const td = new Date(dateStr + 'T00:00:00');
          return td.getFullYear() === yr && td.getMonth() === mIdx;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      filteredMonths.push({
        name: `${mName}${yr !== currentYear ? ' ' + yr : ''}`,
        income: mIncomes,
        expense: mExpenses
      });
    }

    const totalIncome = filteredMonths.reduce((s, m) => s + m.income, 0);
    const totalExpense = filteredMonths.reduce((s, m) => s + m.expense, 0);
    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0;

    document.getElementById('statRepIncome').textContent = SaldoCerto.formatCurrency(totalIncome);
    document.getElementById('statRepExpense').textContent = SaldoCerto.formatCurrency(totalExpense);
    
    const balanceEl = document.getElementById('statRepBalance');
    balanceEl.textContent = SaldoCerto.formatCurrency(netBalance);
    balanceEl.style.color = netBalance >= 0 ? 'var(--color-primary)' : 'var(--color-danger)';

    const rateEl = document.getElementById('statRepSavingsRate');
    rateEl.textContent = `${savingsRate}%`;
    rateEl.style.color = savingsRate >= 0 ? 'var(--color-primary)' : 'var(--color-danger)';

    renderComparisonChart(filteredMonths);
    renderCategoryChart(txs);
    renderTable(filteredMonths);
  };

  const renderComparisonChart = (months) => {
    const canvas = document.getElementById('monthlyComparisonChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (comparisonChart) comparisonChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.name),
        datasets: [
          {
            label: 'Receitas',
            data: months.map(m => m.income),
            backgroundColor: '#16A34A',
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: months.map(m => m.expense),
            backgroundColor: '#DC2626',
            borderRadius: 6
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
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${SaldoCerto.formatCurrency(ctx.raw)}`
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
              callback: (val) => 'R$ ' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  };

  const renderCategoryChart = (txs) => {
    const canvas = document.getElementById('reportCategoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (categoryChart) categoryChart.destroy();

    const expenses = txs.filter(t => t.type === 'expense');
    const catMap = {};
    expenses.forEach(t => {
      const catName = (t.category || 'Outros').split('(')[0].trim();
      catMap[catName] = (catMap[catName] || 0) + Number(t.amount || 0);
    });

    let labels = Object.keys(catMap);
    let values = Object.values(catMap);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';

    if (labels.length === 0) {
      categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sem Despesas Cadastradas'],
          datasets: [{
            data: [1],
            backgroundColor: [isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor }
            },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    const colors = ['#6366F1', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#8B5CF6', '#14B8A6', '#64748B'];

    categoryChart = new Chart(ctx, {
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
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              color: textColor,
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.label}: ${SaldoCerto.formatCurrency(c.raw)}`
            }
          }
        }
      }
    });
  };

  const renderTable = (months) => {
    const tbody = document.getElementById('monthlyComparisonTableBody');
    if (!tbody) return;

    tbody.innerHTML = months.map(m => {
      const net = m.income - m.expense;
      const rate = m.income > 0 ? ((net / m.income) * 100).toFixed(1) : 0;
      const isPositive = net >= 0;

      return `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td style="color: var(--color-success); font-weight: 600;">+ ${SaldoCerto.formatCurrency(m.income)}</td>
          <td style="color: var(--color-danger); font-weight: 600;">- ${SaldoCerto.formatCurrency(m.expense)}</td>
          <td style="color: ${isPositive ? 'var(--color-primary)' : 'var(--color-danger)'}; font-weight: 800;">
            ${isPositive ? '+' : '-'} ${SaldoCerto.formatCurrency(Math.abs(net))}
          </td>
          <td>
            <span class="badge ${isPositive ? 'badge-success' : 'badge-danger'}">${rate}%</span>
          </td>
          <td>
            <span class="badge ${isPositive ? 'badge-primary' : 'badge-danger'}">
              ${isPositive ? 'Superávit' : 'Déficit'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  const setupFilterButtons = () => {
    const btns = document.querySelectorAll('.chart-filter-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePeriod = btn.getAttribute('data-period') || 'semester';
        renderReports();
      });
    });
  };

  /**
   * Exporta todas as transações para CSV formatado em UTF-8 com BOM
   */
  const exportToCSV = () => {
    const state = SaldoCerto.getState();
    const txs = state.transactions || [];

    if (txs.length === 0) {
      SaldoCerto.showToast('Nenhuma movimentação para exportar.', 'warning');
      return;
    }

    // Cabeçalho CSV
    const headers = ['ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Forma de Pagamento', 'Valor (R$)', 'Observações'];

    const rows = txs.map(t => [
      `"${t.id}"`,
      `"${SaldoCerto.formatDate(t.date || t.transaction_date)}"`,
      `"${t.type === 'income' ? 'Receita' : 'Despesa'}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      `"${t.account || ''}"`,
      `"${t.paymentMethod || t.payment_method || ''}"`,
      `"${Number(t.amount || 0).toFixed(2).replace('.', ',')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_saldocerto_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    SaldoCerto.showToast('Relatório financeiro exportado com sucesso em CSV!', 'success');
  };

  /**
   * Ação para Apagar Todos os Lançamentos (Reset de dados)
   */
  const promptClearAllTransactions = () => {
    SaldoCerto.confirmAction(
      'ATENÇÃO: Deseja realmente APAGAR TODOS os lançamentos financeiros cadastrados (receitas e despesas)? Esta ação não pode ser desfeita.',
      async () => {
        try {
          if (window.SaldoCertoTransactions && window.SaldoCertoTransactions.deleteAllTransactions) {
            await window.SaldoCertoTransactions.deleteAllTransactions();
          } else {
            SaldoCerto.getState().transactions = [];
            SaldoCerto.saveData();
          }

          SaldoCerto.showToast('Todos os lançamentos foram apagados com sucesso! Comece do zero com saldo limpo.', 'success');
          renderReports();
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          console.error(err);
          SaldoCerto.showToast('Erro ao apagar lançamentos. Tente novamente.', 'danger');
        }
      }
    );
  };

  const init = async () => {
    SaldoCerto.initShell('relatorios');
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
    const printEl = document.getElementById('printReportPeriod');
    if (printEl) {
      printEl.textContent = `Demonstrativo gerado em ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    }
    renderReports();
    setupFilterButtons();
    if (window.lucide) window.lucide.createIcons();
    window.addEventListener('saldocerto:themeChanged', renderReports);
  };

  return {
    init,
    renderReports,
    exportToCSV,
    promptClearAllTransactions
  };
})();

document.addEventListener('DOMContentLoaded', RelatoriosModule.init);
