# SaldoCerto 💰

> **Seu dinheiro no controle.**  
> Aplicação Web de Gestão Financeira Pessoal completa, moderna, multiusuário e segura, integrada ao **Supabase (PostgreSQL, Auth e Row Level Security - RLS)** com front-end em HTML5, CSS3 e JavaScript Vanilla.

---

## 🚀 1. Tecnologias

- **Front-end**:
  - **HTML5 Semântico**: Estrutura acessível, formulários validados e PWA.
  - **CSS3 Moderno**: Custom Properties, Dark Mode nativo, Glassmorphism e estilos de impressão `@media print`.
  - **JavaScript Vanilla (ES6+)**: Modular, orientado a eventos, sem dependência de frameworks.
  - **Supabase JS Client v2**: `@supabase/supabase-js@2` via CDN oficial.
  - **Chart.js (v4+)**: Gráficos de barras de fluxo de caixa e rosca de despesas por categoria.
  - **Lucide Icons**: Iconografia moderna e consistente.
  - **Google Fonts**: Tipografia refinada com a família *Inter*.
- **Back-end & Banco de Dados**:
  - **Supabase**: Backend-as-a-Service escalável.
  - **PostgreSQL 15+**: Tabelas relacionais com chaves estrangeiras e integridade referencial.
  - **Supabase Auth**: Autenticação segura por e-mail e senha com JWT.
  - **Row Level Security (RLS)**: Isolamento criptográfico de dados por usuário (`auth.uid() = user_id`).
  - **Triggers PL/pgSQL**: Atualização automática de `updated_at` e criação automática de registros em `profiles`.

---

## 📁 2. Estrutura do Projeto

```text
saldocerto/
│
├── index.html                  # Landing page de apresentação e conversão
├── login.html                  # Tela de autenticação com e-mail e senha
├── cadastro.html               # Criação de conta multiusuário
├── recuperar-senha.html        # Solicitação e redefinição de senha
├── onboarding.html             # Questionário financeiro inicial (7 etapas)
│
├── dashboard.html              # Painel consolidado com métricas em tempo real
├── receitas.html               # Gestão e filtros de entradas financeiras
├── despesas.html               # Gestão e categorização de saídas
├── cartoes.html                # Gestão de cartões, limites e parcelamentos
├── contas.html                 # Contas bancárias, carteiras e transferências
├── metas.html                  # Metas de economia com percentuais automáticos
├── investimentos.html          # Carteira de ativos, rendimento e rentabilidade
├── patrimonio.html             # Balanço de Ativos, Passivos e Patrimônio Líquido
├── orcamentos.html             # Orçamentos por categoria e Regra 50/30/20
├── simulador.html              # Simulador de Juros Compostos & Rumo ao Milhão
├── importar.html               # Importador no navegador de extratos OFX / CSV
├── relatorios.html             # Relatórios analíticos e demonstrativo para impressão
├── configuracoes.html          # Perfil, preferências, tema e segurança
│
├── css/
│   ├── style.css               # Design system global, variáveis e layout
│   ├── dashboard.css           # Estilos específicos do painel e tabelas
│   ├── auth.css                # Estilos refinados das páginas de autenticação
│   └── responsive.css          # Adaptações mobile-first e responsividade
│
├── js/
│   ├── supabase.js             # Inicialização do cliente Supabase e credenciais
│   ├── auth.js                 # Camada de autenticação e proteção de sessão
│   ├── profile.js              # Gerenciamento de perfil e onboarding
│   ├── transactions.js         # CRUD de transações com Supabase e RLS
│   ├── receitas.js             # Lógica da tela de receitas
│   ├── despesas.js             # Lógica da tela de despesas
│   ├── cartoes.js              # Lógica de cartões e faturas
│   ├── contas.js               # Lógica de contas e transferências
│   ├── metas.js                # Lógica de metas e aportes
│   ├── investimentos.js        # Lógica de investimentos e rendimentos
│   ├── patrimonio.js           # Lógica de patrimônio líquido
│   ├── orcamentos.js           # Orçamentos mensais e regra 50/30/20
│   ├── notificacoes.js         # Gatilhos automáticos de alertas no sino
│   ├── simulador.js            # Lógica matemática de juros compostos
│   ├── importador.js           # Parser de arquivos OFX e CSV no navegador
│   ├── relatorios.js           # Filtros de relatórios e impressão PDF
│   ├── configuracoes.js        # Configurações de perfil e sincronização
│   ├── command-palette.js      # Quick Actions (Ctrl+K / Cmd+K)
│   └── app.js                  # Shell da aplicação, tema e modais globais
│
├── assets/
│   ├── logo.svg                # Logotipo vetorial do SaldoCerto
│   └── icon.svg                # Ícone do aplicativo para PWA
│
├── manifest.json               # Manifesto do aplicativo PWA
├── service-worker.js           # Service Worker para cache e suporte offline
├── sw.js                       # Compatibilidade com Service Worker
│
└── supabase/
    ├── schema.sql              # Script SQL unificado (Tabelas, RLS, Triggers)
    ├── seed.sql                # Seed de dados padrão (Categorias)
    └── migrations/
        ├── 20260924000001_initial_tables.sql
        └── 20260924000002_rls_policies.sql
```

