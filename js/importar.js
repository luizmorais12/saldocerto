/**
 * SaldoCerto - Módulo de Importação de Extratos Bancários (OFX e CSV)
 */

const ImportarModule = (() => {
  let parsedTransactions = [];

  const init = () => {
    SaldoCerto.initShell('importar');
    setupDropzone();
    populateAccountsSelect();
  };

  const populateAccountsSelect = () => {
    const select = document.getElementById('importTargetAccount');
    if (!select) return;
    const state = SaldoCerto.getState();
    select.innerHTML = state.accounts.map(a => `<option value="${a.name}">${a.name} (${SaldoCerto.formatCurrency(a.balance)})</option>`).join('');
  };

  const setupDropzone = () => {
    const dropzone = document.getElementById('dropzoneBox');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.ofx')) {
        parseOFX(content);
      } else {
        parseCSV(content);
      }
    };
    reader.readAsText(file);
  };

  /**
   * Parser robusto para arquivos de extrato OFX (padrão bancário brasileiro)
   */
  const parseOFX = (content) => {
    const txMatches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
    
    if (txMatches.length === 0) {
      SaldoCerto.showToast('Nenhum lançamento identificado no arquivo OFX.', 'warning');
      return;
    }

    parsedTransactions = txMatches.map((block, index) => {
      const typeMatch = block.match(/<TRNTYPE>(.*?)(\r|\n|<)/i);
      const dateMatch = block.match(/<DTPOSTED>(\d{8})/i);
      const amountMatch = block.match(/<TRNAMT>([\s\S]*?)(\r|\n|<)/i);
      const memoMatch = block.match(/<(MEMO|NAME)>([\s\S]*?)(\r|\n|<)/i);

      let date = new Date().toISOString().split('T')[0];
      if (dateMatch && dateMatch[1]) {
        const raw = dateMatch[1];
        date = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
      }

      const rawAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
      const isExpense = rawAmount < 0;
      const amount = Math.abs(rawAmount);

      const description = memoMatch ? memoMatch[2].trim() : 'Lançamento bancário';
      const category = suggestCategory(description, isExpense);

      return {
        id: `import-${index}`,
        selected: true,
        type: isExpense ? 'expense' : 'income',
        date: date,
        description: description,
        category: category,
        amount: amount
      };
    });

    renderPreview();
  };

  /**
   * Parser para arquivos de extrato CSV
   */
  const parseCSV = (content) => {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      SaldoCerto.showToast('Arquivo CSV vazio ou sem dados suficientes.', 'warning');
      return;
    }

    // Detecta separador (; ou ,)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    parsedTransactions = [];

    // Pula o cabeçalho
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.replace(/"/g, '').trim());
      if (cols.length >= 3) {
        let date = cols[0];
        // Converte DD/MM/AAAA para AAAA-MM-DD
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }

        const description = cols[1];
        let rawVal = cols[2].replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
        let amount = parseFloat(rawVal) || 0;

        const isExpense = amount < 0 || cols[3]?.toLowerCase().includes('débito') || cols[3]?.toLowerCase().includes('saída');
        amount = Math.abs(amount);

        parsedTransactions.push({
          id: `import-${i}`,
          selected: true,
          type: isExpense ? 'expense' : 'income',
          date: date,
          description: description || 'Movimentação',
          category: suggestCategory(description, isExpense),
          amount: amount
        });
      }
    }

    renderPreview();
  };

  /**
   * Categorização inteligente baseada em palavras-chave bancárias
   */
  const suggestCategory = (desc, isExpense) => {
    const d = (desc || '').toLowerCase();

    if (!isExpense) {
      if (d.includes('salario') || d.includes('remun') || d.includes('folha')) return 'Salário';
      if (d.includes('div') || d.includes('rendimento') || d.includes('juros') || d.includes('jcp')) return 'Investimentos';
      if (d.includes('freela') || d.includes('prestacao')) return 'Freelance';
      if (d.includes('venda')) return 'Vendas';
      return 'Outros';
    }

    if (d.includes('uber') || d.includes('99') || d.includes('posto') || d.includes('combustivel') || d.includes('gasolina') || d.includes('estac')) return 'Transporte';
    if (d.includes('mercado') || d.includes('super') || d.includes('padaria') || d.includes('ifood') || d.includes('restaurante') || d.includes('burger') || d.includes('cafe')) return 'Alimentação';
    if (d.includes('aluguel') || d.includes('condominio') || d.includes('luz') || d.includes('energia') || d.includes('agua') || d.includes('gas') || d.includes('fibra') || d.includes('internet')) return 'Moradia';
    if (d.includes('netflix') || d.includes('spotify') || d.includes('prime') || d.includes('apple') || d.includes('youtube') || d.includes('disney')) return 'Assinaturas';
    if (d.includes('farmacia') || d.includes('droga') || d.includes('medico') || d.includes('hospital') || d.includes('consulta') || d.includes('saude')) return 'Saúde';
    if (d.includes('escola') || d.includes('curso') || d.includes('faculdade') || d.includes('livraria') || d.includes('udemy')) return 'Educação';
    if (d.includes('cinema') || d.includes('show') || d.includes('viagem') || d.includes('steam') || d.includes('ingressos')) return 'Lazer';

    return 'Outros';
  };

  const renderPreview = () => {
    const previewCard = document.getElementById('previewCard');
    const optionsCard = document.getElementById('importOptionsCard');
    const tbody = document.getElementById('previewTableBody');

    if (!previewCard || !optionsCard || !tbody) return;

    optionsCard.style.display = 'block';
    previewCard.style.display = 'block';

    document.getElementById('detectedCountBadge').textContent = `${parsedTransactions.length} lançamentos detectados`;
    updateSelectedCount();

    tbody.innerHTML = parsedTransactions.map((tx, idx) => {
      const isExpense = tx.type === 'expense';
      return `
        <tr>
          <td>
            <input type="checkbox" ${tx.selected ? 'checked' : ''} onchange="ImportarModule.toggleItem(${idx}, this.checked)">
          </td>
          <td><strong>${SaldoCerto.formatDate(tx.date)}</strong></td>
          <td>
            <span class="badge ${isExpense ? 'badge-danger' : 'badge-success'}">
              ${isExpense ? 'Despesa' : 'Receita'}
            </span>
          </td>
          <td>${tx.description}</td>
          <td>
            <select class="form-select" style="padding: 2px 6px; font-size: 11px; max-width: 140px;" onchange="ImportarModule.changeCategory(${idx}, this.value)">
              <option value="${tx.category}" selected>${tx.category}</option>
              <option value="Moradia">Moradia</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Transporte">Transporte</option>
              <option value="Lazer">Lazer</option>
              <option value="Saúde">Saúde</option>
              <option value="Educação">Educação</option>
              <option value="Assinaturas">Assinaturas</option>
              <option value="Salário">Salário</option>
              <option value="Freelance">Freelance</option>
              <option value="Investimentos">Investimentos</option>
              <option value="Outros">Outros</option>
            </select>
          </td>
          <td style="color: ${isExpense ? 'var(--color-danger)' : 'var(--color-success)'}; font-weight: 700;">
            ${isExpense ? '-' : '+'} ${SaldoCerto.formatCurrency(tx.amount)}
          </td>
        </tr>
      `;
    }).join('');
  };

  const toggleItem = (index, isChecked) => {
    if (parsedTransactions[index]) {
      parsedTransactions[index].selected = isChecked;
      updateSelectedCount();
    }
  };

  const toggleSelectAll = (el) => {
    const isChecked = el.checked;
    parsedTransactions.forEach(t => t.selected = isChecked);
    renderPreview();
  };

  const changeCategory = (index, newCat) => {
    if (parsedTransactions[index]) {
      parsedTransactions[index].category = newCat;
    }
  };

  const updateSelectedCount = () => {
    const selected = parsedTransactions.filter(t => t.selected).length;
    const label = document.getElementById('selectedCountLabel');
    if (label) label.textContent = selected;
  };

  const confirmImport = () => {
    const toImport = parsedTransactions.filter(t => t.selected);
    const accountName = document.getElementById('importTargetAccount').value;

    if (toImport.length === 0) {
      SaldoCerto.showToast('Nenhuma transação selecionada para importação.', 'warning');
      return;
    }

    toImport.forEach(item => {
      SaldoCerto.addTransaction({
        type: item.type,
        description: item.description,
        amount: item.amount,
        date: item.date,
        category: item.category,
        account: accountName,
        paymentMethod: 'Extrato Importado',
        recurrence: 'Única',
        notes: 'Importado via extrato OFX/CSV'
      });
    });

    SaldoCerto.showToast(`🎉 ${toImport.length} transações importadas com sucesso para ${accountName}!`, 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
  };

  return {
    init,
    handleFileSelect,
    toggleItem,
    toggleSelectAll,
    changeCategory,
    confirmImport
  };
})();

document.addEventListener('DOMContentLoaded', ImportarModule.init);
