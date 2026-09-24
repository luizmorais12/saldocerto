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

        const mapped = (data || []).map(a => {
          let meta = {};
          try {
            if (a.description && a.description.startsWith('{')) {
              meta = JSON.parse(a.description);
            }
          } catch (e) {}

          return {
            id: a.id,
            name: a.name,
            category: a.type,
            value: Number(a.value),
            description: a.description,
            acquisitionType: meta.acquisitionType || 'a_vista',
            totalInstallments: meta.totalInstallments || null,
            paidInstallments: meta.paidInstallments || null,
            financingStatus: meta.financingStatus || 'quitado'
          };
        });

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
    const meta = {
      acquisitionType: assetData.acquisitionType || 'a_vista',
      totalInstallments: assetData.totalInstallments ? parseInt(assetData.totalInstallments, 10) : null,
      paidInstallments: assetData.paidInstallments ? parseInt(assetData.paidInstallments, 10) : null,
      financingStatus: assetData.financingStatus || 'quitado'
    };
    const descJson = JSON.stringify(meta);

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
          description: descJson
        })
        .select()
        .single();

      if (error) throw error;

      const created = {
        id: data.id,
        name: data.name,
        category: data.type,
        value: Number(data.value),
        description: data.description,
        ...meta
      };

      SaldoCerto.getState().assets.push(created);
      return created;
    } else {
      const newAsset = {
        id: 'asset-' + Date.now(),
        name: assetData.name.trim(),
        category: assetData.category,
        value: val,
        ...meta
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

        const mapped = (data || []).map(l => {
          let meta = {};
          try {
            if (l.description && l.description.startsWith('{')) {
              meta = JSON.parse(l.description);
            }
          } catch (e) {}

          const remaining = meta.remainingInstallments !== undefined ? meta.remainingInstallments : null;
          const totalInst = meta.totalInstallments !== undefined ? meta.totalInstallments : null;

          return {
            id: l.id,
            name: l.name,
            category: l.type,
            value: Number(l.remaining_amount || l.total_amount),
            totalAmount: Number(l.total_amount),
            dueDate: l.due_date,
            description: l.description,
            isInstallment: meta.isInstallment !== false && (totalInst > 1 || remaining !== null),
            totalInstallments: totalInst,
            remainingInstallments: remaining,
            installmentAmount: meta.installmentAmount || (remaining > 0 ? Number(l.remaining_amount) / remaining : null),
            dueDay: meta.dueDay || null
          };
        });

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
    const isInst = liabData.isInstallment === 'yes';
    const totalInst = isInst && liabData.totalInstallments ? parseInt(liabData.totalInstallments, 10) : null;
    const remInst = isInst && liabData.remainingInstallments ? parseInt(liabData.remainingInstallments, 10) : null;
    const instAmount = isInst && liabData.installmentAmount ? parseFloat(liabData.installmentAmount) : null;
    const dueDay = isInst && liabData.dueDay ? parseInt(liabData.dueDay, 10) : null;

    const meta = {
      isInstallment: isInst,
      totalInstallments: totalInst,
      remainingInstallments: remInst,
      installmentAmount: instAmount,
      dueDay: dueDay
    };
    const descJson = JSON.stringify(meta);

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
          description: descJson
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
        description: data.description,
        ...meta
      };

      SaldoCerto.getState().liabilities.push(created);
      return created;
    } else {
      const newLiab = {
        id: 'liab-' + Date.now(),
        name: liabData.name.trim(),
        category: liabData.category,
        value: val,
        totalAmount: val,
        ...meta
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

  const toggleAssetInstallmentFields = () => {
    const acq = document.getElementById('assetAcquisitionType')?.value;
    const box = document.getElementById('assetInstallmentsBox');
    if (box) {
      box.style.display = acq === 'installments' ? 'block' : 'none';
    }
  };

  const toggleLiabilityInstallmentFields = () => {
    const isInst = document.getElementById('liabilityIsInstallment')?.value;
    const box = document.getElementById('liabilityInstallmentsBox');
    if (box) {
      box.style.display = isInst === 'yes' ? 'block' : 'none';
    }
  };

  const calcDebtBalance = () => {
    const rem = parseInt(document.getElementById('liabilityRemainingInstallments')?.value, 10);
    const instAmt = parseFloat(document.getElementById('liabilityInstallmentAmount')?.value);
    const valueEl = document.getElementById('liabilityValue');
    if (valueEl && rem > 0 && instAmt > 0 && (!valueEl.value || valueEl.dataset.autocalc === 'true')) {
      valueEl.value = (rem * instAmt).toFixed(2);
      valueEl.dataset.autocalc = 'true';
    }
  };

  const autoCalculateTotalFromInstallments = () => {
    const rem = parseInt(document.getElementById('liabilityRemainingInstallments')?.value, 10) || 0;
    const instAmt = parseFloat(document.getElementById('liabilityInstallmentAmount')?.value) || 0;
    const valueEl = document.getElementById('liabilityValue');
    if (rem > 0 && instAmt > 0) {
      valueEl.value = (rem * instAmt).toFixed(2);
      valueEl.dataset.autocalc = 'true';
      SaldoCerto.showToast(`Saldo calculado: ${rem}x de ${SaldoCerto.formatCurrency(instAmt)} = ${SaldoCerto.formatCurrency(rem * instAmt)}`, 'info');
    } else {
      SaldoCerto.showToast('Informe as parcelas restantes e o valor mensal da parcela.', 'warning');
    }
  };

  const renderAssetsTable = (assets) => {
    const tbody = document.getElementById('assetsTableBody');
    if (!tbody) return;

    if (assets.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
            Nenhum bem ou ativo adicional cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = assets.map(a => {
      let acqBadge = '<span class="badge badge-success">À Vista (Quitado)</span>';
      if (a.acquisitionType === 'installments') {
        const total = a.totalInstallments || '?';
        const paid = a.paidInstallments !== null ? a.paidInstallments : '?';
        const status = a.financingStatus === 'quitado' ? ' (Quitado)' : '';
        acqBadge = `<span class="badge badge-warning" title="Aquisição parcelada">Financiado: ${paid}/${total}x${status}</span>`;
      }

      return `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td><span class="badge badge-info">${a.category}</span></td>
          <td>${acqBadge}</td>
          <td style="color: var(--color-success); font-weight: 700;">+ ${SaldoCerto.formatCurrency(a.value)}</td>
          <td>
            <button class="btn-icon" style="width: 28px; height: 28px;" title="Excluir ativo" onclick="PatrimonioModule.handleDeleteAsset('${a.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const renderLiabilitiesTable = (liabilities) => {
    const tbody = document.getElementById('liabilitiesTableBody');
    if (!tbody) return;

    if (liabilities.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
            Nenhuma dívida ou financiamento registrado. Excelente!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = liabilities.map(l => {
      let parcelasHtml = '<span class="badge" style="background: var(--color-bg-subtle);">À vista / Sem parcelas</span>';
      let mensalidadeHtml = '—';
      let payActionBtn = '';

      if (l.isInstallment && (l.totalInstallments || l.remainingInstallments)) {
        const total = l.totalInstallments || (l.remainingInstallments || 1);
        const rem = l.remainingInstallments !== null ? l.remainingInstallments : total;
        const paid = Math.max(0, total - rem);
        const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

        parcelasHtml = `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>Faltam <strong>${rem}</strong> de ${total} meses</span>
              <span style="color: var(--color-success); font-weight: 700;">${pct}%</span>
            </div>
            <div style="background: var(--color-border); border-radius: 4px; height: 5px; width: 100%; overflow: hidden;">
              <div style="background: var(--color-success); height: 100%; width: ${pct}%;"></div>
            </div>
          </div>
        `;

        if (l.installmentAmount) {
          mensalidadeHtml = `
            <div>
              <strong style="color: var(--color-text);">${SaldoCerto.formatCurrency(l.installmentAmount)}</strong>
              ${l.dueDay ? `<div style="font-size: 10px; color: var(--color-text-muted);">Vence dia ${l.dueDay}</div>` : ''}
            </div>
          `;
        }

        if (rem > 0) {
          payActionBtn = `
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 2px 6px; white-space: nowrap;" title="Registrar quitação de 1 parcela" onclick="PatrimonioModule.handlePayOneInstallment('${l.id}')">
              Abater 1x
            </button>
          `;
        }
      }

      return `
        <tr>
          <td>
            <strong>${l.name}</strong>
            <div style="font-size: 11px; color: var(--color-text-muted);">${l.category}</div>
          </td>
          <td style="min-width: 140px;">${parcelasHtml}</td>
          <td>${mensalidadeHtml}</td>
          <td style="color: var(--color-danger); font-weight: 700;">- ${SaldoCerto.formatCurrency(l.value)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              ${payActionBtn}
              <button class="btn-icon" style="width: 28px; height: 28px;" title="Excluir dívida" onclick="PatrimonioModule.handleDeleteLiability('${l.id}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const handlePayOneInstallment = async (id) => {
    const list = SaldoCerto.getState().liabilities || [];
    const item = list.find(l => l.id === id);
    if (!item) return;

    if (!item.remainingInstallments || item.remainingInstallments <= 0) {
      SaldoCerto.showToast('Esta dívida já está totalmente quitada!', 'info');
      return;
    }

    const nextRem = item.remainingInstallments - 1;
    const instVal = item.installmentAmount || (item.value / item.remainingInstallments);
    const nextVal = Math.max(0, item.value - instVal);

    SaldoCerto.confirmAction(`Confirmar pagamento da parcela de ${SaldoCerto.formatCurrency(instVal)}? Restarão ${nextRem} parcelas a quitar.`, async () => {
      try {
        let meta = {};
        try {
          if (item.description && item.description.startsWith('{')) meta = JSON.parse(item.description);
        } catch(e) {}
        meta.remainingInstallments = nextRem;
        const newDesc = JSON.stringify(meta);

        if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
          const user = await SaldoCertoAuth.getCurrentUser();
          if (user) {
            await window.supabaseClient
              .from('liabilities')
              .update({
                remaining_amount: nextVal,
                description: newDesc,
                updated_at: new Date().toISOString()
              })
              .eq('id', id)
              .eq('user_id', user.id);
          }
        }

        item.remainingInstallments = nextRem;
        item.value = nextVal;
        item.description = newDesc;
        SaldoCerto.saveData();

        SaldoCerto.showToast(`Parcela abatida! Faltam ${nextRem} parcelas. Saldo atualizado com sucesso.`, 'success');
        await renderNetWorth();
      } catch (err) {
        console.error('Erro ao abater parcela:', err);
        SaldoCerto.showToast('Erro ao atualizar parcela no banco.', 'danger');
      }
    });
  };

  const openAddAssetModal = () => {
    document.getElementById('assetForm').reset();
    toggleAssetInstallmentFields();
    SaldoCerto.openModal('assetModal');
  };

  const openAddLiabilityModal = () => {
    document.getElementById('liabilityForm').reset();
    toggleLiabilityInstallmentFields();
    SaldoCerto.openModal('liabilityModal');
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    const name = document.getElementById('assetName').value.trim();
    const category = document.getElementById('assetCategory').value;
    const value = document.getElementById('assetValue').value;
    const acquisitionType = document.getElementById('assetAcquisitionType').value;
    const totalInstallments = document.getElementById('assetTotalInstallments')?.value;
    const paidInstallments = document.getElementById('assetPaidInstallments')?.value;
    const financingStatus = document.getElementById('assetFinancingStatus')?.value;

    if (!name || !value) {
      SaldoCerto.showToast('Informe o nome e o valor estimado do bem.', 'warning');
      return;
    }

    try {
      await createAsset({
        name,
        category,
        value,
        acquisitionType,
        totalInstallments,
        paidInstallments,
        financingStatus
      });
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
    const isInstallment = document.getElementById('liabilityIsInstallment').value;
    const totalInstallments = document.getElementById('liabilityTotalInstallments')?.value;
    const remainingInstallments = document.getElementById('liabilityRemainingInstallments')?.value;
    const installmentAmount = document.getElementById('liabilityInstallmentAmount')?.value;
    const dueDay = document.getElementById('liabilityDueDay')?.value;

    if (!name || !value) {
      SaldoCerto.showToast('Informe o nome e o saldo devedor.', 'warning');
      return;
    }

    try {
      await createLiability({
        name,
        category,
        value,
        isInstallment,
        totalInstallments,
        remainingInstallments,
        installmentAmount,
        dueDay
      });
      SaldoCerto.closeModal('liabilityModal');
      SaldoCerto.showToast(`Financiamento/Dívida "${name}" registrado com sucesso!`, 'success');
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
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta dívida/financiamento?', async () => {
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
    handleDeleteLiability,
    handlePayOneInstallment,
    toggleAssetInstallmentFields,
    toggleLiabilityInstallmentFields,
    calcDebtBalance,
    autoCalculateTotalFromInstallments
  };
})();

document.addEventListener('DOMContentLoaded', PatrimonioModule.init);
