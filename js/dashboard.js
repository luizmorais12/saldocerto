/**
 * SaldoCerto - Lógica do Dashboard Financeiro
 * Conectado diretamente ao Supabase PostgreSQL com RLS.
 * Inclui migrador de dados do localStorage e renderização em tempo real.
 */

const DashboardModule = (() => {
  let flowChartInstance = null;
  let categoryChartInstance = null;
  let currentFlowFilter = '30d'; // '7d', '30d', '6m', '12m'
  let currentUser = null;

  // Cache em memória dos dados da sessão atual
  let dashboardData = {
    balance: 0,
    income: 0,
    expenses: 0,
    investments: 0,
    netWorth: 0,
    transactions: [],
    recentTransactions: [],
    categoryExpenses: {}
  };

  /**
   * Verifica e executa autenticação obrigatória da sessão
   */
  const ensureAuthenticated = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        if (error || !user) {
          window.location.href = 'login.html';
          return null;
        }

        if (window.SaldoCertoAuth) {
          const sub = await SaldoCertoAuth.checkSubscription(user);
          if (!sub || !sub.active) {
            SaldoCertoAuth.showPaywallModal(user);
            return null;
          }
        }

        currentUser = user;
        return user;
      } catch (err) {
        console.error('[Dashboard] Erro ao validar sessão:', err);
        window.location.href = 'login.html';
        return null;
      }
    }
    return { id: 'local-user', email: 'demo@saldocerto.app' };
  };

  /**
   * Verifica se há dados no localStorage pendentes de migração (Seção 50)
   */
  const checkLocalStorageMigration = async () => {
    if (!currentUser || currentUser.id === 'local-user') return;

    const migrationDone = localStorage.getItem('saldocerto_migrated');
    if (migrationDone === 'true') return;

    // Verifica se existem transações ou contas locais legadas
    const localStateRaw = localStorage.getItem('saldocerto_state');
    if (!localStateRaw) return;

    try {
      const parsed = JSON.parse(localStateRaw);
      const hasLocalData = (parsed.transactions && parsed.transactions.length > 0) ||
                           (parsed.accounts && parsed.accounts.length > 0) ||
                           (parsed.goals && parsed.goals.length > 0);

      if (hasLocalData) {
        showMigrationModal(parsed);
      }
    } catch (e) {
      console.warn('[Migration] Erro ao analisar localStorage:', e);
    }
  };

  /**
   * Exibe o modal de confirmação de migração
   */
  const showMigrationModal = (localData) => {
    if (document.getElementById('scMigrationModal')) return;

    const txCount = localData.transactions ? localData.transactions.length : 0;
    const accCount = localData.accounts ? localData.accounts.length : 0;

    const modalHtml = `
      <div id="scMigrationModal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div class="modal-dialog" style="max-width: 480px; width: 90%; background: var(--color-card, #FFF); border-radius: var(--radius-xl, 16px); padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid var(--color-border);">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary-light, #DCFCE7); color: var(--color-primary, #16A34A); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <i data-lucide="cloud-upload" style="width: 28px; height: 28px;"></i>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px; color: var(--color-text);">Encontramos dados salvos neste dispositivo</h3>
            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.5;">
              Identificamos <strong>${txCount} transações</strong> e <strong>${accCount} contas</strong> salvas localmente no seu navegador. Deseja sincronizá-las agora na sua conta segura do Supabase?
            </p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="btnConfirmMigration" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-weight: 600;">
              <i data-lucide="check-circle"></i> Sim, importar para minha conta
            </button>
            <button id="btnDismissMigration" class="btn btn-secondary" style="width: 100%; justify-content: center; padding: 10px; font-size: 13px;">
              Lembrar mais tarde
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('btnConfirmMigration').addEventListener('click', async () => {
      await executeMigration(localData);
    });

    document.getElementById('btnDismissMigration').addEventListener('click', () => {
      const modal = document.getElementById('scMigrationModal');
      if (modal) modal.remove();
    });
  };

  /**
   * Executa a importação segura para o Supabase
   */
  const executeMigration = async (localData) => {
    const btn = document.getElementById('btnConfirmMigration');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Importando dados...`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const userId = currentUser.id;

      // 1. Migrar contas
      const accountMap = {};
      if (localData.accounts && localData.accounts.length > 0) {
        for (const acc of localData.accounts) {
          const { data, error } = await window.supabaseClient
            .from('accounts')
            .insert({
              user_id: userId,
              name: acc.name,
              type: acc.type || 'checking',
              bank_name: acc.bank_name || acc.name,
              initial_balance: Number(acc.balance || 0),
              current_balance: Number(acc.balance || 0),
              color: acc.color || '#16A34A'
            })
            .select()
            .single();

          if (!error && data) {
            accountMap[acc.id] = data.id;
            accountMap[acc.name] = data.id;
          }
        }
      }

      // 2. Migrar transações
      if (localData.transactions && localData.transactions.length > 0) {
        const txInserts = localData.transactions.map(tx => ({
          user_id: userId,
          account_id: accountMap[tx.accountId] || accountMap[tx.account] || null,
          type: tx.type === 'income' ? 'income' : 'expense',
          description: tx.description,
          amount: Number(tx.amount || 0),
          category: tx.category || 'Outros',
          payment_method: tx.paymentMethod || 'PIX',
          transaction_date: tx.date || new Date().toISOString().split('T')[0],
          notes: tx.notes || '',
          is_recurring: tx.recurrence && tx.recurrence !== 'Única'
        }));

        await window.supabaseClient.from('transactions').insert(txInserts);
      }

      // 3. Migrar metas
      if (localData.goals && localData.goals.length > 0) {
        const goalInserts = localData.goals.map(g => ({
          user_id: userId,
          name: g.name,
          description: g.description || '',
          target_amount: Number(g.targetAmount || 0),
          current_amount: Number(g.currentAmount || 0),
          deadline: g.deadline || null,
          color: g.color || '#16A34A',
          icon: g.icon || 'target'
        }));

        await window.supabaseClient.from('goals').insert(goalInserts);
      }

      // Marca migração como concluída com sucesso (sem apagar localStorage)
      localStorage.setItem('saldocerto_migrated', 'true');

      SaldoCerto.showToast('Dados sincronizados com o Supabase com sucesso!', 'success');
      const modal = document.getElementById('scMigrationModal');
      if (modal) modal.remove();

      // Recarrega o dashboard com os novos dados
      await loadDashboard();
    } catch (err) {
      console.error('[Migration] Falha na migração:', err);
      SaldoCerto.showToast('Erro ao importar dados. Tente novamente mais tarde.', 'danger');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Tentar novamente`;
      }
    }
  };

  /**
   * Consulta dados reais consolidados do Supabase (Seções 25 e 49)
   */
  const loadDashboard = async () => {
    const user = await ensureAuthenticated();
    if (!user) return;

    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const userId = user.id;

        // 1. Contas e Saldo Disponível
        const { data: accountsData } = await window.supabaseClient
          .from('accounts')
          .select('id, name, type, bank_name, current_balance, initial_balance, color')
          .eq('user_id', userId);

        let totalBalance = 0;
        if (accountsData && accountsData.length > 0) {
          totalBalance = accountsData.reduce((acc, a) => acc + Number(a.current_balance !== null ? a.current_balance : a.initial_balance || 0), 0);
          // Sincroniza estado de contas no SaldoCerto
          SaldoCerto.getState().accounts = accountsData.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            bank_name: a.bank_name,
            balance: Number(a.current_balance !== null ? a.current_balance : a.initial_balance || 0),
            color: a.color,
            icon: 'landmark'
          }));
        }

        // 2. Investimentos
        const { data: invData } = await window.supabaseClient
          .from('investments')
          .select('current_amount')
          .eq('user_id', userId);

        let totalInvestments = 0;
        if (invData && invData.length > 0) {
          totalInvestments = invData.reduce((acc, i) => acc + Number(i.current_amount || 0), 0);
        }

        // 3. Transações do Mês e Histórico Recente
        const now = new Date();
        const selectedMonth = SaldoCerto.getSelectedMonth ? SaldoCerto.getSelectedMonth() : now.getMonth();
        const selectedYear = SaldoCerto.getSelectedYear ? SaldoCerto.getSelectedYear() : now.getFullYear();

        const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const nextMonth = selectedMonth === 11 ? 1 : selectedMonth + 2;
        const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        // Busca transações recentes
        const { data: txsData, error: txError } = await window.supabaseClient
          .from('transactions')
          .select(`
            *,
            account:accounts(name, color)
          `)
          .eq('user_id', userId)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryMap = {};
        const allTransactions = txsData || [];

        // Filtra pelo mês selecionado para métricas de fluxo
        allTransactions.forEach(t => {
          const tDate = t.transaction_date || t.date;
          if (tDate >= startDate && tDate < endDate) {
            const amt = Number(t.amount || 0);
            if (t.type === 'income') {
              totalIncome += amt;
            } else if (t.type === 'expense') {
              totalExpenses += amt;
              const cat = (t.category || 'Outros').split('(')[0].trim();
              categoryMap[cat] = (categoryMap[cat] || 0) + amt;
            }
          }
        });

        // 4. Patrimônio Líquido (Ativos + Contas + Investimentos - Passivos)
        const { data: assetsData } = await window.supabaseClient
          .from('assets')
          .select('value')
          .eq('user_id', userId);

        const { data: liabilitiesData } = await window.supabaseClient
          .from('liabilities')
          .select('remaining_amount')
          .eq('user_id', userId);

        const assetsVal = (assetsData || []).reduce((acc, a) => acc + Number(a.value || 0), 0);
        const liabVal = (liabilitiesData || []).reduce((acc, l) => acc + Number(l.remaining_amount || 0), 0);
        const netWorth = assetsVal + totalBalance + totalInvestments - liabVal;

        // Se totalBalance for 0 mas houver receitas e despesas registradas, calcula saldo pelo fluxo
        if (totalBalance === 0 && (totalIncome > 0 || totalExpenses > 0)) {
          totalBalance = totalIncome - totalExpenses;
        }

        dashboardData = {
          balance: totalBalance,
          income: totalIncome,
          expenses: totalExpenses,
          investments: totalInvestments,
          netWorth: netWorth,
          transactions: allTransactions,
          recentTransactions: allTransactions.slice(0, 8),
          categoryExpenses: categoryMap
        };

        // Salva transações no estado local para reaproveitamento nos filtros
        SaldoCerto.getState().transactions = allTransactions.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount || 0),
          category: t.category,
          account: t.account?.name || 'Principal',
          date: t.transaction_date || t.date,
          paymentMethod: t.payment_method || t.paymentMethod || 'PIX',
          recurrence: t.recurrence_type || (t.is_recurring ? 'Mensal' : 'Única'),
          notes: t.notes || ''
        }));

      } catch (err) {
        console.error('[Dashboard] Erro ao consultar Supabase:', err);
      }
    } else {
      // Fallback local se Supabase não estiver configurado
      dashboardData = {
        balance: SaldoCerto.calculateBalance(),
        income: SaldoCerto.calculateIncome(),
        expenses: SaldoCerto.calculateExpenses(),
        investments: SaldoCerto.calculateInvestments(),
        netWorth: SaldoCerto.calculateNetWorth(),
        transactions: SaldoCerto.getState().transactions,
        recentTransactions: SaldoCerto.getState().transactions.slice(0, 6),
        categoryExpenses: {}
      };
    }

    renderMetrics();
    renderRecentTransactions();
    initFlowChart();
    initCategoryChart();
  };

  /**
   * Renderiza as 4 métricas principais calculadas dinamicamente
   */
  const renderMetrics = () => {
    const balanceEl = document.getElementById('metricBalance');
    const incomeEl = document.getElementById('metricIncome');
    const expenseEl = document.getElementById('metricExpenses');
    const investmentEl = document.getElementById('metricInvestments');

    if (balanceEl) balanceEl.textContent = SaldoCerto.formatCurrency(dashboardData.balance);
    if (incomeEl) incomeEl.textContent = SaldoCerto.formatCurrency(dashboardData.income);
    if (expenseEl) expenseEl.textContent = SaldoCerto.formatCurrency(dashboardData.expenses);
    if (investmentEl) investmentEl.textContent = SaldoCerto.formatCurrency(dashboardData.investments);

    // Indicador dinâmico de taxa de economia mensal
    const trendEl = document.getElementById('metricBalanceTrend');
    if (trendEl) {
      const netSavings = dashboardData.income - dashboardData.expenses;
      const rate = dashboardData.income > 0 ? ((netSavings / dashboardData.income) * 100).toFixed(1) : 0;
      trendEl.textContent = `${rate >= 0 ? '+' : ''}${rate}% este mês`;
      trendEl.className = `metric-trend ${rate >= 0 ? 'positive' : 'negative'}`;
    }
  };

  /**
   * Renderiza lista de transações recentes (Seção 54 Empty States)
   */
  const renderRecentTransactions = () => {
    const listEl = document.getElementById('recentTransactionsList');
    if (!listEl) return;

    const txs = dashboardData.recentTransactions;

    if (!txs || txs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: 36px 16px; text-align: center;">
          <div class="empty-state-icon" style="margin-bottom: 12px; color: var(--color-text-muted);"><i data-lucide="receipt" style="width: 36px; height: 36px;"></i></div>
          <h4 class="empty-state-title" style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">Nenhuma transação encontrada.</h4>
          <p class="empty-state-desc" style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 16px;">Comece adicionando sua primeira movimentação financeira.</p>
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
      const iconBg = isIncome ? 'var(--color-primary-light, #DCFCE7)' : 'var(--color-danger-light, #FEE2E2)';
      const iconColor = isIncome ? 'var(--color-primary, #16A34A)' : 'var(--color-danger, #DC2626)';

      const accName = tx.account?.name || (typeof tx.account === 'string' ? tx.account : 'Principal');
      const dateStr = tx.transaction_date || tx.date;

      const instInfo = SaldoCerto.getInstallmentInfo ? SaldoCerto.getInstallmentInfo(tx) : { isInstallment: false };
      let underAmountHtml = '';
      if (instInfo.isInstallment) {
        underAmountHtml = `
          <div class="tx-installment-subtext" style="font-size: 10px; font-weight: 600; color: ${isIncome ? '#16A34A' : '#D97706'}; text-align: right; margin-top: 2px;">
            💳 ${instInfo.summaryText} (Total ${instInfo.totalText})
          </div>
        `;
      }

      const installmentBadge = instInfo.isInstallment 
        ? `<span class="badge badge-warning" style="font-size: 10px; font-weight: 700; padding: 1px 5px; margin-left: 6px;">${instInfo.badgeText}</span>` 
        : '';

      const cleanCategory = (tx.category || 'Geral').split('(')[0].trim();

      return `
        <div class="transaction-item">
          <div class="tx-left">
            <div class="tx-icon" style="background-color: ${iconBg}; color: ${iconColor};">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="tx-info">
              <span class="tx-title" style="display: flex; align-items: center; flex-wrap: wrap;">
                <span>${tx.description}</span>
                ${installmentBadge}
              </span>
              <span class="tx-meta">
                <span>${cleanCategory}</span> • 
                <span>${SaldoCerto.formatDate(dateStr)}</span> • 
                <span class="badge badge-info" style="font-size: 11px;">${accName}</span>
              </span>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${amountClass}">${sign} ${SaldoCerto.formatCurrency(tx.amount)}</span>
            ${underAmountHtml}
            <span class="tx-account-badge">${tx.payment_method || tx.paymentMethod || 'PIX'}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  /**
   * Gráfico de Fluxo Financeiro (Chart.js) baseado nos dados reais
   */
  const initFlowChart = () => {
    const canvas = document.getElementById('flowChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (flowChartInstance) {
      flowChartInstance.destroy();
    }

    let labels = [];
    let incomesData = [];
    let expensesData = [];

    const txs = dashboardData.transactions;

    if (currentFlowFilter === '7d') {
      labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      incomesData = [0, 0, 0, 0, 0, 0, 0];
      expensesData = [0, 0, 0, 0, 0, 0, 0];

      // Agrupa os últimos 7 dias
      const today = new Date();
      txs.forEach(t => {
        const d = new Date(t.transaction_date || t.date);
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const dayIndex = (d.getDay() + 6) % 7; // Seg = 0
          if (t.type === 'income') incomesData[dayIndex] += Number(t.amount || 0);
          else expensesData[dayIndex] += Number(t.amount || 0);
        }
      });
    } else if (currentFlowFilter === '30d') {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      incomesData = [0, 0, 0, 0];
      expensesData = [0, 0, 0, 0];

      txs.forEach(t => {
        const d = new Date(t.transaction_date || t.date);
        const day = d.getDate();
        const week = Math.min(3, Math.floor((day - 1) / 7));
        if (t.type === 'income') incomesData[week] += Number(t.amount || 0);
        else expensesData[week] += Number(t.amount || 0);
      });

      // Se não houver dados ainda no mês, usa os totais consolidados
      if (incomesData.every(v => v === 0) && dashboardData.income > 0) {
        incomesData = [dashboardData.income, 0, 0, 0];
      }
      if (expensesData.every(v => v === 0) && dashboardData.expenses > 0) {
        expensesData = [dashboardData.expenses, 0, 0, 0];
      }
    } else if (currentFlowFilter === '6m') {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const now = new Date();
      labels = [];
      incomesData = [];
      expensesData = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);
        incomesData.push(0);
        expensesData.push(0);
      }

      txs.forEach(t => {
        const d = new Date(t.transaction_date || t.date);
        const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
          const idx = 5 - monthDiff;
          if (t.type === 'income') incomesData[idx] += Number(t.amount || 0);
          else expensesData[idx] += Number(t.amount || 0);
        }
      });
    } else {
      // 12m
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const now = new Date();
      labels = [];
      incomesData = [];
      expensesData = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);
        incomesData.push(0);
        expensesData.push(0);
      }

      txs.forEach(t => {
        const d = new Date(t.transaction_date || t.date);
        const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
          const idx = 11 - monthDiff;
          if (t.type === 'income') incomesData[idx] += Number(t.amount || 0);
          else expensesData[idx] += Number(t.amount || 0);
        }
      });
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

    const categoryTotals = dashboardData.categoryExpenses || {};
    let catLabels = Object.keys(categoryTotals);
    let catValues = Object.values(categoryTotals);

    // Se estiver sem dados no mês, exibe mensagem vazia ou placeholder discreto
    if (catLabels.length === 0 || catValues.every(v => v === 0)) {
      catLabels = ['Sem despesas no mês'];
      catValues = [1];
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
          backgroundColor: catLabels[0] === 'Sem despesas no mês' ? ['#CBD5E1'] : catColors.slice(0, catLabels.length),
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
              label: (context) => {
                if (context.label === 'Sem despesas no mês') return ' Nenhuma despesa registrada';
                return ` ${context.label}: ${SaldoCerto.formatCurrency(context.raw)}`;
              }
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

  const init = async () => {
    SaldoCerto.initShell('dashboard');

    // Valida autenticação e assinatura ativa (Paywall)
    if (window.SaldoCertoAuth) {
      const user = await SaldoCertoAuth.requireAuth();
      if (!user) return;
    }

    setupChartFilters();

    // Carrega dados diretamente do Supabase
    await loadDashboard();

    // Checa migração de dados do localStorage para o Supabase
    await checkLocalStorageMigration();

    // Eventos globais de atualização
    window.addEventListener('saldocerto:monthChanged', loadDashboard);
    window.addEventListener('saldocerto:transactionSaved', loadDashboard);
    window.addEventListener('saldocerto:themeChanged', () => {
      initFlowChart();
      initCategoryChart();
    });
  };

  return {
    init,
    loadDashboard,
    checkLocalStorageMigration
  };
})();

document.addEventListener('DOMContentLoaded', DashboardModule.init);
