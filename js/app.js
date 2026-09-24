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
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed
        return y === state.selectedYear && m === state.selectedMonth;
      }
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
      // Reverte o saldo da conta correspondente
      if (tx.account) {
        const acc = state.accounts.find(a => a.name === tx.account);
        if (acc) {
          if (tx.type === 'income') {
            acc.balance -= tx.amount;
          } else if (tx.type === 'expense') {
            acc.balance += tx.amount;
          }
        }
      }
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

    window.dispatchEvent(new CustomEvent('saldocerto:themeChanged', { detail: { theme } }));
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
      sidebar.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
        });
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

    // Modo Privacidade
    initPrivacy();

    // Central de Notificações
    initNotificationDrawer();

    // Command Palette (Ctrl+K)
    initCommandPalette();

    // Registro do PWA
    initPWA();

    // Injeção do Modal de Nova Transação Compartilhado
    initTransactionModal();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // --- Modo Privacidade (Olho Mágico) ---
  const PRIVACY_KEY = 'saldocerto_privacy';

  const initPrivacy = () => {
    const isPrivate = localStorage.getItem(PRIVACY_KEY) === 'true';
    if (isPrivate) {
      document.body.classList.add('privacy-active');
    }

    // Procura botões de privacidade existentes ou injeta no header
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('.privacy-toggle-btn')) {
      const btn = document.createElement('button');
      btn.className = 'btn-icon privacy-toggle-btn';
      btn.setAttribute('aria-label', 'Alternar modo privacidade');
      btn.setAttribute('title', 'Modo Privacidade (Ocultar valores)');
      btn.innerHTML = `<i data-lucide="${isPrivate ? 'eye-off' : 'eye'}"></i>`;
      btn.addEventListener('click', togglePrivacy);
      
      // Insere antes do botão de tema ou notificação
      headerRight.insertBefore(btn, headerRight.firstChild);
      if (window.lucide) window.lucide.createIcons();
    }
  };

  const togglePrivacy = () => {
    const isNowActive = document.body.classList.toggle('privacy-active');
    localStorage.setItem(PRIVACY_KEY, isNowActive);

    document.querySelectorAll('.privacy-toggle-btn').forEach(btn => {
      btn.innerHTML = `<i data-lucide="${isNowActive ? 'eye-off' : 'eye'}"></i>`;
    });
    if (window.lucide) window.lucide.createIcons();

    showToast(isNowActive ? 'Modo privacidade ativado (valores ocultos).' : 'Modo privacidade desativado.', 'info');
  };

  // --- Central de Notificações Inteligente ---
  const initNotificationDrawer = () => {
    if (document.getElementById('notificationDrawerOverlay')) return;

    const drawerHtml = `
      <div id="notificationDrawerOverlay" class="notification-drawer-overlay">
        <div class="notification-drawer">
          <div class="drawer-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="bell" class="text-primary"></i>
              <h3 style="font-size: var(--font-size-base); font-weight: 700;">Notificações & Alertas</h3>
            </div>
            <button class="modal-close" onclick="SaldoCerto.closeNotificationDrawer()">
              <i data-lucide="x"></i>
            </button>
          </div>

          <div style="padding: var(--space-2) var(--space-6); background: var(--color-bg-subtle); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-xs);">
            <span id="unreadCountBadge" style="font-weight: 600; color: var(--color-text-muted);">4 alertas recentes</span>
            <button onclick="SaldoCerto.markAllNotificationsRead()" style="color: var(--color-primary); font-weight: 600; background: none; border: none; cursor: pointer;">
              Marcar como lidas
            </button>
          </div>

          <div id="notificationDrawerBody" class="drawer-body">
            <!-- Itens de notificação inseridos dinamicamente -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHtml);

    // Conecta botões de notificação do header
    document.querySelectorAll('.notification-btn').forEach(btn => {
      btn.addEventListener('click', openNotificationDrawer);
    });
  };

  const openNotificationDrawer = () => {
    const overlay = document.getElementById('notificationDrawerOverlay');
    if (!overlay) return;

    if (window.NotificacoesModule) {
      window.NotificacoesModule.renderNotificationDrawer();
    } else {
      renderNotificationItems();
    }
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  };

  const closeNotificationDrawer = () => {
    const overlay = document.getElementById('notificationDrawerOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  const renderNotificationItems = () => {
    if (window.NotificacoesModule) {
      window.NotificacoesModule.renderNotificationDrawer();
      return;
    }
    const body = document.getElementById('notificationDrawerBody');
    if (!body) return;

    const cards = state.creditCards || [];
    const goals = state.goals || [];
    const items = [];

    // Alerta de faturas de cartão
    cards.forEach(c => {
      items.push({
        type: 'warning',
        icon: 'credit-card',
        color: '#D97706',
        title: `Fatura ${c.brand}`,
        desc: `Vence dia ${c.dueDay} deste mês. Limite utilizado: ${formatCurrency(c.limit * 0.36)}.`,
        time: 'Hoje, às 09:00'
      });
    });

    // Alerta de metas
    goals.forEach(g => {
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
      if (pct >= 50) {
        items.push({
          type: 'success',
          icon: 'target',
          color: '#16A34A',
          title: `Meta ${g.name}`,
          desc: `Você já alcançou ${pct}% do objetivo planejado (${formatCurrency(g.currentAmount)})!`,
          time: 'Ontem'
        });
      }
    });

    // Dica de economia
    items.push({
      type: 'info',
      icon: 'sparkles',
      color: '#2563EB',
      title: 'Dica Inteligente SaldoCerto',
      desc: 'Sua taxa de economia está positiva este mês. Mantenha os aportes consistentes!',
      time: 'Há 2 dias'
    });

    body.innerHTML = items.map(it => `
      <div class="drawer-item">
        <div class="drawer-item-icon" style="background: ${it.color}15; color: ${it.color};">
          <i data-lucide="${it.icon}"></i>
        </div>
        <div class="drawer-item-content">
          <h5>${it.title}</h5>
          <p>${it.desc}</p>
          <span class="time">${it.time}</span>
        </div>
      </div>
    `).join('');
  };

  const markAllNotificationsRead = () => {
    if (window.NotificacoesModule) {
      window.NotificacoesModule.markAllAsRead();
      return;
    }
    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = 'none';
    const badge = document.getElementById('unreadCountBadge');
    if (badge) badge.textContent = 'Todas as notificações lidas';
    showToast('Notificações marcadas como lidas.', 'info');
  };

  // --- Command Palette (Ctrl+K) ---
  const initCommandPalette = () => {
    if (document.getElementById('commandPaletteModal')) return;

    const paletteHtml = `
      <div id="commandPaletteModal" class="modal-overlay">
        <div class="modal-dialog" style="max-width: 580px; margin-top: 10vh;">
          <div style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: var(--space-3);">
            <i data-lucide="search" style="color: var(--color-text-muted); width: 20px; height: 20px;"></i>
            <input type="text" id="commandPaletteInput" placeholder="Digite para navegar ou executar ação... (ex: receitas, nova, modo escuro)" 
                   style="border: none; outline: none; background: transparent; width: 100%; font-size: var(--font-size-base); color: var(--color-text);" autocomplete="off">
            <span style="font-size: 11px; background: var(--color-bg-subtle); padding: 2px 6px; border-radius: 4px; color: var(--color-text-muted); border: 1px solid var(--color-border);">ESC</span>
          </div>

          <div id="commandPaletteList" style="max-height: 340px; overflow-y: auto; padding: var(--space-2) var(--space-3);">
            <!-- Itens de comando -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', paletteHtml);

    // Atalho global Ctrl+K ou Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') {
        closeModal('commandPaletteModal');
      }
    });

    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.addEventListener('input', (e) => filterCommandPalette(e.target.value));
      input.addEventListener('keydown', (e) => {
        const list = window._currentPaletteList || COMMANDS;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          window._paletteIndex = ((window._paletteIndex || 0) + 1) % list.length;
          highlightPaletteIndex(window._paletteIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          window._paletteIndex = ((window._paletteIndex || 0) - 1 + list.length) % list.length;
          highlightPaletteIndex(window._paletteIndex);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeCommand(window._paletteIndex || 0);
        }
      });
    }
  };

  const highlightPaletteIndex = (idx) => {
    const items = document.querySelectorAll('.command-palette-item');
    items.forEach((item, i) => {
      if (i === idx) {
        item.style.backgroundColor = 'var(--color-bg-subtle)';
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.style.backgroundColor = 'transparent';
      }
    });
  };

  const COMMANDS = [
    { title: 'Ir para Dashboard', icon: 'layout-dashboard', action: () => window.location.href = 'dashboard.html' },
    { title: 'Ir para Receitas', icon: 'arrow-down-circle', action: () => window.location.href = 'receitas.html' },
    { title: 'Ir para Despesas', icon: 'arrow-up-circle', action: () => window.location.href = 'despesas.html' },
    { title: 'Ir para Cartões', icon: 'credit-card', action: () => window.location.href = 'cartoes.html' },
    { title: 'Ir para Contas', icon: 'landmark', action: () => window.location.href = 'contas.html' },
    { title: 'Ir para Metas', icon: 'target', action: () => window.location.href = 'metas.html' },
    { title: 'Ir para Investimentos', icon: 'trending-up', action: () => window.location.href = 'investimentos.html' },
    { title: 'Ir para Patrimônio', icon: 'pie-chart', action: () => window.location.href = 'patrimonio.html' },
    { title: 'Abrir Relatórios', icon: 'file-bar-chart', action: () => window.location.href = 'relatorios.html' },
    { title: 'Simulador de Juros Compostos', icon: 'sparkles', action: () => window.location.href = 'simulador.html' },
    { title: 'Importar Extrato OFX / CSV', icon: 'upload', action: () => window.location.href = 'importar.html' },
    { title: 'Nova transação', icon: 'plus-circle', action: () => { closeModal('commandPaletteModal'); openModal('newTransactionModal'); } },
    { title: 'Nova receita', icon: 'plus', action: () => { closeModal('commandPaletteModal'); window.location.href = 'receitas.html?action=new'; } },
    { title: 'Nova despesa', icon: 'minus', action: () => { closeModal('commandPaletteModal'); window.location.href = 'despesas.html?action=new'; } },
    { title: 'Pesquisar movimentação', icon: 'search', action: () => { closeModal('commandPaletteModal'); const s = document.querySelector('input[type="search"], input[placeholder*="Buscar"]'); if (s) s.focus(); else window.location.href = 'dashboard.html#transacoes'; } },
    { title: 'Abrir configurações', icon: 'settings', action: () => window.location.href = 'configuracoes.html' },
    { title: 'Alternar Modo Privacidade (Olho Mágico)', icon: 'eye', action: () => { closeModal('commandPaletteModal'); togglePrivacy(); } },
    { title: 'Alternar Tema Claro / Escuro', icon: 'moon', action: () => { closeModal('commandPaletteModal'); toggleTheme(); } }
  ];

  const openCommandPalette = () => {
    openModal('commandPaletteModal');
    window._paletteIndex = 0;
    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    renderCommandList(COMMANDS);
  };

  const filterCommandPalette = (query) => {
    const q = (query || '').toLowerCase().trim();
    const filtered = COMMANDS.filter(c => c.title.toLowerCase().includes(q));
    window._paletteIndex = 0;
    renderCommandList(filtered);
  };

  const renderCommandList = (list) => {
    const container = document.getElementById('commandPaletteList');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 13px;">Nenhum comando encontrado.</div>`;
      return;
    }

    container.innerHTML = list.map((c, i) => `
      <div class="command-palette-item" style="padding: 10px 14px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background-color var(--transition-fast); background-color: ${i === (window._paletteIndex || 0) ? 'var(--color-bg-subtle)' : 'transparent'};"
           onmouseover="window._paletteIndex = ${i}; this.style.backgroundColor='var(--color-bg-subtle)'" onmouseout="this.style.backgroundColor='transparent'"
           onclick="SaldoCerto.executeCommand(${i})">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i data-lucide="${c.icon}" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
          <span style="font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text);">${c.title}</span>
        </div>
        <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: var(--color-text-muted);"></i>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
    window._currentPaletteList = list;
  };

  const executeCommand = (index) => {
    const list = window._currentPaletteList || COMMANDS;
    if (list[index] && typeof list[index].action === 'function') {
      closeModal('commandPaletteModal');
      list[index].action();
    }
  };

  // --- Registro do PWA Service Worker ---
  const initPWA = () => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('service-worker.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);
        })
        .catch(() => {
          return navigator.serviceWorker.register('sw.js');
        })
        .catch((err) => {
          console.log('PWA Service Worker offline/fallback:', err);
        });
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
                  <input type="number" step="0.01" min="0.01" id="modalTxAmount" class="form-control" placeholder="0,00" required oninput="SaldoCerto.updateInstallmentCalc()">
                  <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-outline btn-sm" style="font-size: 10px; padding: 1px 5px;" onclick="SaldoCerto.adjustTxAmount(50)">+50</button>
                    <button type="button" class="btn btn-outline btn-sm" style="font-size: 10px; padding: 1px 5px;" onclick="SaldoCerto.adjustTxAmount(100)">+100</button>
                    <button type="button" class="btn btn-outline btn-sm" style="font-size: 10px; padding: 1px 5px;" onclick="SaldoCerto.adjustTxAmount(200)">+200</button>
                    <button type="button" class="btn btn-outline btn-sm" style="font-size: 10px; padding: 1px 5px;" onclick="SaldoCerto.adjustTxAmount(500)">+500</button>
                  </div>
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
                  <select id="modalTxPaymentMethod" class="form-select" onchange="SaldoCerto.checkInstallmentTrigger()">
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
                  <select id="modalTxRecurrence" class="form-select" onchange="SaldoCerto.checkInstallmentTrigger()">
                    <option value="Única">Única</option>
                    <option value="Mensal">Fixa / Mensal</option>
                    <option value="Parcelada">Parcelada</option>
                  </select>
                </div>
              </div>

              <!-- Caixa de Parcelamento de Despesa -->
              <div id="modalTxInstallmentsBox" style="display: none; background: var(--color-bg-subtle); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-bottom: var(--space-3);">
                <div class="form-row" style="margin-bottom: 0;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: var(--font-size-xs);">Número de Parcelas</label>
                    <select id="modalTxInstallments" class="form-select" onchange="SaldoCerto.updateInstallmentCalc()">
                      <option value="1">1x (À vista)</option>
                      <option value="2">2x</option>
                      <option value="3">3x</option>
                      <option value="4">4x</option>
                      <option value="5">5x</option>
                      <option value="6">6x</option>
                      <option value="8">8x</option>
                      <option value="10">10x</option>
                      <option value="12">12x</option>
                      <option value="18">18x</option>
                      <option value="24">24x</option>
                      <option value="36">36x</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                    <div id="modalTxInstallmentCalcText" style="font-size: 11px; color: var(--color-primary); font-weight: 700; padding-bottom: 8px;">
                      Total à vista
                    </div>
                  </div>
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

  const adjustTxAmount = (delta) => {
    const inp = document.getElementById('modalTxAmount');
    if (!inp) return;
    const current = parseFloat(inp.value) || 0;
    inp.value = (current + delta).toFixed(2);
    updateInstallmentCalc();
  };

  const checkInstallmentTrigger = () => {
    const payMethod = document.getElementById('modalTxPaymentMethod')?.value;
    const rec = document.getElementById('modalTxRecurrence')?.value;
    const box = document.getElementById('modalTxInstallmentsBox');
    if (box) {
      if (rec === 'Parcelada' || payMethod === 'Cartão de Crédito') {
        box.style.display = 'block';
        updateInstallmentCalc();
      } else {
        box.style.display = 'none';
      }
    }
  };

  const updateInstallmentCalc = () => {
    const amount = parseFloat(document.getElementById('modalTxAmount')?.value) || 0;
    const inst = parseInt(document.getElementById('modalTxInstallments')?.value || '1', 10);
    const textEl = document.getElementById('modalTxInstallmentCalcText');
    if (textEl) {
      if (inst > 1 && amount > 0) {
        const perInst = amount / inst;
        textEl.textContent = `${inst}x de ${formatCurrency(perInst)}`;
      } else if (amount > 0) {
        textEl.textContent = `Total: ${formatCurrency(amount)} (à vista)`;
      } else {
        textEl.textContent = '1x de R$ 0,00';
      }
    }
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const type = document.getElementById('modalTxType').value;
    let desc = document.getElementById('modalTxDesc').value.trim();
    const amount = document.getElementById('modalTxAmount').value;
    const date = document.getElementById('modalTxDate').value;
    const category = document.getElementById('modalTxCategory').value;
    const account = document.getElementById('modalTxAccount').value;
    const paymentMethod = document.getElementById('modalTxPaymentMethod').value;
    const recurrence = document.getElementById('modalTxRecurrence').value;
    const installments = parseInt(document.getElementById('modalTxInstallments')?.value || '1', 10);
    let notes = document.getElementById('modalTxNotes').value.trim();

    if (!desc || !amount || Number(amount) <= 0) {
      showToast('Por favor, informe uma descrição e um valor válido.', 'danger');
      return;
    }

    if (installments > 1) {
      if (!desc.includes('(')) {
        desc = `${desc} (1/${installments})`;
      }
      const perInst = Number(amount) / installments;
      const noteInst = `Compra parcelada em ${installments}x de ${formatCurrency(perInst)}.`;
      notes = notes ? `${notes} • ${noteInst}` : noteInst;
    }

    if (window.SaldoCertoTransactions && window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        await SaldoCertoTransactions.createTransaction({
          type,
          description: desc,
          amount,
          date,
          category,
          account,
          paymentMethod,
          recurrence: installments > 1 ? 'Parcelada' : recurrence,
          notes
        });
      } catch (err) {
        console.warn('Erro ao salvar transação no Supabase, caindo para local:', err);
        addTransaction({
          type,
          description: desc,
          amount,
          date,
          category,
          account,
          paymentMethod,
          recurrence: installments > 1 ? 'Parcelada' : recurrence,
          notes
        });
      }
    } else {
      addTransaction({
        type,
        description: desc,
        amount,
        date,
        category,
        account,
        paymentMethod,
        recurrence: installments > 1 ? 'Parcelada' : recurrence,
        notes
      });
    }

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
    adjustTxAmount,
    checkInstallmentTrigger,
    updateInstallmentCalc,
    togglePrivacy,
    openNotificationDrawer,
    closeNotificationDrawer,
    markAllNotificationsRead,
    openCommandPalette,
    executeCommand,
    CATEGORIES
  };
})();