---

## ⚙️ 3. Como Configurar o Supabase Passo a Passo

### 3.1. Criar o Projeto no Supabase

1. Acesse o painel do [Supabase](https://supabase.com) e faça login.
2. Clique no botão **"New Project"**.
3. Escolha a sua organização, defina um nome para o projeto (ex: `saldocerto-prod`) e crie uma senha segura para o banco PostgreSQL.
4. Escolha a região mais próxima (ex: *São Paulo (sa-east-1)*).
5. Clique em **"Create new project"** e aguarde a inicialização (cerca de 1 a 2 minutos).

---

### 3.2. Executar o Script SQL do Banco (`supabase/schema.sql`)

1. No menu lateral esquerdo do Dashboard do Supabase, clique em **"SQL Editor"** (ícone de terminal `>_`).
2. Clique em **"New query"** (ou `+`).
3. Abra o arquivo [`supabase/schema.sql`](file:///c:/Users/Luiz/Desktop/saldocerto/supabase/schema.sql) deste repositório, copie todo o conteúdo e cole no editor do Supabase.
4. Clique no botão **"Run"** (ou aperte `Ctrl + Enter`).
5. Você verá a mensagem **"Success. No rows returned"**.
6. Para carregar as categorias padrão, abra o arquivo [`supabase/seed.sql`](file:///c:/Users/Luiz/Desktop/saldocerto/supabase/seed.sql), cole no SQL Editor e execute.

---

### 3.3. Configurar a Autenticação (Supabase Auth)

1. No menu lateral esquerdo, clique em **"Authentication"** (ícone de cadeado) e depois em **"Providers"**.
2. Garanta que o provedor **Email** está habilitado (**Enabled**).
3. Caso queira permitir acesso imediato sem necessidade de clicar em link de confirmação de e-mail em ambiente de testes:
   - Em **Authentication** > **Providers** > **Email**, desmarque a opção **"Confirm email"** e clique em **Save**.
4. Em **Authentication** > **URL Configuration**:
   - **Site URL**: Defina a URL base da sua aplicação:
     - Local: `http://localhost:3000` ou `http://localhost:5500` ou `http://127.0.0.1:5500`
     - Produção: `https://seusite.com`
   - **Redirect URLs**: Adicione:
     - `http://localhost:3000/**`
     - `http://127.0.0.1:5500/**`
     - `http://localhost:5500/**`
     - `https://seusite.com/**`
     - `https://seusite.com/recuperar-senha.html`
     - `https://seusite.com/dashboard.html`

---

### 3.4. Obter as Chaves Públicas

1. No menu lateral esquerdo do Supabase, clique em **"Project Settings"** (ícone de engrenagem) e selecione **"API"**.
2. Localize a seção **Project API keys**:
   - Copie o valor de **Project URL** (ex: `https://xyzcompany.supabase.co`).
   - Copie o valor da chave **`anon` / `public`** (ex: `eyJhbGciOi...`).
   - ⚠️ **NUNCA copie ou exponha a chave `service_role` no front-end**.

---

### 3.5. Configurar o Front-end (`js/supabase.js`)

Abra o arquivo [`js/supabase.js`](file:///c:/Users/Luiz/Desktop/saldocerto/js/supabase.js) e insira suas credenciais:

```javascript
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'SUA_CHAVE_PUBLICA_ANON';
```

---

## 💻 4. Como Executar Localmente

Como o SaldoCerto utiliza HTML, CSS e JavaScript puros, você pode executá-lo com qualquer servidor web estático:

### Opção A: Com Node.js / npx (Recomendado)
```bash
npx serve .
# ou
npx http-server -p 3000
```
Abra o navegador em `http://localhost:3000`.

### Opção B: Com Python
```bash
python -m http.server 3000
```
Abra o navegador em `http://localhost:3000`.

### Opção C: Com VS Code / Cursor / IDE
Instale a extensão **Live Server** e clique com o botão direito no `index.html` > **"Open with Live Server"**.

---

## 🔒 5. Segurança & Políticas de Row Level Security (RLS)

Todos os dados financeiros do SaldoCerto são estritamente isolados por usuário no nível do PostgreSQL. Não dependemos de filtros de tela no JavaScript para proteção.

Todas as tabelas possuem:
```sql
ALTER TABLE public.tabela ENABLE ROW LEVEL SECURITY;
```

E políticas para `SELECT`, `INSERT`, `UPDATE` e `DELETE`:
```sql
-- Exemplo na tabela transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

---

## 🧪 6. Roteiro de Teste Multiusuário Obrigatório (Seção 56 e 67)

Para validar a integridade de dados e isolamento entre usuários:

1. **Cadastrar Usuário A**:
   - Abra `cadastro.html` e crie a conta de `usuarioA@teste.com`.
   - Conclua o onboarding inicial.
   - Crie uma conta bancária (ex: *Nubank - Saldo R$ 3.500,00*).
   - Lance uma receita (ex: *Salário R$ 5.000,00*) e uma despesa (ex: *Aluguel R$ 1.800,00*).
   - Cadastre uma meta (ex: *Reserva de Emergência - R$ 10.000,00*).
   - Acesse **Configurações** e clique em **Sair do Sistema**.

2. **Cadastrar Usuário B**:
   - Abra `cadastro.html` e cadastre `usuarioB@teste.com`.
   - Conclua o onboarding.
   - **Verificação**: O dashboard do Usuário B iniciará zerado, sem nenhuma conta, movimentação ou meta do Usuário A.
   - Cadastre dados específicos para o Usuário B (ex: *Itaú - Saldo R$ 800,00*).
   - Faça logout.

3. **Retornar ao Usuário A**:
   - Faça login com `usuarioA@teste.com`.
   - **Verificação**: Todos os dados do Usuário A permanecem intactos, sem nenhuma contaminação pelos dados do Usuário B.

---

## 📱 7. Progressive Web App (PWA)

O SaldoCerto está preparado para instalação direta como aplicativo em smartphones Android, iOS e computadores desktop (Chrome/Edge):

- Possui manifesto PWA oficial em `manifest.json`.
- Ícones vetoriais responsivos e maskable em `assets/icon.svg` e `assets/logo.svg`.
- `service-worker.js` com estratégia *stale-while-revalidate* para ativos locais e fallback offline para telas HTML.
- Botão/prompt nativo de instalação exibido pelo navegador.

---

## ⌨️ 8. Command Palette (Ctrl + K / Cmd + K)

A qualquer momento na aplicação, pressione `Ctrl + K` (Windows/Linux) ou `Cmd + K` (Mac) para abrir a barra de comandos rápidos:
- Navegação entre todas as páginas e seções.
- Criar nova transação, receita ou despesa rapidamente.
- Alternar modo de privacidade (Olho Mágico).
- Alternar tema Claro / Escuro.
- Navegação completa por teclado com setas `↑` / `↓` e tecla `Enter`.

---

## 🖨️ 9. Demonstrativo Financeiro para Impressão / PDF

Na página `relatorios.html`, clique em **"Imprimir / Salvar PDF"**:
- Estilos otimizados via `@media print`.
- Ocultação automática de sidebar, menus, botões e controles de navegação.
- Cabeçalho formal com demonstrativo do período, resumo executivo, divisão de despesas e principais movimentações.

---

## 🌐 10. Deploy em Produção

O SaldoCerto pode ser hospedado gratuitamente e com deploy contínuo em serviços estáticos como:

- **Vercel**: Conecte o repositório GitHub e faça deploy automático sem necessidade de configuração de build (`Output directory: .`).
- **Netlify**: Arraste a pasta do projeto ou conecte via Git (`Publish directory: .`).
- **GitHub Pages**: Vá em *Settings > Pages > Branch: main / root*.
- **Cloudflare Pages**: Conecte o repositório com build preset vazio.

> Lembre-se de adicionar o domínio de produção nas **Redirect URLs** do painel do Supabase.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais detalhes.
