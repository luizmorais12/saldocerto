/**
 * SaldoCerto - Módulo de Patrimônio Líquido (Supabase Integrado)
 * Cálculo em tempo real: Ativos (Bens + Contas + Investimentos) - Passivos (Dívidas + Cartões) com RLS.
 */

const PatrimonioModule = (() => {
  let netWorthChart = null;

  /**
   * Busca bens e ativos cadastrados na tabela assets
   */
  const getAssets = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('assets')
          .select('*')
          .order('value', { ascending: false });

        if (error) {
          console.error('[Patrimonio Supabase] Erro ao buscar ativos:', error);
          return SaldoCerto.getState().assets || [];
        }

        const mapped = (data || []).map(a => ({
          id: a.id,
          name: a.name,
          category: a.type,
          value: Number(a.value),
          description: a.description
        }));

        SaldoCerto.getState().assets = mapped;
        return mapped;
      } catch (err) {
        console.error('[Patrimonio Supabase] Exceção em getAssets:', err);
        return SaldoCerto.getState().assets || [];
      }
    }
    return SaldoCerto.getState().assets || [];
  };

  /**
   * Cadastra novo bem ou ativo
   */
  const createAsset = async (assetData) => {
    const val = parseFloat(assetData.value) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('assets')
        .insert({
          user_id: user.id,
          name: assetData.name.trim(),
          type: assetData.category || 'Outros',
          value: val,
          description: assetData.description || ''
        })
        .select()
        .single();

      if (error) throw error;

      const created = {
        id: data.id,
        name: data.name,
        category: data.type,
        value: Number(data.value),
        description: data.description
      };

      SaldoCerto.getState().assets.push(created);
      return created;
    } else {
      const newAsset = {
        id: 'asset-' + Date.now(),
        name: assetData.name.trim(),
        category: assetData.category,
        value: val
      };
      SaldoCerto.getState().assets.push(newAsset);
      SaldoCerto.saveData();
      return newAsset;
    }
  };

  /**
   * Exclui um bem/ativo
   */
  const deleteAsset = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }

    SaldoCerto.getState().assets = (SaldoCerto.getState().assets || []).filter(a => a.id !== id);
    SaldoCerto.saveData();
  };

  /**
   * Busca passivos e dívidas cadastradas na tabela liabilities
   */
  const getLiabilities = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('liabilities')
          .select('*')
          .order('remaining_amount', { ascending: false });

        if (error) {
          console.error('[Patrimonio Supabase] Erro ao buscar passivos:', error);
          return SaldoCerto.getState().liabilities || [];
        }

        const mapped = (data || []).map(l => ({
          id: l.id,
          name: l.name,
          category: l.type,
          value: Number(l.remaining_amount || l.total_amount),
          totalAmount: Number(l.total_amount),
          dueDate: l.due_date,
          description: l.description
        }));

        SaldoCerto.getState().liabilities = mapped;
        return mapped;
      } catch (err) {
        console.error('[Patrimonio Supabase] Exceção em getLiabilities:', err);
        return SaldoCerto.getState().liabilities || [];
      }
    }
    return SaldoCerto.getState().liabilities || [];
  };

  /**
   * Cadastra novo passivo ou dívida
   */
  const createLiability = async (liabData) => {
    const val = parseFloat(liabData.value) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('liabilities')
        .insert({
          user_id: user.id,
          name: liabData.name.trim(),
          type: liabData.category || 'Outros',
          total_amount: val,
          remaining_amount: val,
          description: liabData.description || ''
        })
        .select()
        .single();

      if (error) throw error;

      const created = {
        id: data.id,
        name: data.name,
        category: data.type,
        value: Number(data.remaining_amount),
        totalAmount: Number(data.total_amount),
        description: data.description
      };

      SaldoCerto.getState().liabilities.push(created);
      return created;
    } else {
      const newLiab = {
        id: 'liab-' + Date.now(),
        name: liabData.name.trim(),
        category: liabData.category,
        value: val
      };
      SaldoCerto.getState().liabilities.push(newLiab);
      SaldoCerto.saveData();
      return newLiab;
    }
  };

  /**
   * Exclui um passivo/dívida
   */
  const deleteLiability = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('liabilities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }

    SaldoCerto.getState().liabilities = (SaldoCerto.getState().liabilities || []).filter(l => l.id !== id);
    SaldoCerto.saveData();
  };

  /**
   * Renderização do patrimônio líquido e tabelas
   */
  const renderNetWorth = async () => {
    const [assets, liabilities] = await Promise.all([
      getAssets(),
      getLiabilities()
    ]);

    const totalAssets = SaldoCerto.calculateTotalAssets();
    const totalLiabilities = SaldoCerto.calculateTotalLiabilities();
    const netWorth = totalAssets - totalLiabilities;

    const statAssets = document.getElementById('statTotalAssets');
    if (statAssets) statAssets.textContent = SaldoCerto.formatCurrency(totalAssets);
    const statLiab = document.getElementById('statTotalLiabilities');
    if (statLiab) statLiab.textContent = SaldoCerto.formatCurrency(totalLiabilities);
    
    const netWorthEl = document.getElementById('statNetWorth');
    if (netWorthEl) {
      netWorthEl.textContent = SaldoCerto.formatCurrency(netWorth);
      netWorthEl.style.color = netWorth >= 0 ? 'var(--color-primary)' : 'var(--color-danger)';
    }

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
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
            Nenhum bem ou ativo adicional cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = assets.map(a => `
      <tr>
        <td><strong>${a.name}</strong></td>
        <td><span class="badge badge-info">${a.category}</span></td>
        <td style="color: var(--color-success); font-weight: 700;">+ ${SaldoCerto.formatCurrency(a.value)}</td>
        <td>
          <button class="btn-icon" style="width: 28px; height: 28px;" title="Excluir ativo" onclick="PatrimonioModule.handleDeleteAsset('${a.id}')">
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
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
            Nenhuma dívida ou passivo registrado. Excelente!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = liabilities.map(l => `
      <tr>
        <td><strong>${l.name}</strong></td>
        <td><span class="badge badge-warning">${l.category}</span></td>
        <td style="color: var(--color-danger); font-weight: 700;">- ${SaldoCerto.formatCurrency(l.value)}</td>
        <td>
          <button class="btn-icon" style="width: 28px; height: 28px;" title="Excluir passivo" onclick="PatrimonioModule.handleDeleteLiability('${l.id}')">
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

  const openAddLiabilityModal = () => {
    document.getElementById('liabilityForm').reset();
    SaldoCerto.openModal('liabilityModal');
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    const name = document.getElementById('assetName').value.trim();
    const category = document.getElementById('assetCategory').value;
    const value = document.getElementById('assetValue').value;

    if (!name || !value) {
      SaldoCerto.showToast('Informe o nome e o valor do bem.', 'warning');
      return;
    }

    try {
      await createAsset({ name, category, value });
      SaldoCerto.closeModal('assetModal');
      SaldoCerto.showToast(`Ativo "${name}" cadastrado com sucesso!`, 'success');
      await renderNetWorth();
    } catch (err) {
      SaldoCerto.showToast('Erro ao cadastrar bem.', 'danger');
    }
  };

  const handleSaveLiability = async (e) => {
    e.preventDefault();
    const name = document.getElementById('liabilityName').value.trim();
    const category = document.getElementById('liabilityCategory').value;
    const value = document.getElementById('liabilityValue').value;

    if (!name || !value) {
      SaldoCerto.showToast('Informe o nome e o saldo devedor.', 'warning');
      return;
    }

    try {
      await createLiability({ name, category, value });
      SaldoCerto.closeModal('liabilityModal');
      SaldoCerto.showToast(`Passivo "${name}" registrado!`, 'success');
      await renderNetWorth();
    } catch (err) {
      SaldoCerto.showToast('Erro ao registrar passivo.', 'danger');
    }
  };

  const handleDeleteAsset = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir este bem/ativo?', async () => {
      try {
        await deleteAsset(id);
        SaldoCerto.showToast('Ativo excluído com sucesso.', 'info');
        await renderNetWorth();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir ativo.', 'danger');
      }
    });
  };

  const handleDeleteLiability = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta dívida/passivo?', async () => {
      try {
        await deleteLiability(id);
        SaldoCerto.showToast('Dívida excluída com sucesso.', 'info');
        await renderNetWorth();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir passivo.', 'danger');
      }
    });
  };

  const init = async () => {
    SaldoCerto.initShell('patrimonio');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    await renderNetWorth();
  };

  return {
    init,
    getAssets,
    createAsset,
    deleteAsset,
    getLiabilities,
    createLiability,
    deleteLiability,
    renderNetWorth,
    openAddAssetModal,
    openAddLiabilityModal,
    handleSaveAsset,
    handleSaveLiability,
    handleDeleteAsset,
    handleDeleteLiability
  };
})();

document.addEventListener('DOMContentLoaded', PatrimonioModule.init);
