/**
 * SaldoCerto - Módulo de Cartões de Crédito e Compras Parceladas (Supabase Integrado)
 * CRUD completo com persistência no PostgreSQL e RLS.
 */

const CartoesModule = (() => {

  /**
   * Busca todos os cartões de crédito do usuário logado
   */
  const getCreditCards = async () => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient
          .from('credit_cards')
          .select(`
            *,
            purchases:credit_card_purchases(*)
          `)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Cartoes Supabase] Erro ao buscar cartões:', error);
          return SaldoCerto.getState().creditCards || [];
        }

        const mapped = (data || []).map(c => ({
          id: c.id,
          name: c.name,
          brand: c.bank_name || c.name,
          lastFour: c.last_four_digits,
          limit: Number(c.credit_limit || 0),
          closingDay: c.closing_day,
          dueDay: c.due_day,
          color: c.color || '#8A05BE',
          installments: (c.purchases || []).map(p => ({
            id: p.id,
            description: p.description,
            totalAmount: Number(p.total_amount),
            monthlyAmount: Number(p.installment_amount),
            totalInstallments: p.total_installments,
            currentInstallment: p.current_installment,
            category: p.category,
            purchaseDate: p.purchase_date,
            firstDueDate: p.first_due_date
          }))
        }));

        SaldoCerto.getState().creditCards = mapped;
        return mapped;
      } catch (err) {
        console.error('[Cartoes Supabase] Exceção em getCreditCards:', err);
        return SaldoCerto.getState().creditCards || [];
      }
    }
    return SaldoCerto.getState().creditCards || [];
  };

  /**
   * Cria um novo cartão de crédito
   */
  const createCreditCard = async (cardData) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('credit_cards')
        .insert({
          user_id: user.id,
          name: cardData.name.trim(),
          bank_name: (cardData.brand || cardData.name).trim(),
          last_four_digits: cardData.lastFour || '0000',
          credit_limit: parseFloat(cardData.limit) || 0,
          closing_day: parseInt(cardData.closingDay, 10) || 10,
          due_day: parseInt(cardData.dueDay, 10) || 17,
          color: cardData.color || '#8A05BE'
        })
        .select()
        .single();

      if (error) {
        console.error('[Cartoes Supabase] Erro ao cadastrar cartão:', error);
        throw error;
      }

      const created = {
        id: data.id,
        name: data.name,
        brand: data.bank_name,
        lastFour: data.last_four_digits,
        limit: Number(data.credit_limit),
        closingDay: data.closing_day,
        dueDay: data.due_day,
        color: data.color,
        installments: []
      };

      SaldoCerto.getState().creditCards.push(created);
      return created;
    } else {
      const newCard = {
        id: 'card-' + Date.now(),
        brand: cardData.brand || cardData.name,
        name: cardData.name,
        lastFour: cardData.lastFour || '0000',
        limit: parseFloat(cardData.limit) || 0,
        closingDay: parseInt(cardData.closingDay, 10) || 10,
        dueDay: parseInt(cardData.dueDay, 10) || 17,
        color: cardData.color || '#8A05BE',
        installments: []
      };
      SaldoCerto.getState().creditCards.push(newCard);
      SaldoCerto.saveData();
      return newCard;
    }
  };

  /**
   * Atualiza informações do cartão
   */
  const updateCreditCard = async (id, cardData) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('credit_cards')
        .update({
          name: cardData.name,
          bank_name: cardData.brand || cardData.name,
          last_four_digits: cardData.lastFour,
          credit_limit: parseFloat(cardData.limit),
          closing_day: parseInt(cardData.closingDay, 10),
          due_day: parseInt(cardData.dueDay, 10),
          color: cardData.color,
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
   * Exclui um cartão de crédito
   */
  const deleteCreditCard = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('credit_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Cartoes Supabase] Erro ao excluir cartão:', error);
        throw error;
      }
    }

    const state = SaldoCerto.getState();
    state.creditCards = (state.creditCards || []).filter(c => c.id !== id);
    SaldoCerto.saveData();
  };

  /**
   * Busca todas as compras parceladas
   */
  const getCardPurchases = async (cardId = null) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      let query = window.supabaseClient
        .from('credit_card_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (cardId) {
        query = query.eq('credit_card_id', cardId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Cartoes Supabase] Erro ao buscar compras:', error);
        return [];
      }
      return data;
    }
    return [];
  };

  /**
   * Cadastra nova compra parcelada
   */
  const createCardPurchase = async (purchaseData) => {
    const total = parseFloat(purchaseData.totalAmount);
    const installments = parseInt(purchaseData.installments, 10) || 1;
    const monthly = total / installments;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await window.supabaseClient
        .from('credit_card_purchases')
        .insert({
          user_id: user.id,
          credit_card_id: purchaseData.cardId,
          description: purchaseData.description.trim(),
          category: purchaseData.category || 'Outros',
          total_amount: total,
          installment_amount: monthly,
          total_installments: installments,
          current_installment: parseInt(purchaseData.currentInstallment, 10) || 1,
          purchase_date: purchaseData.firstDueDate || new Date().toISOString().split('T')[0],
          first_due_date: purchaseData.firstDueDate || null
        })
        .select()
        .single();

      if (error) {
        console.error('[Cartoes Supabase] Erro ao cadastrar parcela:', error);
        throw error;
      }

      return data;
    } else {
      const card = SaldoCerto.getState().creditCards.find(c => c.id === purchaseData.cardId);
      if (card) {
        if (!card.installments) card.installments = [];
        const newInst = {
          id: 'inst-' + Date.now(),
          description: purchaseData.description.trim(),
          totalAmount: total,
          totalInstallments: installments,
          currentInstallment: parseInt(purchaseData.currentInstallment, 10) || 1,
          monthlyAmount: monthly
        };
        card.installments.push(newInst);
        SaldoCerto.saveData();
        return newInst;
      }
    }
  };

  /**
   * Atualiza compra parcelada
   */
  const updateCardPurchase = async (id, updates) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const { data, error } = await window.supabaseClient
        .from('credit_card_purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  };

  /**
   * Exclui compra parcelada
   */
  const deleteCardPurchase = async (cardId, purchaseId) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await window.supabaseClient
        .from('credit_card_purchases')
        .delete()
        .eq('id', purchaseId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Cartoes Supabase] Erro ao deletar parcela:', error);
        throw error;
      }
    }

    const card = (SaldoCerto.getState().creditCards || []).find(c => c.id === cardId);
    if (card && card.installments) {
      card.installments = card.installments.filter(i => i.id !== purchaseId);
      SaldoCerto.saveData();
    }
  };

  /**
   * Renderização visual dos cartões e parcelamentos
   */
  const renderCards = async () => {
    const cards = await getCreditCards();

    // Calcula métricas
    let totalLimit = 0;
    let totalUsed = 0;

    cards.forEach(card => {
      totalLimit += Number(card.limit || 0);
      const instSum = (card.installments || []).reduce((sum, inst) => sum + (inst.monthlyAmount || 0), 0);
      const cardUsed = instSum > 0 ? instSum : (card.limit > 0 ? card.limit * 0.25 : 0);
      card._used = Math.min(cardUsed, card.limit);
      card._available = Math.max(0, card.limit - card._used);
      totalUsed += card._used;
    });

    const totalAvailable = Math.max(0, totalLimit - totalUsed);
    const usedPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : 0;

    const statLimit = document.getElementById('statTotalCreditLimit');
    if (statLimit) statLimit.textContent = SaldoCerto.formatCurrency(totalLimit);
    const statUsed = document.getElementById('statTotalCreditUsed');
    if (statUsed) statUsed.textContent = SaldoCerto.formatCurrency(totalUsed);
    const statPct = document.getElementById('statCreditUsedPercent');
    if (statPct) statPct.textContent = `${usedPercent}% do limite total comprometido`;
    const statAvail = document.getElementById('statTotalCreditAvailable');
    if (statAvail) statAvail.textContent = SaldoCerto.formatCurrency(totalAvailable);
    const statCount = document.getElementById('statCardsCount');
    if (statCount) statCount.textContent = cards.length;

    const badge = document.getElementById('cardsBadgeCount');
    if (badge) badge.textContent = `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'}`;

    const grid = document.getElementById('cardsListGrid');
    if (!grid) return;

    if (cards.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="credit-card"></i></div>
            <h4 class="empty-state-title">Nenhum cartão cadastrado</h4>
            <p class="empty-state-desc">Cadastre seus cartões de crédito para acompanhar faturas e compras parceladas em tempo real.</p>
            <button class="btn btn-primary btn-sm" onclick="CartoesModule.openAddCardModal()">
              <i data-lucide="plus-circle"></i> Adicionar Cartão
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      renderInstallmentsTable(cards);
      return;
    }

    grid.innerHTML = cards.map(c => {
      const cardColor = c.color || '#8A05BE';
      const pct = c.limit > 0 ? Math.min(100, (c._used / c.limit) * 100) : 0;
      let barColor = '#16A34A';
      if (pct > 75) barColor = '#DC2626';
      else if (pct > 50) barColor = '#D97706';

      return `
        <div class="card" style="padding: var(--space-5);">
          <!-- Cartão Visual Estilizado -->
          <div class="credit-card-visual" style="background: linear-gradient(135deg, ${cardColor} 0%, #0F172A 100%); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase;">${c.brand}</span>
              <i data-lucide="wifi" style="width: 20px; height: 20px; opacity: 0.85;"></i>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
              <div class="card-chip"></div>
            </div>

            <div class="card-number-display">•••• •••• •••• ${c.lastFour || '0000'}</div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px;">
              <div>
                <span style="opacity: 0.7; text-transform: uppercase; font-size: 9px; display: block;">Titular</span>
                <span style="font-weight: 600;">${c.name}</span>
              </div>
              <div>
                <span style="opacity: 0.7; text-transform: uppercase; font-size: 9px; display: block;">Vencimento</span>
                <span style="font-weight: 700;">Dia ${c.dueDay || 15}</span>
              </div>
            </div>
          </div>

          <!-- Informações de Limite e Datas -->
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: 4px;">
            <span>Utilizado: <strong style="color: var(--color-text);">${SaldoCerto.formatCurrency(c._used)}</strong></span>
            <span>Limite: <strong style="color: var(--color-text);">${SaldoCerto.formatCurrency(c.limit)}</strong></span>
          </div>

          <!-- Barra de Utilização -->
          <div class="usage-bar-bg">
            <div class="usage-bar-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3); font-size: var(--font-size-xs);">
            <div>
              <span class="badge badge-success">Disponível: ${SaldoCerto.formatCurrency(c._available)}</span>
            </div>
            <div style="color: var(--color-text-muted); font-size: 11px;">
              Fecha dia <strong>${c.closingDay}</strong> • Vence dia <strong>${c.dueDay}</strong>
            </div>
          </div>

          <!-- Ajuste Rápido de Limite -->
          <div style="background: var(--color-bg-subtle); padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-top: var(--space-3); display: flex; justify-content: space-between; align-items: center; gap: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px;">
              <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> Limite:
            </span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 6px; font-weight: 700; color: var(--color-danger);" title="Reduzir limite em R$ 500" onclick="CartoesModule.quickAdjustCardLimit('${c.id}', -500)">
                -500
              </button>
              <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 6px; font-weight: 700; color: var(--color-danger);" title="Reduzir limite em R$ 1.000" onclick="CartoesModule.quickAdjustCardLimit('${c.id}', -1000)">
                -1k
              </button>
              <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 6px; font-weight: 700; color: var(--color-success);" title="Aumentar limite em R$ 500" onclick="CartoesModule.quickAdjustCardLimit('${c.id}', 500)">
                +500
              </button>
              <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 6px; font-weight: 700; color: var(--color-success);" title="Aumentar limite em R$ 1.000" onclick="CartoesModule.quickAdjustCardLimit('${c.id}', 1000)">
                +1k
              </button>
              <button class="btn btn-outline btn-sm" style="font-size: 10px; padding: 2px 6px; font-weight: 700; color: var(--color-success);" title="Aumentar limite em R$ 2.000" onclick="CartoesModule.quickAdjustCardLimit('${c.id}', 2000)">
                +2k
              </button>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 3px 8px; display: flex; align-items: center; gap: 4px;" title="Digitar limite exato" onclick="CartoesModule.promptEditLimit('${c.id}')">
              <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Digitar Limite
            </button>
            <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir cartão" onclick="CartoesModule.handleDeleteCard('${c.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
    renderInstallmentsTable(cards);
  };

  const renderInstallmentsTable = (cards) => {
    const tbody = document.getElementById('installmentsTableBody');
    if (!tbody) return;

    let allInstallments = [];
    (cards || []).forEach(card => {
      (card.installments || []).forEach(inst => {
        allInstallments.push({ ...inst, cardName: card.name || card.brand, cardId: card.id });
      });
    });

    if (allInstallments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="check-circle-2"></i></div>
              <h4 class="empty-state-title">Nenhuma compra parcelada ativa</h4>
              <p class="empty-state-desc">Você não possui faturas com parcelas futuras pendentes.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    tbody.innerHTML = allInstallments.map(inst => {
      const remaining = inst.totalInstallments - inst.currentInstallment;
      return `
        <tr>
          <td><strong>${inst.description}</strong></td>
          <td><span class="badge badge-info">${inst.cardName}</span></td>
          <td>${SaldoCerto.formatCurrency(inst.totalAmount)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span><strong>${inst.currentInstallment}</strong> de ${inst.totalInstallments}</span>
              <div style="width: 50px; height: 6px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
                <div style="width: ${(inst.currentInstallment / inst.totalInstallments) * 100}%; height: 100%; background: var(--color-primary);"></div>
              </div>
            </div>
          </td>
          <td style="color: var(--color-danger); font-weight: 700;">
            - ${SaldoCerto.formatCurrency(inst.monthlyAmount)}
          </td>
          <td><span class="badge badge-warning">${remaining} restante${remaining === 1 ? '' : 's'}</span></td>
          <td>
            <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir parcelamento" onclick="CartoesModule.handleDeleteInstallment('${inst.cardId}', '${inst.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  const openAddCardModal = () => {
    document.getElementById('cardForm').reset();
    SaldoCerto.openModal('cardModal');
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    const brand = document.getElementById('cardBrand').value.trim();
    const name = document.getElementById('cardName').value.trim();
    const lastFour = document.getElementById('cardLastFour').value.trim();
    const limit = parseFloat(document.getElementById('cardLimit').value) || 0;
    const closingDay = parseInt(document.getElementById('cardClosingDay').value, 10);
    const dueDay = parseInt(document.getElementById('cardDueDay').value, 10);
    const color = document.getElementById('cardColor').value;

    try {
      await createCreditCard({ brand, name, lastFour, limit, closingDay, dueDay, color });
      SaldoCerto.closeModal('cardModal');
      SaldoCerto.showToast(`Cartão "${name}" cadastrado com sucesso!`, 'success');
      await renderCards();
    } catch (err) {
      SaldoCerto.showToast('Erro ao cadastrar cartão de crédito.', 'danger');
    }
  };

  const handleDeleteCard = (cardId) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir este cartão e todos os seus parcelamentos associados?', async () => {
      try {
        await deleteCreditCard(cardId);
        SaldoCerto.showToast('Cartão excluído com sucesso.', 'info');
        await renderCards();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir cartão.', 'danger');
      }
    });
  };

  const openAddInstallmentModal = () => {
    const state = SaldoCerto.getState();
    const select = document.getElementById('instCardSelect');
    if (!select) return;

    if (!state.creditCards || state.creditCards.length === 0) {
      SaldoCerto.showToast('Cadastre um cartão de crédito antes de lançar compras parceladas.', 'warning');
      return;
    }

    select.innerHTML = state.creditCards.map(c => `<option value="${c.id}">${c.name || c.brand} (•••• ${c.lastFour})</option>`).join('');
    document.getElementById('installmentForm').reset();
    SaldoCerto.openModal('installmentModal');
  };

  const handleSaveInstallment = async (e) => {
    e.preventDefault();
    const cardId = document.getElementById('instCardSelect').value;
    const description = document.getElementById('instDesc').value.trim();
    const totalAmount = document.getElementById('instTotalAmount').value;
    const installments = document.getElementById('instTotalInstallments')?.value || document.getElementById('instTotalCount')?.value || 1;
    const currentInstallment = document.getElementById('instCurrentInstallment')?.value || document.getElementById('instCurrentNum')?.value || 1;
    const firstDueDate = document.getElementById('instFirstDueDate')?.value || new Date().toISOString().split('T')[0];

    try {
      await createCardPurchase({
        cardId,
        description,
        totalAmount,
        installments,
        currentInstallment,
        firstDueDate
      });

      SaldoCerto.closeModal('installmentModal');
      SaldoCerto.showToast(`Compra parcelada "${description}" lançada!`, 'success');
      await renderCards();
    } catch (err) {
      SaldoCerto.showToast('Erro ao cadastrar compra parcelada.', 'danger');
    }
  };

  const handleDeleteInstallment = (cardId, instId) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir esta compra parcelada?', async () => {
      try {
        await deleteCardPurchase(cardId, instId);
        SaldoCerto.showToast('Parcelamento excluído com sucesso.', 'info');
        await renderCards();
      } catch (err) {
        SaldoCerto.showToast('Erro ao excluir parcelamento.', 'danger');
      }
    });
  };

  const adjustModalLimit = (delta) => {
    const input = document.getElementById('cardLimit');
    if (!input) return;
    const current = parseFloat(input.value) || 0;
    input.value = Math.max(100, current + delta);
  };

  const quickAdjustCardLimit = async (cardId, delta) => {
    const cards = SaldoCerto.getState().creditCards || [];
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const oldLimit = Number(card.limit || 0);
    const newLimit = Math.max(100, oldLimit + delta);

    try {
      if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (user) {
          const { error } = await window.supabaseClient
            .from('credit_cards')
            .update({
              credit_limit: newLimit,
              updated_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .eq('user_id', user.id);

          if (error) throw error;
        }
      }

      card.limit = newLimit;
      SaldoCerto.saveData();

      const signal = delta > 0 ? `+ ${SaldoCerto.formatCurrency(delta)}` : `- ${SaldoCerto.formatCurrency(Math.abs(delta))}`;
      SaldoCerto.showToast(`Limite do ${card.brand} atualizado (${signal}) → Novo limite: ${SaldoCerto.formatCurrency(newLimit)}`, 'success');
      await renderCards();
    } catch (err) {
      console.error('Erro ao ajustar limite:', err);
      SaldoCerto.showToast('Erro ao atualizar limite do cartão.', 'danger');
    }
  };

  const promptEditLimit = (cardId) => {
    const cards = SaldoCerto.getState().creditCards || [];
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const inputVal = prompt(`Digite o novo limite para o cartão ${card.brand}:`, card.limit);
    if (inputVal === null) return;
    const newLimit = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(newLimit) || newLimit < 10) {
      SaldoCerto.showToast('Informe um valor de limite válido.', 'warning');
      return;
    }

    quickAdjustCardLimit(cardId, newLimit - (card.limit || 0));
  };

  const init = async () => {
    SaldoCerto.initShell('cartoes');
    if (window.SaldoCertoAuth) {
      await SaldoCertoAuth.requireAuth();
    }
    if (window.SaldoCertoProfile) {
      await SaldoCertoProfile.syncUserProfileUI();
    }
    await renderCards();
  };

  return {
    init,
    getCreditCards,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    getCardPurchases,
    createCardPurchase,
    updateCardPurchase,
    deleteCardPurchase,
    renderCards,
    openAddCardModal,
    handleSaveCard,
    handleDeleteCard,
    openAddInstallmentModal,
    handleSaveInstallment,
    handleDeleteInstallment,
    adjustModalLimit,
    quickAdjustCardLimit,
    promptEditLimit
  };
})();

document.addEventListener('DOMContentLoaded', CartoesModule.init);
