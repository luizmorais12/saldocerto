/**
 * SaldoCerto - Módulo de Investimentos (Supabase Integrado)
 * CRUD completo, cálculo de rentabilidade em tempo real e gráficos de alocação com RLS.
 */

const InvestimentosModule = (() => {
  let invChart = null;

  /**
   * Busca a carteira de investimentos do usuário no Supabase
   */
  const getInvestments = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('investments')
          .select('*')
          .order('current_amount', { ascending: false });

        if (error) {
          console.error('[Investimentos Supabase] Erro ao buscar:', error);
          return SaldoCerto.getState().investments || [];
        }

        const mapped = (data || []).map(inv => {
          const invested = Number(inv.invested_amount || 0);
          const current = Number(inv.current_amount || 0);
          const profit = current - invested;
          const yieldPct = invested > 0 ? (profit / invested) * 100 : 0;

          return {
            id: inv.id,
            name: inv.name,
            category: inv.type,
            institution: inv.institution || 'Corretora',
            investedAmount: invested,
            currentAmount: current,
            profit: profit,
            yieldPercent: yieldPct,
            purchaseDate: inv.purchase_date,
            notes: inv.notes || ''
          };
        });

        SaldoCerto.getState().investments = mapped;
        return mapped;
      } catch (err) {
        console.error('[Investimentos Supabase] Exceção:', err);
        return SaldoCerto.getState().investments || [];
      }
    }
    return SaldoCerto.getState().investments || [];
  };

  /**
   * Cadastra novo ativo de investimento
   */
  const createInvestment = async (invData) => {
    const invested = parseFloat(invData.investedAmount) || 0;
    const current = parseFloat(invData.currentAmount) || 0;
    const profit = current - invested;
    const yieldPct = invested > 0 ? (profit / invested) * 100 : 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('investments')
        .insert({
          user_id: user.id,
          name: invData.name.trim(),
          type: invData.category || 'Outros',
          institution: invData.institution || 'Corretora',
          invested_amount: invested,
          current_amount: current,
          return_amount: profit,
          return_percentage: yieldPct,
          purchaseDate: invData.purchaseDate || new Date().toISOString().split('T')[0],
          notes: invData.notes || ''
        })
        .select()
        .single();

      if (error) {
        console.error('[Investimentos Supabase] Erro ao cadastrar:', error);
        throw error;
      }

      const created = {
        id: data.id,
        name: data.name,
        category: data.type,
        institution: data.institution,
        investedAmount: Number(data.invested_amount),
        currentAmount: Number(data.current_amount),
        profit: profit,
        yieldPercent: yieldPct
      };

      SaldoCerto.getState().investments.push(created);
      return created;
    } else {
      return SaldoCerto.addInvestment(invData);
    }
  };

  /**
   * Atualiza um investimento existente
   */
  const updateInvestment = async (id, invData) => {
    const invested = parseFloat(invData.investedAmount) || 0;
    const current = parseFloat(invData.currentAmount) || 0;
    const profit = current - invested;
    const yieldPct = invested > 0 ? (profit / invested) * 100 : 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('investments')
        .update({
          name: invData.name.trim(),
          type: invData.category,
          institution: invData.institution,
          invested_amount: invested,
          current_amount: current,
          return_amount: profit,
          return_percentage: yieldPct,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  /**
   * Exclui um investimento
   */
  const deleteInvestment = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Investimentos Supabase] Erro ao deletar:', error);
        throw error;
      }
    }

    SaldoCerto.getState().investments = (SaldoCerto.getState().investments || []).filter(i => i.id !== id);
    SaldoCerto.saveData();
  };

  /**
   * Renderização de tela, estatísticas e gráficos
   */
  const renderInvestments = async () => {
    const list = await getInvestments();

    const totalInvested = list.reduce((sum, inv) => sum + Number(inv.currentAmount || 0), 0);
    const totalPrincipal = list.reduce((sum, inv) => sum + Number(inv.investedAmount || 0), 0);
    const totalProfit = totalInvested - totalPrincipal;
    const yieldPercent = totalPrincipal > 0 ? ((totalProfit / totalPrincipal) * 100).toFixed(2) : 0;

    const statTotal = document.getElementById('statInvestedTotal');
    if (statTotal) statTotal.textContent = SaldoCerto.formatCurrency(totalInvested);
    const statPrinc = document.getElementById('statPrincipalTotal');
    if (statPrinc) statPrinc.textContent = SaldoCerto.formatCurrency(totalPrincipal);
    
    const profitEl = document.getElementById('statProfitTotal');
    if (profitEl) {
      profitEl.textContent = `${totalProfit >= 0 ? '+' : '-'} ${SaldoCerto.formatCurrency(Math.abs(totalProfit))}`;
      profitEl.style.color = totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }

    const yieldEl = document.getElementById('statYieldPercent');
    if (yieldEl) {
      yieldEl.textContent = `${yieldPercent >= 0 ? '+' : ''}${yieldPercent}%`;
      yieldEl.style.color = yieldPercent >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }

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
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="trending-up"></i></div>
              <h4 class="empty-state-title">Nenhum investimento cadastrado</h4>
              <p class="empty-state-desc">Cadastre suas aplicações financeiras de renda fixa ou renda variável no Supabase.</p>
              <button class="btn btn-primary btn-sm" onclick="InvestimentosModule.openAddInvestmentModal()">
                <i data-lucide="plus-circle"></i> Cadastrar Primeiro Investimento
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = list.map(inv => {
      const profit = Number(inv.profit || (inv.currentAmount - inv.investedAmount));
      const yieldPct = Number(inv.yieldPercent || (inv.investedAmount > 0 ? (profit / inv.investedAmount) * 100 : 0));
      const isPositive = profit >= 0;

      return `
        <tr>
          <td>
            <strong>${inv.name}</strong>
          </td>
          <td><span class="badge badge-info">${inv.category}</span></td>
          <td>${inv.institution || '—'}</td>
          <td>${SaldoCerto.formatCurrency(inv.investedAmount)}</td>
          <td><strong>${SaldoCerto.formatCurrency(inv.currentAmount)}</strong></td>
          <td>
            <div style="color: ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 700;">
              ${isPositive ? '+' : ''}${SaldoCerto.formatCurrency(profit)}
            </div>
            <span style="font-size: 11px; color: ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
              (${isPositive ? '+' : ''}${yieldPct.toFixed(2)}%)
            </span>
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
    document.getElementById('invModalTitle').innerHTML = '<i data-lucide="trending-up" class="text-primary"></i> Novo Investimento';
    SaldoCerto.openModal('investmentModal');
    if (window.lucide) window.lucide.createIcons();
  };

  const openEditInvestmentModal = (id) => {
    const list = SaldoCerto.getState().investments || [];
    const inv = list.find(i => i.id === id);
    if (!inv) return;

    document.getElementById('editInvId').value = inv.id;
    document.getElementById('invName').value = inv.name;
    document.getElementById('invCategory').value = inv.category;
    document.getElementById('invInstitution').value = inv.institution;
    const investedEl = document.getElementById('invInvestedAmount') || document.getElementById('invInvested');
    const currentEl = document.getElementById('invCurrentAmount') || document.getElementById('invCurrent');
    if (investedEl) investedEl.value = inv.investedAmount;
    if (currentEl) currentEl.value = inv.currentAmount;
    document.getElementById('invModalTitle').innerHTML = '<i data-lucide="edit-3" class="text-primary"></i> Editar Investimento';

    SaldoCerto.openModal('investmentModal');
    if (window.lucide) window.lucide.createIcons();
  };

  const handleSaveInvestment = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editInvId').value;
    const name = document.getElementById('invName').value.trim();
    const category = document.getElementById('invCategory').value;
    const institution = document.getElementById('invInstitution').value.trim();
    const investedAmount = (document.getElementById('invInvestedAmount') || document.getElementById('invInvested'))?.value || 0;
    const currentAmount = (document.getElementById('invCurrentAmount') || document.getElementById('invCurrent'))?.value || 0;

    if (!name || !currentAmount) {
      SaldoCerto.showToast('Informe o nome e o valor atual.', 'warning');
      return;
    }

    try {
      if (editId) {
        await updateInvestment(editId, { name, category, institution, investedAmount, currentAmount });
        SaldoCerto.showToast(`Investimento "${name}" atualizado!`, 'success');
      } else {
        await createInvestment({ name, category, institution, investedAmount, currentAmount });
        SaldoCerto.showToast(`Investimento "${name}" cadastrado!`, 'success');
      }

      SaldoCerto.closeModal('investmentModal');
      await renderInvestments();
    } catch (err) {
      SaldoCerto.showToast('Erro ao salvar investimento.', 'danger');
    }
  };

  const handleDelete = (id) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir este ativo da sua carteira?', async () => {
      try {
        await deleteInvestment(id);
        SaldoCerto.showToast('Investimento excluído com sucesso.', 'info');
        await renderInvestments();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir investimento.', 'danger');
      }
    });
  };

  const init = async () => {
    SaldoCerto.initShell('investimentos');
    if (window.SaldoCertoAuth) {
      const user = await SaldoCertoAuth.requireAuth();
      if (!user) return;
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    await renderInvestments();
  };

  return {
    init,
    getInvestments,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    renderInvestments,
    openAddInvestmentModal,
    openEditInvestmentModal,
    handleSaveInvestment,
    handleDelete
  };
})();

document.addEventListener('DOMContentLoaded', InvestimentosModule.init);
