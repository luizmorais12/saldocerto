-- ==============================================================================
-- SALDOCERTO - SCRIPT SQL COMPLETO PARA O SUPABASE SQL EDITOR
-- Executar este script diretamente no Supabase SQL Editor do seu projeto
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÃO GENÉRICA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABELA PROFILES (Perfis de Usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'BRL',
  theme TEXT DEFAULT 'light',
  monthly_income NUMERIC(15,2) DEFAULT 0,
  financial_goal TEXT,
  monthly_savings_target NUMERIC(15,2) DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PROFILE APÓS SIGNUP EM AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. TABELA ACCOUNTS (Contas Bancárias e Carteiras)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking', -- checking, savings, digital, wallet, cash
  bank_name TEXT,
  initial_balance NUMERIC(15,2) DEFAULT 0.00,
  current_balance NUMERIC(15,2) DEFAULT 0.00,
  color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_accounts_updated_at ON public.accounts;
CREATE TRIGGER tr_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. TABELA CREDIT_CARDS (Cartões de Crédito)
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  last_four_digits VARCHAR(4),
  credit_limit NUMERIC(15,2) DEFAULT 0.00,
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color TEXT DEFAULT '#8A05BE',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_credit_cards_updated_at ON public.credit_cards;
CREATE TRIGGER tr_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. TABELA CREDIT_CARD_PURCHASES (Compras Parceladas / Faturas de Cartão)
CREATE TABLE IF NOT EXISTS public.credit_card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Outros',
  total_amount NUMERIC(15,2) NOT NULL,
  installment_amount NUMERIC(15,2) NOT NULL,
  total_installments INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_credit_card_purchases_updated_at ON public.credit_card_purchases;
CREATE TRIGGER tr_credit_card_purchases_updated_at
  BEFORE UPDATE ON public.credit_card_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. TABELA TRANSACTIONS (Movimentações Financeiras: Receitas e Despesas)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outros',
  payment_method TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. TABELA CATEGORIES (Categorias de Transações)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. TABELA GOALS (Metas Financeiras)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) DEFAULT 0.00,
  deadline DATE,
  color TEXT DEFAULT '#16A34A',
  icon TEXT DEFAULT 'target',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_goals_updated_at ON public.goals;
CREATE TRIGGER tr_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. TABELA INVESTMENTS (Carteira de Investimentos)
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  institution TEXT,
  invested_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  return_amount NUMERIC(15,2) DEFAULT 0.00,
  return_percentage NUMERIC(8,2) DEFAULT 0.00,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_investments_updated_at ON public.investments;
CREATE TRIGGER tr_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. TABELA ASSETS (Bens e Ativos)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_assets_updated_at ON public.assets;
CREATE TRIGGER tr_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. TABELA LIABILITIES (Dívidas e Obrigações)
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS tr_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER tr_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. TABELA BUDGETS (Orçamentos por Categoria)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(15,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, category, month, year)
);

DROP TRIGGER IF EXISTS tr_budgets_updated_at ON public.budgets;
CREATE TRIGGER tr_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. TABELA NOTIFICATIONS (Notificações)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 16. ÍNDICES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_purchases_user_id ON public.credit_card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_purchases_card_id ON public.credit_card_purchases(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- ==============================================================================
-- 17. CATEGORIAS PADRÃO DO SISTEMA
-- ==============================================================================
INSERT INTO public.categories (name, type, icon, color) VALUES
  ('Moradia', 'expense', 'home', '#6366F1'),
  ('Alimentação', 'expense', 'utensils', '#F59E0B'),
  ('Transporte', 'expense', 'car', '#3B82F6'),
  ('Lazer', 'expense', 'gamepad-2', '#EC4899'),
  ('Saúde', 'expense', 'heart-pulse', '#EF4444'),
  ('Educação', 'expense', 'graduation-cap', '#8B5CF6'),
  ('Assinaturas', 'expense', 'tv', '#14B8A6'),
  ('Outros', 'expense', 'more-horizontal', '#64748B'),
  ('Salário', 'income', 'briefcase', '#16A34A'),
  ('Freelance', 'income', 'laptop', '#059669'),
  ('Benefícios', 'income', 'gift', '#10B981'),
  ('Investimentos', 'income', 'trending-up', '#0EA5E9'),
  ('Vendas', 'income', 'shopping-bag', '#84CC16')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 18. HABILITAÇÃO DO RLS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 19. POLÍTICAS RLS (SELECT, INSERT, UPDATE, DELETE COM auth.uid() = user_id)
-- ==============================================================================

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Accounts
DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Credit Cards
DROP POLICY IF EXISTS "credit_cards_select_own" ON public.credit_cards;
CREATE POLICY "credit_cards_select_own" ON public.credit_cards FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "credit_cards_insert_own" ON public.credit_cards;
CREATE POLICY "credit_cards_insert_own" ON public.credit_cards FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "credit_cards_update_own" ON public.credit_cards;
CREATE POLICY "credit_cards_update_own" ON public.credit_cards FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "credit_cards_delete_own" ON public.credit_cards;
CREATE POLICY "credit_cards_delete_own" ON public.credit_cards FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Credit Card Purchases
DROP POLICY IF EXISTS "cc_purchases_select_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_select_own" ON public.credit_card_purchases FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "cc_purchases_insert_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_insert_own" ON public.credit_card_purchases FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "cc_purchases_update_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_update_own" ON public.credit_card_purchases FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "cc_purchases_delete_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_delete_own" ON public.credit_card_purchases FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Transactions
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Categories
DROP POLICY IF EXISTS "categories_select_own_or_default" ON public.categories;
CREATE POLICY "categories_select_own_or_default" ON public.categories FOR SELECT TO authenticated USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Goals
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Investments
DROP POLICY IF EXISTS "investments_select_own" ON public.investments;
CREATE POLICY "investments_select_own" ON public.investments FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own" ON public.investments FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own" ON public.investments FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
CREATE POLICY "investments_delete_own" ON public.investments FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Assets
DROP POLICY IF EXISTS "assets_select_own" ON public.assets;
CREATE POLICY "assets_select_own" ON public.assets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "assets_insert_own" ON public.assets;
CREATE POLICY "assets_insert_own" ON public.assets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "assets_update_own" ON public.assets;
CREATE POLICY "assets_update_own" ON public.assets FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "assets_delete_own" ON public.assets;
CREATE POLICY "assets_delete_own" ON public.assets FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Liabilities
DROP POLICY IF EXISTS "liabilities_select_own" ON public.liabilities;
CREATE POLICY "liabilities_select_own" ON public.liabilities FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "liabilities_insert_own" ON public.liabilities;
CREATE POLICY "liabilities_insert_own" ON public.liabilities FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "liabilities_update_own" ON public.liabilities;
CREATE POLICY "liabilities_update_own" ON public.liabilities FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "liabilities_delete_own" ON public.liabilities;
CREATE POLICY "liabilities_delete_own" ON public.liabilities FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Budgets
DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
CREATE POLICY "budgets_select_own" ON public.budgets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;
CREATE POLICY "budgets_delete_own" ON public.budgets FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
