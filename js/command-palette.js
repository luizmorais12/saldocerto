/**
 * SaldoCerto - Command Palette (Ctrl+K / Cmd+K)
 * Permite navegação rápida, execução de ações e pesquisa através do teclado.
 */

(function () {
  'use strict';

  let selectedIndex = 0;
  let currentFilteredList = [];

  const COMMANDS = [
    { id: 'goto-dashboard', title: 'Ir para Dashboard', icon: 'layout-dashboard', action: () => window.location.href = 'dashboard.html' },
    { id: 'goto-receitas', title: 'Ir para Receitas', icon: 'arrow-down-circle', action: () => window.location.href = 'receitas.html' },
    { id: 'goto-despesas', title: 'Ir para Despesas', icon: 'arrow-up-circle', action: () => window.location.href = 'despesas.html' },
    { id: 'goto-cartoes', title: 'Ir para Cartões', icon: 'credit-card', action: () => window.location.href = 'cartoes.html' },
    { id: 'goto-contas', title: 'Ir para Contas', icon: 'landmark', action: () => window.location.href = 'contas.html' },
    { id: 'goto-metas', title: 'Ir para Metas', icon: 'target', action: () => window.location.href = 'metas.html' },
    { id: 'goto-investimentos', title: 'Ir para Investimentos', icon: 'trending-up', action: () => window.location.href = 'investimentos.html' },
    { id: 'goto-patrimonio', title: 'Ir para Patrimônio', icon: 'pie-chart', action: () => window.location.href = 'patrimonio.html' },
    { id: 'goto-orcamentos', title: 'Ir para Orçamentos (50/30/20)', icon: 'calculator', action: () => window.location.href = 'orcamentos.html' },
    { id: 'goto-relatorios', title: 'Abrir Relatórios', icon: 'file-bar-chart', action: () => window.location.href = 'relatorios.html' },
    { id: 'goto-simulador', title: 'Abrir Simulador de Investimentos', icon: 'sparkles', action: () => window.location.href = 'simulador.html' },
    { id: 'goto-importar', title: 'Importar Extrato OFX / CSV', icon: 'upload', action: () => window.location.href = 'importar.html' },
    { id: 'new-transaction', title: 'Nova transação', icon: 'plus-circle', action: () => openNewTransaction() },
    { id: 'new-income', title: 'Nova receita', icon: 'plus', action: () => openNewIncome() },
    { id: 'new-expense', title: 'Nova despesa', icon: 'minus', action: () => openNewExpense() },
    { id: 'search-movements', title: 'Pesquisar movimentação', icon: 'search', action: () => searchMovements() },
    { id: 'goto-settings', title: 'Abrir configurações', icon: 'settings', action: () => window.location.href = 'configuracoes.html' },
    { id: 'toggle-privacy', title: 'Alternar Modo Privacidade (Olho Mágico)', icon: 'eye', action: () => togglePrivacyMode() },
    { id: 'toggle-theme', title: 'Alternar Tema Claro / Escuro', icon: 'moon', action: () => toggleThemeMode() }
  ];

  function openNewTransaction() {
    closeCommandPalette();
    if (typeof window.SaldoCerto !== 'undefined' && typeof window.SaldoCerto.openModal === 'function') {
      window.SaldoCerto.openModal('newTransactionModal');
    } else {
      const btn = document.getElementById('btnNewTransaction') || document.querySelector('[data-action="new-transaction"]');
      if (btn) btn.click();
    }
  }

  function openNewIncome() {
    closeCommandPalette();
    if (window.location.pathname.includes('receitas.html')) {
      const btn = document.querySelector('[onclick*="Modal"]') || document.querySelector('.btn-primary');
      if (btn) btn.click();
    } else {
      window.location.href = 'receitas.html?action=new';
    }
  }

  function openNewExpense() {
    closeCommandPalette();
    if (window.location.pathname.includes('despesas.html')) {
      const btn = document.querySelector('[onclick*="Modal"]') || document.querySelector('.btn-primary');
      if (btn) btn.click();
    } else {
      window.location.href = 'despesas.html?action=new';
    }
  }

  function searchMovements() {
    closeCommandPalette();
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]');
    if (searchInput) {
      searchInput.focus();
    } else {
      window.location.href = 'dashboard.html#transacoes';
    }
  }

  function togglePrivacyMode() {
    closeCommandPalette();
    if (typeof window.SaldoCerto !== 'undefined' && typeof window.SaldoCerto.togglePrivacy === 'function') {
      window.SaldoCerto.togglePrivacy();
    }
  }

  function toggleThemeMode() {
    closeCommandPalette();
    if (typeof window.SaldoCerto !== 'undefined' && typeof window.SaldoCerto.toggleTheme === 'function') {
      window.SaldoCerto.toggleTheme();
    }
  }

  function initCommandPalette() {
    // Evita duplicar se já foi adicionado
    if (document.getElementById('commandPaletteModal')) return;

    const modalHtml = `
      <div id="commandPaletteModal" class="modal-overlay" style="display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; z-index: 9999;">
        <div class="modal-dialog" style="max-width: 580px; width: 92%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); border-radius: var(--radius-xl, 16px); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-card, #FFFFFF);">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 12px;">
            <i data-lucide="search" style="color: var(--color-text-muted); width: 20px; height: 20px; flex-shrink: 0;"></i>
            <input type="text" id="commandPaletteInput" placeholder="O que você deseja fazer? (ex: Ir para receitas, Nova despesa, Ctrl+K)" 
                   style="border: none; outline: none; background: transparent; width: 100%; font-size: 15px; color: var(--color-text); font-family: inherit;" autocomplete="off">
            <kbd style="font-size: 11px; background: var(--color-bg-subtle, #F1F5F9); padding: 3px 7px; border-radius: 6px; color: var(--color-text-muted); border: 1px solid var(--color-border); font-family: monospace;">ESC</kbd>
          </div>

          <div id="commandPaletteList" style="max-height: 360px; overflow-y: auto; padding: 8px;">
            <!-- Itens preenchidos dinamicamente -->
          </div>

          <div style="padding: 10px 18px; background: var(--color-bg-subtle, #F8FAFC); border-top: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--color-text-muted);">
            <div style="display: flex; gap: 14px;">
              <span><kbd style="background: var(--color-card, #FFF); border: 1px solid var(--color-border); padding: 1px 4px; border-radius: 4px;">↑</kbd> <kbd style="background: var(--color-card, #FFF); border: 1px solid var(--color-border); padding: 1px 4px; border-radius: 4px;">↓</kbd> navegar</span>
              <span><kbd style="background: var(--color-card, #FFF); border: 1px solid var(--color-border); padding: 1px 4px; border-radius: 4px;">↵</kbd> selecionar</span>
            </div>
            <span>SaldoCerto Quick Actions</span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const input = document.getElementById('commandPaletteInput');
    const modal = document.getElementById('commandPaletteModal');

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCommandPalette();
      }
    });

    // Input filter
    if (input) {
      input.addEventListener('input', (e) => {
        filterCommandPalette(e.target.value);
      });

      // Navegação por teclado
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeCurrentSelection();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeCommandPalette();
        }
      });
    }

    // Atalhos globais
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && isPaletteOpen()) {
        closeCommandPalette();
      }
    });
  }

  function isPaletteOpen() {
    const modal = document.getElementById('commandPaletteModal');
    return modal && modal.style.display !== 'none';
  }

  function openCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 60);
    }

    selectedIndex = 0;
    renderCommandList(COMMANDS);
  }

  function closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function toggleCommandPalette() {
    if (isPaletteOpen()) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  }

  function filterCommandPalette(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      currentFilteredList = COMMANDS;
    } else {
      currentFilteredList = COMMANDS.filter(cmd => {
        return cmd.title.toLowerCase().includes(q) || cmd.id.toLowerCase().includes(q);
      });
    }
    selectedIndex = 0;
    renderCommandList(currentFilteredList);
  }

  function moveSelection(direction) {
    if (currentFilteredList.length === 0) return;
    selectedIndex = (selectedIndex + direction + currentFilteredList.length) % currentFilteredList.length;
    highlightSelected();
  }

  function highlightSelected() {
    const items = document.querySelectorAll('.sc-command-item');
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.style.backgroundColor = 'var(--color-bg-subtle, #F1F5F9)';
        item.style.outline = '1px solid var(--color-border, #E2E8F0)';
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.style.backgroundColor = 'transparent';
        item.style.outline = 'none';
      }
    });
  }

  function executeCurrentSelection() {
    if (currentFilteredList.length > 0 && currentFilteredList[selectedIndex]) {
      const cmd = currentFilteredList[selectedIndex];
      if (typeof cmd.action === 'function') {
        cmd.action();
      }
    }
  }

  function renderCommandList(list) {
    currentFilteredList = list;
    const container = document.getElementById('commandPaletteList');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--color-text-muted); font-size: 14px;">
          Nenhum comando encontrado para sua pesquisa.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((cmd, index) => {
      const isSelected = index === selectedIndex;
      return `
        <div class="sc-command-item" data-index="${index}" style="
          padding: 10px 14px;
          border-radius: var(--radius-md, 8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          background-color: ${isSelected ? 'var(--color-bg-subtle, #F1F5F9)' : 'transparent'};
          outline: ${isSelected ? '1px solid var(--color-border, #E2E8F0)' : 'none'};
          transition: background-color 0.15s ease;
          margin-bottom: 2px;
        " onmouseenter="window.SaldoCertoPalette.select(${index})" onclick="window.SaldoCertoPalette.execute(${index})">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--color-bg-subtle, #F8FAFC); color: var(--color-primary, #16A34A); flex-shrink: 0;">
              <i data-lucide="${cmd.icon}" style="width: 17px; height: 17px;"></i>
            </div>
            <span style="font-size: 14px; font-weight: 500; color: var(--color-text);">${cmd.title}</span>
          </div>
          <i data-lucide="chevron-right" style="width: 15px; height: 15px; color: var(--color-text-muted); opacity: 0.6;"></i>
        </div>
      `;
    }).join('');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // API pública do Command Palette
  window.SaldoCertoPalette = {
    open: openCommandPalette,
    close: closeCommandPalette,
    toggle: toggleCommandPalette,
    select: (index) => {
      selectedIndex = index;
      highlightSelected();
    },
    execute: (index) => {
      selectedIndex = index;
      executeCurrentSelection();
    }
  };

  // Inicialização automática ao carregar o DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommandPalette);
  } else {
    initCommandPalette();
  }
})();
