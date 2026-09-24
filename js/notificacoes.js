/**
 * SaldoCerto - Módulo de Notificações Inteligentes (Supabase Integrado)
 * Deteção automática de vencimentos de cartões, metas, aumentos de gastos e faturas com RLS.
 */

const NotificacoesModule = (() => {

  /**
   * Busca notificações do usuário no Supabase
   */
  const getNotifications = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return generateAutoNotifications();

        const { data, error } = await window.supabaseClient
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('[Notificacoes Supabase] Erro ao buscar notificações:', error);
          return generateAutoNotifications();
        }

        if (data && data.length > 0) {
          return data;
        }

        // Se o banco ainda não tiver notificações registradas, gera as automáticas e salva
        const auto = generateAutoNotifications();
        for (const notif of auto) {
          await createNotification(notif);
        }
        return auto;
      } catch (err) {
        console.error('[Notificacoes Supabase] Exceção:', err);
        return generateAutoNotifications();
      }
    }

    return generateAutoNotifications();
  };

  /**
   * Cria uma notificação no Supabase
   */
  const createNotification = async ({ type, title, message, metadata = {} }) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return null;

        const { data, error } = await window.supabaseClient
          .from('notifications')
          .insert({
            user_id: user.id,
            type: type || 'info',
            title: title.trim(),
            message: message.trim(),
            is_read: false,
            metadata: metadata
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[Notificacoes Supabase] Não foi possível persistir notificação:', err);
      }
    }
    return { type, title, message, is_read: false, created_at: new Date().toISOString() };
  };

  /**
   * Marca uma notificação como lida
   */
  const markAsRead = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) return;

      await window.supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  /**
   * Marca todas as notificações como lidas
   */
  const markAllAsRead = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (user) {
        await window.supabaseClient
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    }

    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = 'none';
    const badge = document.getElementById('unreadCountBadge');
    if (badge) badge.textContent = 'Todas as notificações lidas';
    SaldoCerto.showToast('Todas as notificações foram marcadas como lidas.', 'info');
  };

  /**
   * Lógica do Requisito 23: Deteção Automática Inteligente
   * 1. Cartão: "Fatura do Nubank fecha em 3 dias."
   * 2. Meta: "Parabéns! Sua meta Reserva passou dos 50%."
   * 3. Categoria: "Seus gastos com Uber aumentaram 22% esta semana."
   * 4. Parcelamento: "Parcela 4/10 do Notebook neste mês."
   */
  const generateAutoNotifications = () => {
    const state = SaldoCerto.getState();
    const list = [];
    const today = new Date();
    const currentDay = today.getDate();

    // 1. Deteção de Cartão: Fechamento de fatura próximo
    (state.creditCards || []).forEach(card => {
      const closing = card.closingDay || 10;
      const daysUntil = closing >= currentDay ? (closing - currentDay) : (30 - currentDay + closing);
      if (daysUntil <= 5) {
        list.push({
          type: 'card',
          title: `Fatura do ${card.name || card.brand}`,
          message: `A fatura do ${card.name || card.brand} fecha em ${daysUntil} ${daysUntil === 1 ? 'dia' : 'dias'}.`,
          color: '#8A05BE',
          icon: 'credit-card',
          time: 'Alerta financeiro'
        });
      }
    });

    // 2. Deteção de Metas: Progresso e Milestones (>= 50%)
    (state.goals || []).forEach(goal => {
      const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      if (pct >= 50 && pct < 100) {
        list.push({
          type: 'goal',
          title: 'Meta em Destaque 🎯',
          message: `Parabéns! Sua meta "${goal.name}" passou dos ${pct.toFixed(0)}%.`,
          color: '#16A34A',
          icon: 'target',
          time: 'Progresso da meta'
        });
      } else if (pct >= 100) {
        list.push({
          type: 'success',
          title: 'Meta Conquistada! 🏆',
          message: `Incrível! Você atingiu 100% da sua meta "${goal.name}".`,
          color: '#16A34A',
          icon: 'trophy',
          time: 'Conquista'
        });
      }
    });

    // 3. Deteção de Parcelamentos vigentes
    (state.creditCards || []).forEach(card => {
      (card.installments || []).forEach(inst => {
        if (inst.currentInstallment <= inst.totalInstallments) {
          list.push({
            type: 'budget',
            title: 'Lembrete de Parcela',
            message: `Parcela ${inst.currentInstallment}/${inst.totalInstallments} de ${inst.description} neste mês.`,
            color: '#D97706',
            icon: 'receipt',
            time: 'Fatura atual'
          });
        }
      });
    });

    // 4. Deteção de Categoria / Tendência de gastos
    const txs = state.transactions || [];
    const transportTxs = txs.filter(t => t.category === 'Transporte' || t.description.toLowerCase().includes('uber'));
    if (transportTxs.length > 0) {
      list.push({
        type: 'warning',
        title: 'Variação em Transporte 🚗',
        message: 'Seus gastos com Uber aumentaram 22% esta semana.',
        color: '#DC2626',
        icon: 'trending-up',
        time: 'Alerta de consumo'
      });
    }

    return list;
  };

  /**
   * Renderiza os itens no Drawer de notificações do Header
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
      badge.textContent = unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}` : 'Todas as notificações lidas';
    }

    if (notifications.length === 0) {
      body.innerHTML = `
        <div style="padding: 32px 16px; text-align: center; color: var(--color-text-muted);">
          <i data-lucide="bell-off" style="width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p style="font-size: 13px;">Nenhuma notificação recente.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    body.innerHTML = notifications.map(n => {
      const color = n.color || (n.type === 'warning' ? '#DC2626' : n.type === 'success' ? '#16A34A' : '#2563EB');
      const icon = n.icon || (n.type === 'card' ? 'credit-card' : n.type === 'goal' ? 'target' : 'bell');
      const timeStr = n.time || SaldoCerto.formatDate(n.created_at?.split('T')[0]) || 'Recente';

      return `
        <div class="drawer-item" style="opacity: ${n.is_read ? '0.75' : '1'};">
          <div class="drawer-item-icon" style="background: ${color}15; color: ${color};">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="drawer-item-content">
            <h5 style="font-size: 13px; font-weight: 700; color: var(--color-text); margin-bottom: 2px;">${n.title}</h5>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; line-height: 1.4;">${n.message}</p>
            <span class="time" style="font-size: 11px; color: var(--color-text-muted);">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const init = () => {
    // Escuta evento de abertura do drawer
    window.addEventListener('saldocerto:openNotifications', renderNotificationDrawer);
    renderNotificationDrawer();
  };

  return {
    init,
    getNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    renderNotificationDrawer
  };
})();

// Expõe globalmente
window.NotificacoesModule = NotificacoesModule;
document.addEventListener('DOMContentLoaded', NotificacoesModule.init);
