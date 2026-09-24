/**
 * SaldoCerto - Simulador de Juros Compostos & Rumo ao Primeiro Milhão
 * Projeções matemáticas em tempo real, marcos de patrimônio e renda passiva.
 */

const SimuladorModule = (() => {
  let simChart = null;

  const formatDuration = (months) => {
    if (!months) return 'Aumente o aporte';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
    if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`;
    return `${y} a e ${m} m`;
  };

  const calculateSimulation = () => {
    const P = parseFloat(document.getElementById('inputInitial')?.value || document.getElementById('rangeInitial')?.value) || 0;
    const PMT = parseFloat(document.getElementById('inputMonthly')?.value || document.getElementById('rangeMonthly')?.value) || 0;
    const annualRate = (parseFloat(document.getElementById('inputRate')?.value || document.getElementById('rangeRate')?.value) || 0) / 100;
    const years = parseInt(document.getElementById('inputYears')?.value || document.getElementById('rangeYears')?.value, 10) || 1;
    const extraAnnual = parseFloat(document.getElementById('inputExtraAnnual')?.value) || 0;

    // Sincroniza sliders com inputs caso divirjam
    const rangeInit = document.getElementById('rangeInitial');
    if (rangeInit && rangeInit.value != P) rangeInit.value = Math.min(200000, P);
    const rangeMo = document.getElementById('rangeMonthly');
    if (rangeMo && rangeMo.value != PMT) rangeMo.value = Math.min(30000, PMT);
    const rangeRt = document.getElementById('rangeRate');
    if (rangeRt && rangeRt.value != (annualRate * 100)) rangeRt.value = (annualRate * 100);
    const rangeYr = document.getElementById('rangeYears');
    if (rangeYr && rangeYr.value != years) rangeYr.value = years;

    // Taxa mensal equivalente
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const totalMonths = years * 12;

    let currentBalance = P;
    let totalInvested = P;

    const yearlyData = [];

    for (let m = 1; m <= totalMonths; m++) {
      const interestEarned = currentBalance * monthlyRate;
      currentBalance += interestEarned + PMT;
      totalInvested += PMT;

      // Adiciona aporte extra anual todo mês de dezembro (m % 12 === 0)
      if (m % 12 === 0 && extraAnnual > 0) {
        currentBalance += extraAnnual;
        totalInvested += extraAnnual;
      }

      if (m % 12 === 0) {
        const yearNum = m / 12;
        const totalInterest = currentBalance - totalInvested;
        yearlyData.push({
          year: yearNum,
          totalInvested: totalInvested,
          balance: currentBalance,
          interest: totalInterest,
          passiveIncome: currentBalance * 0.005
        });
      }
    }

    const finalBalance = currentBalance;
    const finalInterest = finalBalance - totalInvested;
    const finalPassive = finalBalance * 0.005;

    // Métricas finais
    const statFinal = document.getElementById('statSimFinalTotal');
    if (statFinal) statFinal.textContent = SaldoCerto.formatCurrency(finalBalance);
    const statInvested = document.getElementById('statSimInvestedTotal');
    if (statInvested) statInvested.textContent = SaldoCerto.formatCurrency(totalInvested);
    const statInterest = document.getElementById('statSimInterestTotal');
    if (statInterest) statInterest.textContent = `+ ${SaldoCerto.formatCurrency(finalInterest)}`;
    const statPassive = document.getElementById('statSimPassiveIncome');
    if (statPassive) statPassive.textContent = `${SaldoCerto.formatCurrency(finalPassive)} / mês`;

    // Cálculo dos Marcos Rumo ao Primeiro Milhão (até 600 meses)
    let bSim = P;
    let m100 = null, m250 = null, m500 = null, m1000 = null;

    if (bSim >= 100000) m100 = 0;
    if (bSim >= 250000) m250 = 0;
    if (bSim >= 500000) m500 = 0;
    if (bSim >= 1000000) m1000 = 0;

    for (let m = 1; m <= 600; m++) {
      bSim += (bSim * monthlyRate) + PMT;
      if (m % 12 === 0 && extraAnnual > 0) bSim += extraAnnual;

      if (m100 === null && bSim >= 100000) m100 = m;
      if (m250 === null && bSim >= 250000) m250 = m;
      if (m500 === null && bSim >= 500000) m500 = m;
      if (m1000 === null && bSim >= 1000000) m1000 = m;
      if (m1000 !== null) break;
    }

    const el100 = document.getElementById('timeTo100k');
    if (el100) el100.textContent = m100 === 0 ? 'Já alcançado! 🎉' : (m100 ? `Aprox. ${formatDuration(m100)}` : 'Aumente o aporte');
    const el250 = document.getElementById('timeTo250k');
    if (el250) el250.textContent = m250 === 0 ? 'Já alcançado! 🎉' : (m250 ? `Aprox. ${formatDuration(m250)}` : 'Aumente o aporte');
    const el500 = document.getElementById('timeTo500k');
    if (el500) el500.textContent = m500 === 0 ? 'Já alcançado! 🎉' : (m500 ? `Aprox. ${formatDuration(m500)}` : 'Aumente o aporte');
    const el1M = document.getElementById('timeTo1M');
    if (el1M) el1M.textContent = m1000 === 0 ? 'Já alcançado! 🏆' : (m1000 ? `Aprox. ${formatDuration(m1000)}` : 'Aumente o aporte');

    const millionText = document.getElementById('timeToMillionText');
    if (millionText) {
      if (m1000 === 0) {
        millionText.textContent = 'Parabéns! Você já possui mais de R$ 1 Milhão.';
      } else if (m1000) {
        const y = Math.floor(m1000 / 12);
        const m = m1000 % 12;
        millionText.textContent = `🎯 Você atinge R$ 1.000.000 em aprox. ${y} anos e ${m} meses!`;
      } else {
        millionText.textContent = `Em ${years} anos seu patrimônio será ${SaldoCerto.formatCurrency(finalBalance)}. Aumente o aporte para o 1º milhão!`;
      }
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

  const clearAll = () => {
    const fields = [
      { id: 'inputInitial', range: 'rangeInitial', val: 0 },
      { id: 'inputMonthly', range: 'rangeMonthly', val: 0 },
      { id: 'inputRate', range: 'rangeRate', val: 10 },
      { id: 'inputYears', range: 'rangeYears', val: 5 },
      { id: 'inputExtraAnnual', val: 0 }
    ];

    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      if (inp) inp.value = f.val;
      if (f.range) {
        const rng = document.getElementById(f.range);
        if (rng) rng.value = f.val;
      }
    });

    calculateSimulation();
    SaldoCerto.showToast('Parâmetros limpos. Digite os novos valores desejados.', 'info');
  };

  const resetDefaults = () => {
    const defaults = [
      { id: 'inputInitial', range: 'rangeInitial', val: 5000 },
      { id: 'inputMonthly', range: 'rangeMonthly', val: 1000 },
      { id: 'inputRate', range: 'rangeRate', val: 11.5 },
      { id: 'inputYears', range: 'rangeYears', val: 15 },
      { id: 'inputExtraAnnual', val: 0 }
    ];

    defaults.forEach(f => {
      const inp = document.getElementById(f.id);
      if (inp) inp.value = f.val;
      if (f.range) {
        const rng = document.getElementById(f.range);
        if (rng) rng.value = f.val;
      }
    });

    calculateSimulation();
    SaldoCerto.showToast('Valores padrão restaurados.', 'success');
  };

  const setField = (field, value) => {
    const inp = document.getElementById(`input${field}`);
    const rng = document.getElementById(`range${field}`);
    if (inp) inp.value = value;
    if (rng) rng.value = value;
    calculateSimulation();
  };

  const adjustField = (field, delta) => {
    const inp = document.getElementById(`input${field}`);
    const rng = document.getElementById(`range${field}`);
    const current = parseFloat(inp?.value || rng?.value) || 0;
    const next = Math.max(0, current + delta);
    if (inp) inp.value = next;
    if (rng) rng.value = next;
    calculateSimulation();
  };

  const init = async () => {
    SaldoCerto.initShell('simulador');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }

    calculateSimulation();

    // Sincronização bidirecional entre inputs numéricos e sliders
    ['Initial', 'Monthly', 'Rate', 'Years'].forEach(key => {
      const inputEl = document.getElementById(`input${key}`);
      const rangeEl = document.getElementById(`range${key}`);

      inputEl?.addEventListener('input', () => {
        if (rangeEl) rangeEl.value = inputEl.value;
        calculateSimulation();
      });

      rangeEl?.addEventListener('input', () => {
        if (inputEl) inputEl.value = rangeEl.value;
        calculateSimulation();
      });
    });

    document.getElementById('inputExtraAnnual')?.addEventListener('input', calculateSimulation);

    window.addEventListener('saldocerto:themeChanged', calculateSimulation);
  };

  return {
    init,
    calculateSimulation,
    clearAll,
    resetDefaults,
    setField,
    adjustField
  };
})();

document.addEventListener('DOMContentLoaded', SimuladorModule.init);
