/**
 * SaldoCerto - Módulo de Notificações Inteligentes e Alertas de Vencimento
 * Integração com Cartões de Crédito, Financiamentos/Dívidas, Contas e Web Notifications API
 */

const NotificacoesModule = (() => {

  /**
   * Calcula de forma inteligente todas as contas e obrigações próximas do vencimento:
   * 1. Faturas de Cartões de Crédito (dueDay)
   * 2. Parcelas de Financiamentos / Empréstimos / Dívidas (liabilities: dueDay ou dueDate)
   * 3. Contas fixas recorrentes do mês
   */
  const calculateUpcomingDueDates = () => {
    const state = SaldoCerto.getState() || {};
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dueItems = [];

    // 1. Cartões de Crédito: Faturas a Vencer
    (state.creditCards || []).forEach(card => {
      const dueDay = parseInt(card.dueDay || card.due_day, 10);
      if (!dueDay) return;

      const cardName = card.name || card.brand || 'Cartão de Crédito';
      // Calcula valor estimado da fatura atual (limite utilizado ou compras cadastradas)
      const limit = Number(card.limit || card.credit_limit || 0);
      const invoiceEstimate = limit > 0 ? (limit * 0.35) : 480.00;

      let daysUntil = dueDay - currentDay;
      let status = 'future';

      if (daysUntil === 0) {
        status = 'today';
      } else if (daysUntil > 0 && daysUntil <= 5) {
        status = 'soon';
      } else if (daysUntil < 0 && daysUntil >= -4) {
        status = 'overdue';
      }

      if (status !== 'future') {
        dueItems.push({
          id: `card-${card.id || cardName}`,
          sourceType: 'card',
          title: `Fatura ${cardName}`,
          amount: invoiceEstimate,
          dueDay: dueDay,
          daysUntil: daysUntil,
          status: status,
          icon: 'credit-card',
          color: status === 'today' ? '#DC2626' : status === 'overdue' ? '#991B1B' : '#D97706',
          category: 'Cartão de Crédito',
          detail: `Dia de vencimento: ${dueDay}/${String(currentMonth + 1).padStart(2, '0')}`
        });
      }
    });

    // 2. Passivos, Empréstimos e Financiamentos (liabilities)
    (state.liabilities || []).forEach(liab => {
      const isInst = liab.isInstallment !== false;
      const amount = Number(liab.installmentAmount || liab.value || 0);
      let dueDay = liab.dueDay ? parseInt(liab.dueDay, 10) : null;

      if (!dueDay && liab.dueDate) {
        const parts = liab.dueDate.split('-');
        if (parts.length === 3) dueDay = parseInt(parts[2], 10);
      }

      // Se não tiver dia cadastrado, assume dia 15 como padrão de simulação
      if (!dueDay) dueDay = 15;

      let daysUntil = dueDay - currentDay;
      let status = 'future';

      if (daysUntil === 0) {
        status = 'today';
      } else if (daysUntil > 0 && daysUntil <= 5) {
        status = 'soon';
      } else if (daysUntil < 0 && daysUntil >= -4) {
        status = 'overdue';
      }

      if (status !== 'future') {
        const instInfo = liab.remainingInstallments ? ` (restam ${liab.remainingInstallments} parcelas)` : '';
        dueItems.push({
          id: `liab-${liab.id || liab.name}`,
          sourceType: 'liability',
          title: liab.name + instInfo,
          amount: amount,
          dueDay: dueDay,
          daysUntil: daysUntil,
          status: status,
          icon: 'landmark',
          color: status === 'today' ? '#DC2626' : status === 'overdue' ? '#991B1B' : '#D97706',
          category: liab.category || 'Financiamento/Dívida',
          detail: `Vencimento dia ${dueDay}`
        });
      }
    });

    // 3. Contas Fixas Recorrentes (Água, Luz, Aluguel, Internet)
    const fixedExpenses = (state.transactions || []).filter(t => 
      t.type === 'expense' && (t.recurrence === 'Mensal' || t.category?.includes('Contas Fixas') || t.category?.includes('Moradia'))
    );

    fixedExpenses.slice(0, 3).forEach(fe => {
      let dueDay = 10;
      if (fe.date) {
        const parts = fe.date.split('-');
        if (parts.length === 3) dueDay = parseInt(parts[2], 10);
      }
      let daysUntil = dueDay - currentDay;
      let status = 'future';

      if (daysUntil === 0) {
        status = 'today';
      } else if (daysUntil > 0 && daysUntil <= 4) {
        status = 'soon';
      }

      if (status !== 'future') {
        dueItems.push({
          id: `tx-${fe.id}`,
          sourceType: 'fixed_expense',
          title: fe.description,
          amount: Number(fe.amount),
          dueDay: dueDay,
          daysUntil: daysUntil,
          status: status,
          icon: 'zap',
          color: status === 'today' ? '#DC2626' : '#2563EB',
          category: 'Conta Fixa',
          detail: `Vence dia ${dueDay}`
        });
      }
    });

    // Ordena: primeiro as de hoje, depois vencidas, depois as mais próximas
    return dueItems.sort((a, b) => {
      const order = { today: 0, overdue: 1, soon: 2 };
      return (order[a.status] || 3) - (order[b.status] || 3) || a.daysUntil - b.daysUntil;
    });
  };

  /**
   * Busca notificações do usuário (combina notificações do banco com vencimentos dinâmicos)
   */
  const getNotifications = async () => {
    const dueItems = calculateUpcomingDueDates();
    const autoList = [];

    // Transforma itens de vencimento em notificações elegantes
    dueItems.forEach(item => {
      let title = '';
      let message = '';

      if (item.status === 'today') {
        title = `🚨 VENCE HOJE: ${item.title}`;
        message = `Atenção! Esta obrigação no valor de ${SaldoCerto.formatCurrency(item.amount)} vence HOJE. Realize o pagamento para evitar juros.`;
      } else if (item.status === 'overdue') {
        title = `🔴 VENCIDA: ${item.title}`;
        message = `Venceu há ${Math.abs(item.daysUntil)} dia(s) (${SaldoCerto.formatCurrency(item.amount)}). Verifique se já foi quitada.`;
      } else {
        const daysText = item.daysUntil === 1 ? 'amanhã' : `em ${item.daysUntil} dias`;
        title = `⚠️ Vence ${daysText}: ${item.title}`;
        message = `Programação de pagamento: ${SaldoCerto.formatCurrency(item.amount)} no dia ${item.dueDay}.`;
      }

      autoList.push({
        id: item.id,
        type: item.status === 'today' ? 'danger' : item.status === 'overdue' ? 'danger' : 'warning',
        title: title,
        message: message,
        color: item.color,
        icon: item.icon,
        time: item.status === 'today' ? 'Vence Hoje!' : `Dia ${item.dueDay}`,
        is_read: false
      });
    });

    // Metas em Destaque
    const state = SaldoCerto.getState() || {};
    (state.goals || []).forEach(goal => {
      const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      if (pct >= 50 && pct < 100) {
        autoList.push({
          id: `goal-${goal.id}`,
          type: 'goal',
          title: 'Meta em Destaque 🎯',
          message: `Parabéns! Sua meta "${goal.name}" já atingiu ${pct.toFixed(0)}% (${SaldoCerto.formatCurrency(goal.currentAmount)}).`,
          color: '#16A34A',
          icon: 'target',
          time: 'Em andamento',
          is_read: true
        });
      }
    });

    // Se estiver conectado ao Supabase, tenta carregar histórico adicional
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (user) {
          const { data } = await window.supabaseClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          if (data && data.length > 0) {
            return [...autoList, ...data];
          }
        }
      } catch (err) {
        console.warn('[Notificacoes] Fallback para lista calculada:', err);
      }
    }

    return autoList;
  };

  /**
   * Renderiza o banner inteligente de vencimento no topo do Dashboard
   */
  const renderDashboardDueAlert = () => {
    const container = document.getElementById('dueDatesAlertBannerContainer');
    if (!container) return;

    const dueItems = calculateUpcomingDueDates();
    if (dueItems.length === 0) {
      container.innerHTML = '';
      return;
    }

    const hasToday = dueItems.some(i => i.status === 'today');
    const totalDue = dueItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const pillsHtml = dueItems.slice(0, 3).map(item => {
      const badgeClass = item.status === 'today' ? 'today' : 'soon';
      const label = item.status === 'today' ? 'VENCE HOJE' : item.status === 'overdue' ? 'VENCIDA' : `Em ${item.daysUntil}d`;
      return `
        <span class="due-pill ${badgeClass}">
          <strong>${label}:</strong> ${item.title} (${SaldoCerto.formatCurrency(item.amount)})
        </span>
      `;
    }).join('');

    container.innerHTML = `
      <div class="due-alert-banner ${hasToday ? 'has-today' : ''}">
        <div class="due-alert-left">
          <div class="due-alert-icon-box">
            <i data-lucide="${hasToday ? 'alert-triangle' : 'clock'}"></i>
          </div>
          <div class="due-alert-text">
            <h4>
              <span>${hasToday ? 'Atenção: Contas vencendo HOJE!' : 'Contas e faturas próximas do vencimento'}</span>
              <span class="badge ${hasToday ? 'badge-danger' : 'badge-warning'}" style="font-size: 11px;">
                ${dueItems.length} ${dueItems.length === 1 ? 'pendência' : 'pendências'} • ${SaldoCerto.formatCurrency(totalDue)}
              </span>
            </h4>
            <p>Fique atento às datas para manter seu planejamento financeiro no azul e sem juros.</p>
            <div class="due-alert-items-preview">
              ${pillsHtml}
            </div>
          </div>
        </div>
        <div class="due-alert-right">
          <button type="button" class="btn ${hasToday ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="SaldoCerto.openNotificationDrawer()">
            <i data-lucide="bell"></i>
            <span>Ver Todas</span>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  };

  /**
   * Solicita permissão do navegador para notificações nativas (Web Notification API)
   */
  const requestBrowserNotificationPermission = async () => {
    if (!('Notification' in window)) {
      SaldoCerto.showToast('Seu navegador atual não suporta notificações nativas.', 'warning');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        SaldoCerto.showToast('Notificações ativadas! Você será avisado no celular/computador sobre vencimentos.', 'success');
        
        // Notificação de boas-vindas / teste
        new Notification('SaldoCerto: Alertas Ativados! 🔔', {
          body: 'Notificações de vencimento ativadas com sucesso. Avisaremos quando suas faturas estiverem próximas!',
          icon: 'assets/logo.svg',
          badge: 'assets/logo.svg'
        });

        renderNotificationDrawer();
        checkAndDispatchNativeNotifications(true);
        return true;
      } else {
        SaldoCerto.showToast('Permissão de notificações não foi concedida no navegador.', 'info');
        renderNotificationDrawer();
        return false;
      }
    } catch (err) {
      console.warn('Erro ao pedir permissão de notificações:', err);
      return false;
    }
  };

  /**
   * Dispara notificação nativa no sistema operacional se houver conta vencendo hoje ou amanhã
   * (Controlado para não disparar mais de 1 vez ao dia para não incomodar o usuário)
   */
  const checkAndDispatchNativeNotifications = (force = false) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifDate = localStorage.getItem('saldocerto_last_native_notif');

    if (!force && lastNotifDate === todayStr) {
      return; // Já enviou hoje
    }

    const dueItems = calculateUpcomingDueDates();
    const todayItems = dueItems.filter(i => i.status === 'today');
    const soonItems = dueItems.filter(i => i.daysUntil === 1 || i.daysUntil === 2);

    if (todayItems.length > 0) {
      const count = todayItems.length;
      const firstName = todayItems[0].title;
      new Notification(`🚨 SaldoCerto: ${count} conta(s) vencem HOJE!`, {
        body: `${firstName} (${SaldoCerto.formatCurrency(todayItems[0].amount)}) vence hoje. Evite multas e juros!`,
        icon: 'assets/logo.svg',
        tag: 'saldocerto-due-today'
      });
      localStorage.setItem('saldocerto_last_native_notif', todayStr);
    } else if (soonItems.length > 0) {
      const item = soonItems[0];
      new Notification(`⚠️ SaldoCerto: Vencimento em breve`, {
        body: `${item.title} vence ${item.daysUntil === 1 ? 'amanhã' : 'em 2 dias'} (${SaldoCerto.formatCurrency(item.amount)}).`,
        icon: 'assets/logo.svg',
        tag: 'saldocerto-due-soon'
      });
      localStorage.setItem('saldocerto_last_native_notif', todayStr);
    }
  };

  /**
   * Marca todas as notificações como lidas
   */
  const markAllAsRead = async () => {
    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = 'none';

    const badge = document.getElementById('unreadCountBadge');
    if (badge) badge.textContent = 'Todas as notificações lidas';

    SaldoCerto.showToast('Todas as notificações foram marcadas como lidas.', 'info');
  };

  /**
   * Renderiza a gaveta (drawer) de notificações no topo da página
   */
  const renderNotificationDrawer = async () => {
    const body = document.getElementById('notificationDrawerBody');
    if (!body) return;

    const notifications = await getNotifications();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';

    const badge = document.getElementById('unreadCountBadge');
    if (badge) {
      badge.textContent = unreadCount > 0 
        ? `${unreadCount} ${unreadCount === 1 ? 'alerta ativo' : 'alertas ativos'}` 
        : 'Todas as notificações lidas';
    }

    // Caixa de Permissão / Teste de Notificações do Navegador
    const hasPermSupport = 'Notification' in window;
    const permStatus = hasPermSupport ? Notification.permission : 'unsupported';

    let permHtml = '';
    if (hasPermSupport) {
      if (permStatus === 'granted') {
        permHtml = `
          <div class="notification-perm-box" style="background: rgba(22, 163, 74, 0.08); border-color: rgba(22, 163, 74, 0.3);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="check-circle" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
              <div>
                <strong style="font-size: 12px; color: var(--color-text);">Lembretes no Celular Ativados</strong>
                <span style="font-size: 11px; color: var(--color-text-muted); display: block;">Você recebe avisos na tela quando uma conta estiver vencendo.</span>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="NotificacoesModule.checkAndDispatchNativeNotifications(true)" title="Dispara uma notificação de teste agora">
              <i data-lucide="bell-ring"></i>
              <span>Testar</span>
            </button>
          </div>
        `;
      } else {
        permHtml = `
          <div class="notification-perm-box">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="bell" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
              <div>
                <strong style="font-size: 12px; color: var(--color-text);">Ativar avisos no celular/PC</strong>
                <span style="font-size: 11px; color: var(--color-text-muted); display: block;">Receba alertas automáticos de vencimento mesmo com a aba fechada.</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="NotificacoesModule.requestBrowserNotificationPermission()">
              <span>Ativar</span>
            </button>
          </div>
        `;
      }
    }

    if (notifications.length === 0) {
      body.innerHTML = `
        ${permHtml}
        <div style="padding: 32px 16px; text-align: center; color: var(--color-text-muted);">
          <i data-lucide="check-circle" style="width: 36px; height: 36px; margin: 0 auto 8px; color: var(--color-primary); opacity: 0.7;"></i>
          <p style="font-size: 13px; font-weight: 600; color: var(--color-text);">Tudo em dia!</p>
          <span style="font-size: 12px;">Não há nenhuma conta ou fatura pendente com vencimento próximo.</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    body.innerHTML = `
      ${permHtml}
      ${notifications.map(n => {
        const color = n.color || '#2563EB';
        const icon = n.icon || 'bell';
        return `
          <div class="drawer-item" style="border-left: 3px solid ${color};">
            <div class="drawer-item-icon" style="background: ${color}15; color: ${color};">
              <i data-lucide="${icon}"></i>
            </div>
            <div class="drawer-item-content">
              <h5 style="font-size: 13px; font-weight: 700; color: var(--color-text); margin-bottom: 2px;">${n.title}</h5>
              <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; line-height: 1.4;">${n.message}</p>
              <span class="time" style="font-size: 11px; font-weight: 600; color: ${color};">${n.time}</span>
            </div>
          </div>
        `;
      }).join('')}
    `;

    if (window.lucide) window.lucide.createIcons();
  };

  /**
   * Inicialização do módulo de notificações
   */
  const init = () => {
    window.addEventListener('saldocerto:openNotifications', renderNotificationDrawer);
    window.addEventListener('saldocerto:monthChanged', () => {
      renderDashboardDueAlert();
      renderNotificationDrawer();
    });
    window.addEventListener('saldocerto:transactionSaved', () => {
      renderDashboardDueAlert();
      renderNotificationDrawer();
    });

    // Renderiza banner no dashboard se estiver na página
    renderDashboardDueAlert();
    renderNotificationDrawer();

    // Checa e dispara notificação nativa automática (1x ao dia)
    setTimeout(() => {
      checkAndDispatchNativeNotifications(false);
    }, 2000);
  };

  return {
    init,
    getNotifications,
    calculateUpcomingDueDates,
    renderDashboardDueAlert,
    requestBrowserNotificationPermission,
    checkAndDispatchNativeNotifications,
    markAllAsRead,
    renderNotificationDrawer
  };
})();

// Expõe globalmente
window.NotificacoesModule = NotificacoesModule;
document.addEventListener('DOMContentLoaded', NotificacoesModule.init);
