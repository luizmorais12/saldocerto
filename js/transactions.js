/**
 * SaldoCerto - Módulo Central de Transações (Supabase PostgreSQL)
 * Funções CRUD para Transações, Receitas e Despesas com proteção RLS.
 */

const SaldoCertoTransactions = (() => {

  /**
   * Busca todas as transações do usuário no Supabase
   * @param {Object} options Filtros opcionais (type, month, year, account_id, category)
   */
  const getTransactions = async (options = {}) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      try {
        const user = await SaldoCertoAuth.getCurrentUser();
        if (!user) return [];

        let query = window.supabaseClient
          .from('transactions')
          .select(`
            *,
            account:accounts(id, name, color)
          `)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (options.type) {
          query = query.eq('type', options.type);
        }
        if (options.accountId) {
          query = query.eq('account_id', options.accountId);
        }
        if (options.category && options.category !== 'all') {
          query = query.eq('category', options.category);
        }

        // Filtro por mês/ano se especificado (month 1-indexed)
        if (options.year && options.month) {
          const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
          // Último dia do mês
          const nextMonth = options.month === 12 ? 1 : options.month + 1;
          const nextYear = options.month === 12 ? options.year + 1 : options.year;
          const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
          query = query.gte('transaction_date', startDate).lt('transaction_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[Transactions Supabase] Erro ao buscar transações:', error);
          return SaldoCerto.getState().transactions;
        }

        // Mapeia para formato do front-end
        const mapped = (data || []).map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          category: t.category,
          account: t.account?.name || 'Conta Padrão',
          accountId: t.account_id,
          date: t.transaction_date,
          paymentMethod: t.payment_method || 'PIX',
          recurrence: t.recurrence_type || (t.is_recurring ? 'Mensal' : 'Única'),
          notes: t.notes || ''
        }));

        // Atualiza estado local se carregando tudo ou sincronizando
        if (!options.type && !options.category) {
          SaldoCerto.getState().transactions = mapped;
        }

        return mapped;
      } catch (err) {
        console.error('[Transactions Supabase] Exceção em getTransactions:', err);
        return SaldoCerto.getState().transactions;
      }
    }

    // Fallback local se Supabase não configurado
    let txs = SaldoCerto.getState().transactions;
    if (options.type) {
      txs = txs.filter(t => t.type === options.type);
    }
    return txs;
  };

  /**
   * Busca uma única transação pelo ID
   * @param {string} id
   */
  const getTransaction = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const { data, error } = await window.supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[Transactions Supabase] Erro ao buscar transação:', error);
        return null;
      }
      return data;
    }
    return SaldoCerto.getState().transactions.find(t => t.id === id) || null;
  };

  /**
   * Cria uma nova transação (receita ou despesa)
   * @param {Object} txData
   */
  const createTransaction = async (txData) => {
    const amountNum = parseFloat(txData.amount) || 0;

    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Resolve account_id a partir do nome da conta se necessário
      let accId = txData.accountId || null;
      if (!accId && txData.account) {
        const stateAcc = SaldoCerto.getState().accounts.find(a => a.name === txData.account);
        if (stateAcc) accId = stateAcc.id;
      }

      const payload = {
        user_id: user.id,
        account_id: accId,
        credit_card_id: txData.creditCardId || null,
        type: txData.type,
        description: txData.description.trim(),
        amount: amountNum,
        category: txData.category || 'Outros',
        payment_method: txData.paymentMethod || 'PIX',
        transaction_date: txData.date || new Date().toISOString().split('T')[0],
        notes: txData.notes || '',
        is_recurring: txData.recurrence && txData.recurrence !== 'Única',
        recurrence_type: txData.recurrence || 'Única'
      };

      const { data, error } = await window.supabaseClient
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Transactions Supabase] Erro ao criar transação:', error);
        throw error;
      }

      // Ajusta o saldo da conta no Supabase se houver conta associada
      if (accId) {
        const delta = txData.type === 'income' ? amountNum : -amountNum;
        const currentAcc = SaldoCerto.getState().accounts.find(a => a.id === accId);
        if (currentAcc) {
          const newBal = (currentAcc.balance || 0) + delta;
          await window.supabaseClient
            .from('accounts')
            .update({ current_balance: newBal })
            .eq('id', accId);
          currentAcc.balance = newBal;
        }
      }

      const created = {
        id: data.id,
        type: data.type,
        description: data.description,
        amount: Number(data.amount),
        category: data.category,
        account: txData.account || 'Conta Padrão',
        accountId: data.account_id,
        date: data.transaction_date,
        paymentMethod: data.payment_method,
        recurrence: data.recurrence_type,
        notes: data.notes
      };

      SaldoCerto.getState().transactions.unshift(created);
      SaldoCerto.showToast(`Transação "${created.description}" adicionada!`, 'success');
      return created;
    } else {
      return SaldoCerto.addTransaction(txData);
    }
  };

  /**
   * Atualiza uma transação existente
   * @param {string} id
   * @param {Object} updates
   */
  const updateTransaction = async (id, updates) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const payload = {};
      if (updates.description) payload.description = updates.description.trim();
      if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount);
      if (updates.category) payload.category = updates.category;
      if (updates.date) payload.transaction_date = updates.date;
      if (updates.paymentMethod) payload.payment_method = updates.paymentMethod;
      if (updates.recurrence) {
        payload.recurrence_type = updates.recurrence;
        payload.is_recurring = updates.recurrence !== 'Única';
      }
      if (updates.notes !== undefined) payload.notes = updates.notes;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await window.supabaseClient
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[Transactions Supabase] Erro ao atualizar:', error);
        throw error;
      }

      const idx = SaldoCerto.getState().transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        SaldoCerto.getState().transactions[idx] = {
          ...SaldoCerto.getState().transactions[idx],
          ...updates
        };
      }
      SaldoCerto.showToast('Transação atualizada com sucesso.', 'success');
      return data;
    } else {
      return SaldoCerto.updateTransaction(id, updates);
    }
  };

  /**
   * Exclui uma transação
   * @param {string} id
   */
  const deleteTransaction = async (id) => {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured()) {
      const user = await SaldoCertoAuth.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Busca transação antes para reverter saldo se necessário
      const tx = await getTransaction(id);

      const { error } = await window.supabaseClient
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Transactions Supabase] Erro ao deletar:', error);
        throw error;
      }

      if (tx && tx.account_id) {
        const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
        const currentAcc = SaldoCerto.getState().accounts.find(a => a.id === tx.account_id);
        if (currentAcc) {
          const newBal = (currentAcc.balance || 0) + delta;
          await window.supabaseClient
            .from('accounts')
            .update({ current_balance: newBal })
            .eq('id', tx.account_id);
          currentAcc.balance = newBal;
        }
      }

      SaldoCerto.getState().transactions = SaldoCerto.getState().transactions.filter(t => t.id !== id);
      SaldoCerto.showToast('Transação removida com sucesso.', 'info');
      return true;
    } else {
      return SaldoCerto.deleteTransaction(id);
    }
  };

  // --- Helpers Específicos para Receitas (Income) ---
  const getIncome = async (options = {}) => getTransactions({ ...options, type: 'income' });
  const createIncome = async (data) => createTransaction({ ...data, type: 'income' });
  const updateIncome = async (id, data) => updateTransaction(id, data);
  const deleteIncome = async (id) => deleteTransaction(id);

  // --- Helpers Específicos para Despesas (Expenses) ---
  const getExpenses = async (options = {}) => getTransactions({ ...options, type: 'expense' });
  const createExpense = async (data) => createTransaction({ ...data, type: 'expense' });
  const updateExpense = async (id, data) => updateTransaction(id, data);
  const deleteExpense = async (id) => deleteTransaction(id);

  return {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getIncome,
    createIncome,
    updateIncome,
    deleteIncome,
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense
  };
})();

// Expõe globalmente
window.SaldoCertoTransactions = SaldoCertoTransactions;
