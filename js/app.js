/**
 * SaldoCerto - Core & State Management
 * "Seu dinheiro no controle."
 */

const SaldoCerto = (() => {
  const STORAGE_KEY = 'saldocerto_db_v1';
  const THEME_KEY = 'saldocerto_theme';

  // Estado global reativo na sessão
  let state = {
    transactions: [],
    accounts: [],
    creditCards: [],
    goals: [],
    investments: [],
    assets: [],
    liabilities: [],
    settings: {
      userName: 'Luiz',
      userEmail: 'luiz@saldocerto.com.br',
      currency: 'BRL',
      firstDayOfMonth: 1,
      theme: 'light'
    },
    // Controle de mês/ano selecionado para filtros
    selectedYear: 2026,
    selectedMonth: 8 // 0-indexed: 8 = Setembro
  };

  // Nomes dos meses em Português
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Cores e Ícones padrão para categorias
  const CATEGORIES = {
    expense: [
      { id: 'moradia', name: 'Moradia', icon: 'home', color: '#6366F1' },
      { id: 'alimentacao', name: 'Alimentação', icon: 'utensils', color: '#F59E0B' },
      { id: 'transporte', name: 'Transporte', icon: 'car', color: '#3B82F6' },
      { id: 'lazer', name: 'Lazer', icon: 'gamepad-2', color: '#EC4899' },
      { id: 'saude', name: 'Saúde', icon: 'heart-pulse', color: '#EF4444' },
      { id: 'educacao', name: 'Educação', icon: 'graduation-cap', color: '#8B5CF6' },
      { id: 'assinaturas', name: 'Assinaturas', icon: 'tv', color: '#14B8A6' },
      { id: 'outros', name: 'Outros', icon: 'more-horizontal', color: '#64748B' }
    ],
    income: [
      { id: 'salario', name: 'Salário', icon: 'briefcase', color: '#16A34A' },
      { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#059669' },
      { id: 'beneficios', name: 'Benefícios', icon: 'gift', color: '#10B981' },
      { id: 'investimentos', name: 'Investimentos', icon: 'trending-up', color: '#0EA5E9' },
      { id: 'vendas', name: 'Vendas', icon: 'shopping-bag', color: '#84CC16' },
      { id: 'outros', name: 'Outros', icon: 'plus-circle', color: '#64748B' }
    ]
  };

  /**
   * Formatação monetária rigorosa em BRL (pt-BR)
   */
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return currencyFormatter.format(num);
  };

  const formatPercent = (value) => {
    const num = Number(value) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(1).replace('.', ',')}%`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('pt-BR');
  };

  /**
   * Inicialização e carregamento dos dados com Seed Fictício Inicial
   */
  const initSeedData = () => {
    return {
      transactions: [
        {
          id: 'tx-1',
          type: 'income',
          description: 'Salário Principal',
          amount: 4500.00,
          category: 'Salário',
          account: 'Nubank',
          date: '2026-09-05',
          paymentMethod: 'Transferência',
          recurrence: 'Mensal',
          notes: 'Salário creditado pontualmente'
        },
        {
          id: 'tx-2',
          type: 'income',
          description: 'Freelance Design UI/UX',
          amount: 850.00,
          category: 'Freelance',
          account: 'Itaú',
          date: '2026-09-12',
          paymentMethod: 'PIX',
          recurrence: 'Única',
          notes: 'Projeto landing page cliente'
        },
        {
          id: 'tx-3',
          type: 'income',
          description: 'Dividendos FIIs & Ações',
          amount: 1500.00,
          category: 'Investimentos',
          account: 'Nubank',
          date: '2026-09-15',
          paymentMethod: 'Transferência',
          recurrence: 'Mensal',
          notes: 'Rendimentos mensais'
        },
        {
          id: 'tx-4',
          type: 'expense',
          description: 'Aluguel do Apartamento',
          amount: 1200.00,
          category: 'Moradia',
          account: 'Itaú',
          date: '2026-09-08',
          paymentMethod: 'PIX',
          recurrence: 'Mensal',
          notes: 'Aluguel + condomínio'
        },
        {
          id: 'tx-5',
          type: 'expense',
          description: 'Supermercado Mensal',
          amount: 350.00,
          category: 'Alimentação',
          account: 'Nubank',
          date: '2026-09-10',
          paymentMethod: 'Cartão de Débito',
          recurrence: 'Única',
          notes: 'Compras de mantimentos e hortifruti'
        },
        {
          id: 'tx-6',
          type: 'expense',
          description: 'Uber Corridas da Semana',
          amount: 120.00,
          category: 'Transporte',
          account: 'Nubank',
          date: '2026-09-14',
          paymentMethod: 'Cartão de Crédito',
          recurrence: 'Única',
          notes: 'Deslocamentos até o centro'
        },
        {
          id: 'tx-7',
          type: 'expense',
          description: 'Internet Fibra Óptica',
          amount: 100.00,
          category: 'Moradia',
          account: 'Nubank',
          date: '2026-09-15',
          paymentMethod: 'Boleto',
          recurrence: 'Mensal',
          notes: '500 Mega'
        },
        {
          id: 'tx-8',
          type: 'expense',
          description: 'Netflix Premium 4K',
          amount: 39.90,
          category: 'Assinaturas',
          account: 'Nubank',
          date: '2026-09-18',
          paymentMethod: 'Cartão de Crédito',
          recurrence: 'Mensal',
          notes: 'Plano familiar'
        },
        {
          id: 'tx-9',
          type: 'expense',
          description: 'Jantar Restaurante Italiano',
          amount: 180.00,
          category: 'Lazer',
          account: 'Nubank',
          date: '2026-09-20',
          paymentMethod: 'Cartão de Crédito',
          recurrence: 'Única',
          notes: 'Comemoração em família'
        }
      ],
      accounts: [
        { id: 'acc-1', name: 'Nubank', type: 'Conta digital', balance: 3420.50, color: '#8A05BE', icon: 'wallet' },
        { id: 'acc-2', name: 'Itaú', type: 'Conta corrente', balance: 2180.00, color: '#EC7000', icon: 'landmark' },
        { id: 'acc-3', name: 'Mercado Pago', type: 'Conta digital', balance: 820.00, color: '#009EE3', icon: 'smartphone' },
        { id: 'acc-4', name: 'Carteira Física', type: 'Dinheiro', balance: 250.00, color: '#16A34A', icon: 'banknote' }
      ],
      creditCards: [
        {
          id: 'card-1',
          name: 'Nubank Ultravioleta',
          brand: 'Nubank',
          lastFour: '1234',
          limit: 5000.00,
          closingDay: 10,
          dueDay: 17,
          color: '#8A05BE',
          installments: [
            { id: 'inst-1', description: 'Notebook Dell Pro', totalAmount: 3600.00, totalInstallments: 10, currentInstallment: 4, monthlyAmount: 360.00 },
            { id: 'inst-2', description: 'Pneus do Carro', totalAmount: 1200.00, totalInstallments: 6, currentInstallment: 2, monthlyAmount: 200.00 }
          ]
        },
        {
          id: 'card-2',
          name: 'Itaú Click Visa',
          brand: 'Itaú',
          lastFour: '5678',
          limit: 3500.00,
          closingDay: 5,
          dueDay: 12,
          color: '#EC7000',
          installments: []
        }
      ],
      goals: [
        {
          id: 'goal-1',
          name: 'Reserva de Emergência',
          targetAmount: 15000.00,
          currentAmount: 8000.00,
          deadline: '2026-12-31',
          category: 'Segurança',
          icon: 'shield-check',
          color: '#16A34A'
        },
        {
          id: 'goal-2',
          name: '🚗 Comprar Carro Novo',
          targetAmount: 40000.00,
          currentAmount: 18000.00,
          deadline: '2027-12-31',
          category: 'Veículos',
          icon: 'car',
          color: '#2563EB'
        },
        {
          id: 'goal-3',
          name: '✈️ Viagem para a Europa',
          targetAmount: 12000.00,
          currentAmount: 4500.00,
          deadline: '2027-07-20',
          category: 'Viagens',
          icon: 'plane',
          color: '#D97706'
        }
      ],
      investments: [
        { id: 'inv-1', name: 'Tesouro Selic 2029', category: 'Tesouro Direto', investedAmount: 7000.00, currentAmount: 7850.00, institution: 'NuInvest' },
        { id: 'inv-2', name: 'CDB Banco Inter 110% CDI', category: 'CDB', investedAmount: 5000.00, currentAmount: 5650.00, institution: 'Inter' },
        { id: 'inv-3', name: 'FII MXRF11 / HGLG11', category: 'FIIs', investedAmount: 3500.00, currentAmount: 3950.00, institution: 'XP' },
        { id: 'inv-4', name: 'ETF IVVB11 (S&P 500)', category: 'ETFs', investedAmount: 1000.00, currentAmount: 1300.00, institution: 'Clear' }
      ],
      assets: [
        { id: 'ast-1', name: 'Dinheiro em Contas', category: 'Dinheiro', value: 6670.50 },
        { id: 'ast-2', name: 'Investimentos Financeiros', category: 'Investimentos', value: 18750.00 },
        { id: 'ast-3', name: 'Carro HB20 2022 (FIPE)', category: 'Veículos', value: 45000.00 },
        { id: 'ast-4', name: 'Equipamentos e Eletrônicos', category: 'Outros', value: 8500.00 }
      ],
      liabilities: [
        { id: 'lia-1', name: 'Faturas de Cartões em Aberto', category: 'Cartões', value: 1820.50 },
        { id: 'lia-2', name: 'Financiamento Veicular Restante', category: 'Financiamentos', value: 16500.00 },
        { id: 'lia-3', name: 'Empréstimo Pessoal Bancário', category: 'Empréstimos', value: 3679.50 }
      ],
      settings: {
        userName: 'Luiz',
        userEmail: 'luiz@saldocerto.com.br',
        currency: 'BRL',
        firstDayOfMonth: 1,
        theme: 'light'
      },
      selectedYear: 2026,
      selectedMonth: 8
    };
  };

  const loadData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        state = { ...state, ...parsed };
      } else {
        state = initSeedData();
        saveData();
      }
    } catch (e) {
      console.warn('Erro ao carregar localStorage, usando dados padrão:', e);
      state = initSeedData();
    }
  };

  const saveData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  };

  // --- Cálculos Financeiros Dinâmicos ---
  const getTransactionsForSelectedPeriod = () => {
    return state.transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === state.selectedYear && d.getMonth() === state.selectedMonth;
    });
  };

  const calculateIncome = () => {
    return getTransactionsForSelectedPeriod()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  };

  const calculateExpenses = () => {
    return getTransactionsForSelectedPeriod()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  };

  const calculateBalance = () => {
    // Saldo em contas somado dinamicamente
    const totalAccountBalance = state.accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    return totalAccountBalance;
  };

  const calculateInvestments = () => {
    return state.investments.reduce((sum, inv) => sum + Number(inv.currentAmount || 0), 0);
  };

  const calculateInvestedPrincipal = () => {
    return state.investments.reduce((sum, inv) => sum + Number(inv.investedAmount || 0), 0);
  };

  const calculateTotalAssets = () => {
    return state.assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
  };

  const calculateTotalLiabilities = () => {
    return state.liabilities.reduce((sum, l) => sum + Number(l.value || 0), 0);
  };

  const calculateNetWorth = () => {
    return calculateTotalAssets() - calculateTotalLiabilities();
  };

  // --- Gerenciamento de Transações ---
  const addTransaction = (tx) => {
    const newTx = {
      id: 'tx-' + Date.now(),
      type: tx.type,
      description: tx.description.trim(),
      amount: parseFloat(tx.amount),
      category: tx.category,
      account: tx.account,
      date: tx.date || new Date().toISOString().split('T')[0],
      paymentMethod: tx.paymentMethod || 'Outro',
      recurrence: tx.recurrence || 'Única',
      notes: tx.notes || ''
    };

    state.transactions.unshift(newTx);

    // Ajusta o saldo da respectiva conta se informada
    if (newTx.account) {
      const acc = state.accounts.find(a => a.name === newTx.account);
      if (acc) {
        if (newTx.type === 'income') {
          acc.balance += newTx.amount;
        } else if (newTx.type === 'expense') {
          acc.balance -= newTx.amount;
        }
      }
    }

    saveData();
    showToast(`Transação "${newTx.description}" adicionada com sucesso!`, 'success');
    return newTx;
  };

  const updateTransaction = (id, updatedData) => {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], ...updatedData };
      saveData();
      showToast('Transação atualizada com sucesso.', 'success');
      return true;
    }
    return false;
  };

  const deleteTransaction = (id) => {
    const tx = state.transactions.find(t => t.id === id);
    if (tx) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveData();
      showToast(`Transação "${tx.description}" excluída.`, 'info');
      return true;
    }
    return false;
  };

  // --- Gerenciamento de Contas ---
  const addAccount = (acc) => {
    const newAcc = {
      id: 'acc-' + Date.now(),
      name: acc.name.trim(),
      type: acc.type || 'Conta corrente',
      balance: parseFloat(acc.balance) || 0,
      color: acc.color || '#16A34A',
      icon: acc.icon || 'landmark'
    };
    state.accounts.push(newAcc);
    saveData();
    showToast(`Conta "${newAcc.name}" criada com sucesso!`, 'success');
    return newAcc;
  };

  const deleteAccount = (id) => {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveData();
    showToast('Conta excluída com sucesso.', 'info');
  };

  const transferBetweenAccounts = (fromId, toId, amount) => {
    const fromAcc = state.accounts.find(a => a.id === fromId);
    const toAcc = state.accounts.find(a => a.id === toId);
    const val = parseFloat(amount);

    if (!fromAcc || !toAcc || isNaN(val) || val <= 0) {
      showToast('Dados de transferência inválidos.', 'danger');
      return false;
    }

    if (fromAcc.balance < val) {
      showToast(`Saldo insuficiente em ${fromAcc.name}.`, 'warning');
      return false;
    }

    fromAcc.balance -= val;
    toAcc.balance += val;

    // Registra transferência nas movimentações
    state.transactions.unshift({
      id: 'tx-trf-' + Date.now(),
      type: 'expense',
      description: `Transferência enviada para ${toAcc.name}`,
      amount: val,
      category: 'Outros',
      account: fromAcc.name,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Transferência',
      recurrence: 'Única',
      notes: 'Transferência interna'
    });

    state.transactions.unshift({
      id: 'tx-trf-in-' + (Date.now() + 1),
      type: 'income',
      description: `Transferência recebida de ${fromAcc.name}`,
      amount: val,
      category: 'Outros',
      account: toAcc.name,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Transferência',
      recurrence: 'Única',
      notes: 'Transferência interna'
    });

    saveData();
    showToast(`Transferência de ${formatCurrency(val)} realizada com sucesso!`, 'success');
    return true;
  };

  // --- Gerenciamento de Metas ---
  const addGoal = (goal) => {
    const newGoal = {
      id: 'goal-' + Date.now(),
      name: goal.name.trim(),
      targetAmount: parseFloat(goal.targetAmount),
      currentAmount: parseFloat(goal.currentAmount) || 0,
      deadline: goal.deadline,
      category: goal.category || 'Geral',
      icon: goal.icon || 'target',
      color: goal.color || '#16A34A'
    };
    state.goals.push(newGoal);
    saveData();
    showToast(`Meta "${newGoal.name}" criada com sucesso!`, 'success');
    return newGoal;
  };

  const contributeToGoal = (id, amount) => {
    const goal = state.goals.find(g => g.id === id);
    const val = parseFloat(amount);
    if (goal && val > 0) {
      goal.currentAmount += val;
      saveData();
      showToast(`Aporte de ${formatCurrency(val)} registrado na meta "${goal.name}"!`, 'success');
      return true;
    }
    return false;
  };

  // --- Gerenciamento de Investimentos ---
  const addInvestment = (inv) => {
    const newInv = {
      id: 'inv-' + Date.now(),
      name: inv.name.trim(),
      category: inv.category,
      investedAmount: parseFloat(inv.investedAmount) || 0,
      currentAmount: parseFloat(inv.currentAmount) || 0,
      institution: inv.institution || 'Corretora'
    };
    state.investments.push(newInv);
    saveData();
    showToast(`Ativo "${newInv.name}" adicionado à carteira!`, 'success');
    return newInv;
  };

  // --- Sistema de Toast Elegante ---
  const showToast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';

    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${iconName}"></i>
      </div>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);
    if (window.lucide) {
      window.lucide.createIcons();
    }

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // --- Confirmação Padrão ---
  const confirmAction = (message, onConfirm) => {
    let modal = document.getElementById('confirmActionModal');
    if (!modal) {
      const modalHtml = `
        <div id="confirmActionModal" class="modal-overlay">
          <div class="modal-dialog" style="max-width: 420px;">
            <div class="modal-header">
              <h3 class="modal-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="alert-circle" style="color: var(--color-warning);"></i> Confirmação
              </h3>
              <button class="modal-close" onclick="SaldoCerto.closeModal('confirmActionModal')">
                <i data-lucide="x"></i>
              </button>
            </div>
            <div class="modal-body">
              <p id="confirmActionMsg" style="font-size: var(--font-size-sm); color: var(--color-text-secondary);"></p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="SaldoCerto.closeModal('confirmActionModal')">Cancelar</button>
              <button id="confirmActionBtn" class="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('confirmActionModal');
      if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('confirmActionMsg').textContent = message;
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    // Remove listeners antigos clonando o botão
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
      closeModal('confirmActionModal');
      if (typeof onConfirm === 'function') onConfirm();
    });

    openModal('confirmActionModal');
  };

  // --- Controle de Modais ---
  const openModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (window.lucide) window.lucide.createIcons();
    }
  };

  const closeModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // --- Controle de Tema (Dark / Light) ---
  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    state.settings.theme = theme;

    const themeBtns = document.querySelectorAll('.theme-toggle-btn');
    themeBtns.forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    });
    if (window.lucide) window.lucide.createIcons();
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  // --- Navegação de Mês/Ano ---
  const changeMonth = (delta) => {
    state.selectedMonth += delta;
    if (state.selectedMonth > 11) {
      state.selectedMonth = 0;
      state.selectedYear += 1;
    } else if (state.selectedMonth < 0) {
      state.selectedMonth = 11;
      state.selectedYear -= 1;
    }
    updateMonthDisplay();
    // Emite evento para que a página ativa recalcule seus dados
    window.dispatchEvent(new CustomEvent('saldocerto:monthChanged', {
      detail: { month: state.selectedMonth, year: state.selectedYear }
    }));
  };

  const updateMonthDisplay = () => {
    const displays = document.querySelectorAll('.current-month-display');
    const label = `${MONTH_NAMES[state.selectedMonth]} ${state.selectedYear}`;
    displays.forEach(el => el.textContent = label);
  };

  // --- Inicialização Automática da Shell (Sidebar & Header) ---
  const initShell = (activePageId = '') => {
    loadData();
    initTheme();
    updateMonthDisplay();

    // Ativação do item do menu
    if (activePageId) {
      const activeLink = document.querySelector(`.nav-item[data-page="${activePageId}"]`);
      if (activeLink) activeLink.classList.add('active');
    }

    // Toggle menu mobile
    const menuBtn = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (menuBtn && sidebar && overlay) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Listeners do seletor de mês
    document.querySelectorAll('.btn-prev-month').forEach(btn => {
      btn.addEventListener('click', () => changeMonth(-1));
    });
    document.querySelectorAll('.btn-next-month').forEach(btn => {
      btn.addEventListener('click', () => changeMonth(1));
    });

    // Tema
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });

    // Injeção do Modal de Nova Transação Compartilhado
    initTransactionModal();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // --- Modal Global de Nova Transação ---
  const initTransactionModal = () => {
    if (document.getElementById('newTransactionModal')) return;

    const modalHtml = `
      <div id="newTransactionModal" class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="plus-circle" class="text-primary"></i> Nova Transação
            </h3>
            <button class="modal-close" onclick="SaldoCerto.closeModal('newTransactionModal')">
              <i data-lucide="x"></i>
            </button>
          </div>
          <form id="globalTransactionForm" onsubmit="SaldoCerto.handleSaveTransaction(event)">
            <div class="modal-body">
              <!-- Seletor de Tipo (Receita vs Despesa) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4);">
                <button type="button" id="txTypeExpenseBtn" class="btn btn-secondary active-type" style="border: 2px solid var(--color-danger); color: var(--color-danger); font-weight: 700;" onclick="SaldoCerto.setModalTxType('expense')">
                  <i data-lucide="arrow-down-circle"></i> Despesa
                </button>
                <button type="button" id="txTypeIncomeBtn" class="btn btn-secondary" style="border: 2px solid var(--color-border); color: var(--color-text-muted);" onclick="SaldoCerto.setModalTxType('income')">
                  <i data-lucide="arrow-up-circle"></i> Receita
                </button>
              </div>

              <input type="hidden" id="modalTxType" value="expense">

              <div class="form-group">
                <label class="form-label">Descrição *</label>
                <input type="text" id="modalTxDesc" class="form-control" placeholder="Ex: Supermercado, Salário, Uber..." required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0.01" id="modalTxAmount" class="form-control" placeholder="0,00" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Data *</label>
                  <input type="date" id="modalTxDate" class="form-control" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Categoria *</label>
                  <select id="modalTxCategory" class="form-select" required>
                    <!-- Preenchido dinamicamente de acordo com o tipo -->
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Conta Bancária *</label>
                  <select id="modalTxAccount" class="form-select" required>
                    <!-- Preenchido dinamicamente das contas cadastradas -->
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Forma de Pagamento</label>
                  <select id="modalTxPaymentMethod" class="form-select">
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Dinheiro">Dinheiro Físico</option>
                    <option value="Transferência">Transferência / TED</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Recorrência</label>
                  <select id="modalTxRecurrence" class="form-select">
                    <option value="Única">Única</option>
                    <option value="Mensal">Fixa / Mensal</option>
                    <option value="Parcelada">Parcelada</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Observações</label>
                <textarea id="modalTxNotes" class="form-control" rows="2" placeholder="Opcional. Ex: Restaurante com amigos..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="SaldoCerto.closeModal('newTransactionModal')">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <i data-lucide="check"></i> Salvar Transação
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    populateModalFormFields();
  };

  const setModalTxType = (type) => {
    const typeInput = document.getElementById('modalTxType');
    const expenseBtn = document.getElementById('txTypeExpenseBtn');
    const incomeBtn = document.getElementById('txTypeIncomeBtn');
    if (!typeInput) return;

    typeInput.value = type;

    if (type === 'expense') {
      expenseBtn.style.border = '2px solid var(--color-danger)';
      expenseBtn.style.color = 'var(--color-danger)';
      incomeBtn.style.border = '2px solid var(--color-border)';
      incomeBtn.style.color = 'var(--color-text-muted)';
    } else {
      incomeBtn.style.border = '2px solid var(--color-success)';
      incomeBtn.style.color = 'var(--color-success)';
      expenseBtn.style.border = '2px solid var(--color-border)';
      expenseBtn.style.color = 'var(--color-text-muted)';
    }

    populateCategoriesSelect(type);
  };

  const populateCategoriesSelect = (type) => {
    const catSelect = document.getElementById('modalTxCategory');
    if (!catSelect) return;
    const cats = CATEGORIES[type] || [];
    catSelect.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  };

  const populateModalFormFields = () => {
    // Data de hoje como padrão
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('modalTxDate');
    if (dateInput) dateInput.value = today;

    // Popula categorias
    populateCategoriesSelect('expense');

    // Popula contas
    const accSelect = document.getElementById('modalTxAccount');
    if (accSelect) {
      accSelect.innerHTML = state.accounts.map(a => `<option value="${a.name}">${a.name} (${formatCurrency(a.balance)})</option>`).join('');
    }
  };

  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const type = document.getElementById('modalTxType').value;
    const desc = document.getElementById('modalTxDesc').value;
    const amount = document.getElementById('modalTxAmount').value;
    const date = document.getElementById('modalTxDate').value;
    const category = document.getElementById('modalTxCategory').value;
    const account = document.getElementById('modalTxAccount').value;
    const paymentMethod = document.getElementById('modalTxPaymentMethod').value;
    const recurrence = document.getElementById('modalTxRecurrence').value;
    const notes = document.getElementById('modalTxNotes').value;

    if (!desc || !amount || Number(amount) <= 0) {
      showToast('Por favor, informe uma descrição e um valor válido.', 'danger');
      return;
    }

    addTransaction({
      type,
      description: desc,
      amount,
      date,
      category,
      account,
      paymentMethod,
      recurrence,
      notes
    });

    closeModal('newTransactionModal');
    document.getElementById('globalTransactionForm').reset();
    populateModalFormFields();

    // Notifica tela ativa para re-renderizar
    window.dispatchEvent(new CustomEvent('saldocerto:transactionSaved'));
  };

  return {
    getState: () => state,
    loadData,
    saveData,
    formatCurrency,
    formatPercent,
    formatDate,
    calculateBalance,
    calculateIncome,
    calculateExpenses,
    calculateInvestments,
    calculateInvestedPrincipal,
    calculateNetWorth,
    calculateTotalAssets,
    calculateTotalLiabilities,
    getTransactionsForSelectedPeriod,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    deleteAccount,
    transferBetweenAccounts,
    addGoal,
    contributeToGoal,
    addInvestment,
    showToast,
    confirmAction,
    openModal,
    closeModal,
    initShell,
    initTheme,
    toggleTheme,
    setModalTxType,
    handleSaveTransaction,
    CATEGORIES
  };
})();
