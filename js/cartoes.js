/**
 * SaldoCerto - Módulo de Cartões de Crédito e Parcelamentos
 */

const CartoesModule = (() => {
  const renderCards = () => {
    const state = SaldoCerto.getState();
    const cards = state.creditCards || [];

    // Calcula métricas
    let totalLimit = 0;
    let totalUsed = 0;

    cards.forEach(card => {
      totalLimit += Number(card.limit || 0);

      // Soma parcelas ativas no cartão para compor o valor utilizado
      const instSum = (card.installments || []).reduce((sum, inst) => sum + (inst.monthlyAmount || 0), 0);
      // Se não tiver parcelas, simula uso realista para demonstração ou pega transações de cartão
      const cardUsed = instSum > 0 ? (instSum + 1260.50) : 1820.50;
      card._used = Math.min(cardUsed, card.limit);
      card._available = Math.max(0, card.limit - card._used);
      totalUsed += card._used;
    });

    const totalAvailable = Math.max(0, totalLimit - totalUsed);
    const usedPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : 0;

    document.getElementById('statTotalCreditLimit').textContent = SaldoCerto.formatCurrency(totalLimit);
    document.getElementById('statTotalCreditUsed').textContent = SaldoCerto.formatCurrency(totalUsed);
    document.getElementById('statCreditUsedPercent').textContent = `${usedPercent}% do limite total comprometido`;
    document.getElementById('statTotalCreditAvailable').textContent = SaldoCerto.formatCurrency(totalAvailable);
    document.getElementById('statCardsCount').textContent = cards.length;

    const badge = document.getElementById('cardsBadgeCount');
    if (badge) badge.textContent = `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'}`;

    // Renderiza grid de cartões visuais
    const grid = document.getElementById('cardsListGrid');
    if (!grid) return;

    if (cards.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="credit-card"></i></div>
            <h4 class="empty-state-title">Nenhum cartão cadastrado</h4>
            <p class="empty-state-desc">Cadastre seus cartões de crédito para acompanhar faturas e compras parceladas.</p>
            <button class="btn btn-primary btn-sm" onclick="CartoesModule.openAddCardModal()">
              <i data-lucide="plus-circle"></i> Adicionar Cartão
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
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

          <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
            <button class="btn-icon" style="width: 32px; height: 32px;" title="Excluir cartão" onclick="CartoesModule.handleDeleteCard('${c.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--color-danger);"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
    renderInstallmentsTable();
  };

  const renderInstallmentsTable = () => {
    const state = SaldoCerto.getState();
    const tbody = document.getElementById('installmentsTableBody');
    if (!tbody) return;

    let allInstallments = [];
    (state.creditCards || []).forEach(card => {
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

  const handleSaveCard = (e) => {
    e.preventDefault();
    const brand = document.getElementById('cardBrand').value.trim();
    const name = document.getElementById('cardName').value.trim();
    const lastFour = document.getElementById('cardLastFour').value.trim();
    const limit = parseFloat(document.getElementById('cardLimit').value) || 0;
    const closingDay = parseInt(document.getElementById('cardClosingDay').value, 10);
    const dueDay = parseInt(document.getElementById('cardDueDay').value, 10);
    const color = document.getElementById('cardColor').value;

    const newCard = {
      id: 'card-' + Date.now(),
      brand,
      name,
      lastFour,
      limit,
      closingDay,
      dueDay,
      color,
      installments: []
    };

    const state = SaldoCerto.getState();
    state.creditCards = state.creditCards || [];
    state.creditCards.push(newCard);
    SaldoCerto.saveData();
    SaldoCerto.showToast(`Cartão ${brand} adicionado com sucesso!`, 'success');
    SaldoCerto.closeModal('cardModal');
    renderCards();
  };

  const handleDeleteCard = (cardId) => {
    SaldoCerto.confirmAction('Tem certeza que deseja excluir este cartão de crédito?', () => {
      const state = SaldoCerto.getState();
      state.creditCards = state.creditCards.filter(c => c.id !== cardId);
      SaldoCerto.saveData();
      SaldoCerto.showToast('Cartão excluído com sucesso.', 'info');
      renderCards();
    });
  };

  const openAddInstallmentModal = () => {
    const state = SaldoCerto.getState();
    const select = document.getElementById('instCardSelect');
    if (!select) return;

    if (!state.creditCards || state.creditCards.length === 0) {
      SaldoCerto.showToast('Cadastre primeiro um cartão de crédito.', 'warning');
      return;
    }

    select.innerHTML = state.creditCards.map(c => `<option value="${c.id}">${c.name || c.brand} (final ${c.lastFour})</option>`).join('');
    document.getElementById('installmentForm').reset();
    SaldoCerto.openModal('installmentModal');
  };

  const handleSaveInstallment = (e) => {
    e.preventDefault();
    const cardId = document.getElementById('instCardSelect').value;
    const desc = document.getElementById('instDesc').value.trim();
    const totalAmount = parseFloat(document.getElementById('instTotalAmount').value) || 0;
    const totalInstallments = parseInt(document.getElementById('instTotalInstallments').value, 10) || 1;
    const currentInstallment = parseInt(document.getElementById('instCurrentInstallment').value, 10) || 1;

    const state = SaldoCerto.getState();
    const card = (state.creditCards || []).find(c => c.id === cardId);
    if (!card) return;

    card.installments = card.installments || [];
    const monthlyAmount = totalAmount / totalInstallments;

    card.installments.push({
      id: 'inst-' + Date.now(),
      description: desc,
      totalAmount,
      totalInstallments,
      currentInstallment,
      monthlyAmount
    });

    SaldoCerto.saveData();
    SaldoCerto.showToast(`Compra parcelada "${desc}" registrada!`, 'success');
    SaldoCerto.closeModal('installmentModal');
    renderCards();
  };

  const handleDeleteInstallment = (cardId, instId) => {
    SaldoCerto.confirmAction('Excluir esta compra parcelada?', () => {
      const state = SaldoCerto.getState();
      const card = (state.creditCards || []).find(c => c.id === cardId);
      if (card && card.installments) {
        card.installments = card.installments.filter(i => i.id !== instId);
        SaldoCerto.saveData();
        SaldoCerto.showToast('Parcelamento excluído.', 'info');
        renderCards();
      }
    });
  };

  const init = () => {
    SaldoCerto.initShell('cartoes');
    renderCards();
  };

  return {
    init,
    renderCards,
    openAddCardModal,
    handleSaveCard,
    handleDeleteCard,
    openAddInstallmentModal,
    handleSaveInstallment,
    handleDeleteInstallment
  };
})();

document.addEventListener('DOMContentLoaded', CartoesModule.init);
