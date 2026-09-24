/**
 * SaldoCerto - Simulador de Juros Compostos & Independência Financeira
 */

const SimuladorModule = (() => {
  let simChart = null;

  const calculateSimulation = () => {
    const P = parseFloat(document.getElementById('rangeInitial').value) || 0;
    const PMT = parseFloat(document.getElementById('rangeMonthly').value) || 0;
    const annualRate = (parseFloat(document.getElementById('rangeRate').value) || 0) / 100;
    const years = parseInt(document.getElementById('rangeYears').value, 10) || 1;

    // Atualiza badges
    document.getElementById('labelInitial').textContent = SaldoCerto.formatCurrency(P);
    document.getElementById('labelMonthly').textContent = `${SaldoCerto.formatCurrency(PMT)} / mês`;
    document.getElementById('labelRate').textContent = `${(annualRate * 100).toFixed(1).replace('.', ',')}% ao ano`;
    document.getElementById('labelYears').textContent = `${years} ${years === 1 ? 'ano' : 'anos'}`;

    // Taxa mensal equivalente
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const totalMonths = years * 12;

    let currentBalance = P;
    let totalInvested = P;
    let monthsToMillion = null;

    const yearlyData = [];

    for (let m = 1; m <= totalMonths; m++) {
      const interestEarned = currentBalance * monthlyRate;
      currentBalance += interestEarned + PMT;
      totalInvested += PMT;

      if (!monthsToMillion && currentBalance >= 1000000) {
        monthsToMillion = m;
      }

      if (m % 12 === 0) {
        const yearNum = m / 12;
        const totalInterest = currentBalance - totalInvested;
        yearlyData.push({
          year: yearNum,
          totalInvested: totalInvested,
          balance: currentBalance,
          interest: totalInterest,
          passiveIncome: currentBalance * 0.005 // 0.5% ao mês seguro
        });
      }
    }

    const finalBalance = currentBalance;
    const finalInterest = finalBalance - totalInvested;
    const finalPassive = finalBalance * 0.005;

    // Métricas finais
    document.getElementById('statSimFinalTotal').textContent = SaldoCerto.formatCurrency(finalBalance);
    document.getElementById('statSimInvestedTotal').textContent = SaldoCerto.formatCurrency(totalInvested);
    document.getElementById('statSimInterestTotal').textContent = `+ ${SaldoCerto.formatCurrency(finalInterest)}`;
    document.getElementById('statSimPassiveIncome').textContent = `${SaldoCerto.formatCurrency(finalPassive)} / mês`;

    // Tempo até o milhão
    const millionEl = document.getElementById('timeToMillionText');
    if (monthsToMillion) {
      const y = Math.floor(monthsToMillion / 12);
      const m = monthsToMillion % 12;
      millionEl.textContent = `🎯 Você atinge R$ 1.000.000 em aprox. ${y} anos e ${m} meses!`;
    } else {
      millionEl.textContent = `Continue os aportes! Em ${years} anos seu patrimônio será ${SaldoCerto.formatCurrency(finalBalance)}.`;
    }

    renderChart(yearlyData);
    renderTable(yearlyData);
  };

  const renderChart = (yearlyData) => {
    const canvas = document.getElementById('compoundInterestChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (simChart) simChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    simChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearlyData.map(d => `Ano ${d.year}`),
        datasets: [
          {
            label: 'Patrimônio Total (com Juros)',
            data: yearlyData.map(d => d.balance),
            borderColor: '#16A34A',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 3
          },
          {
            label: 'Total Investido do Bolso',
            data: yearlyData.map(d => d.totalInvested),
            borderColor: '#2563EB',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
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
              callback: (val) => 'R$ ' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  };

  const renderTable = (yearlyData) => {
    const tbody = document.getElementById('simYearTableBody');
    if (!tbody) return;

    tbody.innerHTML = yearlyData.map(d => `
      <tr>
        <td><strong>Ano ${d.year}</strong></td>
        <td>${SaldoCerto.formatCurrency(d.totalInvested)}</td>
        <td style="color: var(--color-success);">+ ${SaldoCerto.formatCurrency(d.balance - d.totalInvested)}</td>
        <td style="color: var(--color-success); font-weight: 600;">${SaldoCerto.formatCurrency(d.interest)}</td>
        <td style="font-weight: 800; color: var(--color-primary);">${SaldoCerto.formatCurrency(d.balance)}</td>
        <td style="color: var(--color-info); font-weight: 600;">${SaldoCerto.formatCurrency(d.passiveIncome)} / mês</td>
      </tr>
    `).join('');
  };

  const init = () => {
    SaldoCerto.initShell('simulador');
    calculateSimulation();

    ['rangeInitial', 'rangeMonthly', 'rangeRate', 'rangeYears'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', calculateSimulation);
    });

    window.addEventListener('saldocerto:themeChanged', calculateSimulation);
  };

  return {
    init,
    calculateSimulation
  };
})();

document.addEventListener('DOMContentLoaded', SimuladorModule.init);
