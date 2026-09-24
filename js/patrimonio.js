/**
 * SaldoCerto - Módulo de Patrimônio Líquido
 */

const PatrimonioModule = (() => {
  let netWorthChart = null;

  const renderNetWorth = () => {
    const state = SaldoCerto.getState();
    const assets = state.assets || [];
    const liabilities = state.liabilities || [];

    const totalAssets = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.value || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    document.getElementById('statTotalAssets').textContent = SaldoCerto.formatCurrency(totalAssets);
    document.getElementById('statTotalLiabilities').textContent = SaldoCerto.formatCurrency(totalLiabilities);
    
    const netWorthEl = document.getElementById('statNetWorth');
    netWorthEl.textContent = SaldoCerto.formatCurrency(netWorth);
    netWorthEl.style.color = netWorth >= 0 ? 'var(--color-primary)' : 'var(--color-danger)';

    const ratio = totalAssets > 0 ? (((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(0) : 0;
    const ratioEl = document.getElementById('statSolvencyRatio');
    if (ratioEl) {
      ratioEl.innerHTML = `<i data-lucide="check-circle-2"></i> <span>${ratio}% do patrimônio livre de dívidas</span>`;
    }

    renderChart(netWorth);
    renderAssetsTable(assets);
    renderLiabilitiesTable(liabilities);
  };

  const renderChart = (currentNetWorth) => {
    const canvas = document.getElementById('netWorthChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (netWorthChart) netWorthChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Simulação consistente de evolução histórica até o valor atual
    const m1 = currentNetWorth * 0.82;
    const m2 = currentNetWorth * 0.85;
    const m3 = currentNetWorth * 0.89;
    const m4 = currentNetWorth * 0.93;
    const m5 = currentNetWorth * 0.96;
    const m6 = currentNetWorth;

    netWorthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro'],
        datasets: [{
          label: 'Patrimônio Líquido',
          data: [m1, m2, m3, m4, m5, m6],
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#16A34A',
          borderWidth: 3
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
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => 'R$ ' + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });
  };

  const renderAssetsTable = (assets) => {
    const tbody = document.getElementById('assetsTableBody');
    if (!tbody) return;

    if (assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align: center; padding: 20px;">Nenhum ativo cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = assets.map(a => `
      <tr>
        <td><strong>${a.name}</strong></td>
        <td><span class="badge badge-success">${a.category}</span></td>
        <td style="color: var(--color-success); font-weight: 700;">+ ${SaldoCerto.formatCurrency(a.value)}</td>
        <td>
          <button class="btn-icon" style="width: 32px; height: 32px;" title="Remover ativo" onclick="PatrimonioModule.handleDeleteAsset('${a.id}')">
            <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const renderLiabilitiesTable = (liabilities) => {
    const tbody = document.getElementById('liabilitiesTableBody');
    if (!tbody) return;

    if (liabilities.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align: center; padding: 20px;">Nenhuma dívida registrada. Parabéns!</td></tr>`;
      return;
    }

    tbody.innerHTML = liabilities.map(l => `
      <tr>
        <td><strong>${l.name}</strong></td>
        <td><span class="badge badge-danger">${l.category}</span></td>
        <td style="color: var(--color-danger); font-weight: 700;">- ${SaldoCerto.formatCurrency(l.value)}</td>
        <td>
          <button class="btn-icon" style="width: 32px; height: 32px;" title="Remover dívida" onclick="PatrimonioModule.handleDeleteLiability('${l.id}')">
            <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openAddAssetModal = () => {
    document.getElementById('assetForm').reset();
    SaldoCerto.openModal('assetModal');
  };

  const handleSaveAsset = (e) => {
    e.preventDefault();
    const name = document.getElementById('assetName').value.trim();
    const category = document.getElementById('assetCategory').value;
    const value = parseFloat(document.getElementById('assetValue').value) || 0;

    const state = SaldoCerto.getState();
    state.assets = state.assets || [];
    state.assets.push({
      id: 'ast-' + Date.now(),
      name,
      category,
      value
    });

    SaldoCerto.saveData();
    SaldoCerto.showToast(`Ativo "${name}" adicionado com sucesso!`, 'success');
    SaldoCerto.closeModal('assetModal');
    renderNetWorth();
  };

  const handleDeleteAsset = (id) => {
    SaldoCerto.confirmAction('Remover este ativo?', () => {
      const state = SaldoCerto.getState();
      state.assets = (state.assets || []).filter(a => a.id !== id);
      SaldoCerto.saveData();
      SaldoCerto.showToast('Ativo removido.', 'info');
      renderNetWorth();
    });
  };

  const openAddLiabilityModal = () => {
    document.getElementById('liabilityForm').reset();
    SaldoCerto.openModal('liabilityModal');
  };

  const handleSaveLiability = (e) => {
    e.preventDefault();
    const name = document.getElementById('liabilityName').value.trim();
    const category = document.getElementById('liabilityCategory').value;
    const value = parseFloat(document.getElementById('liabilityValue').value) || 0;

    const state = SaldoCerto.getState();
    state.liabilities = state.liabilities || [];
    state.liabilities.push({
      id: 'lia-' + Date.now(),
      name,
      category,
      value
    });

    SaldoCerto.saveData();
    SaldoCerto.showToast(`Dívida "${name}" registrada!`, 'warning');
    SaldoCerto.closeModal('liabilityModal');
    renderNetWorth();
  };

  const handleDeleteLiability = (id) => {
    SaldoCerto.confirmAction('Remover esta dívida/passivo?', () => {
      const state = SaldoCerto.getState();
      state.liabilities = (state.liabilities || []).filter(l => l.id !== id);
      SaldoCerto.saveData();
      SaldoCerto.showToast('Dívida removida.', 'info');
      renderNetWorth();
    });
  };

  const init = () => {
    SaldoCerto.initShell('patrimonio');
    renderNetWorth();
    window.addEventListener('saldocerto:themeChanged', renderNetWorth);
  };

  return {
    init,
    renderNetWorth,
    openAddAssetModal,
    handleSaveAsset,
    handleDeleteAsset,
    openAddLiabilityModal,
    handleSaveLiability,
    handleDeleteLiability
  };
})();

document.addEventListener('DOMContentLoaded', PatrimonioModule.init);
