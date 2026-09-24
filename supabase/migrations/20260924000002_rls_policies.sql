-- ==============================================================================
-- SALDOCERTO - ROW LEVEL SECURITY (RLS) POLICIES
-- Proteção rigorosa de dados multiusuário no PostgreSQL
-- Garante que cada usuário acesse, insira, edite e delete APENAS seus próprios dados.
-- ==============================================================================

-- 1. HABILITAÇÃO DO RLS EM TODAS AS TABELAS
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
-- 2. POLÍTICAS: PROFILES
-- ==============================================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 3. POLÍTICAS: ACCOUNTS
-- ==============================================================================
DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 4. POLÍTICAS: CREDIT_CARDS
-- ==============================================================================
DROP POLICY IF EXISTS "credit_cards_select_own" ON public.credit_cards;
CREATE POLICY "credit_cards_select_own" ON public.credit_cards
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "credit_cards_insert_own" ON public.credit_cards;
CREATE POLICY "credit_cards_insert_own" ON public.credit_cards
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "credit_cards_update_own" ON public.credit_cards;
CREATE POLICY "credit_cards_update_own" ON public.credit_cards
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "credit_cards_delete_own" ON public.credit_cards;
CREATE POLICY "credit_cards_delete_own" ON public.credit_cards
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 5. POLÍTICAS: CREDIT_CARD_PURCHASES
-- ==============================================================================
DROP POLICY IF EXISTS "cc_purchases_select_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_select_own" ON public.credit_card_purchases
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "cc_purchases_insert_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_insert_own" ON public.credit_card_purchases
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "cc_purchases_update_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_update_own" ON public.credit_card_purchases
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "cc_purchases_delete_own" ON public.credit_card_purchases;
CREATE POLICY "cc_purchases_delete_own" ON public.credit_card_purchases
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 6. POLÍTICAS: TRANSACTIONS
-- ==============================================================================
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 7. POLÍTICAS: CATEGORIES (Padrão e Personalizadas)
-- ==============================================================================
DROP POLICY IF EXISTS "categories_select_own_or_default" ON public.categories;
CREATE POLICY "categories_select_own_or_default" ON public.categories
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 8. POLÍTICAS: GOALS
-- ==============================================================================
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 9. POLÍTICAS: INVESTMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "investments_select_own" ON public.investments;
CREATE POLICY "investments_select_own" ON public.investments
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own" ON public.investments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own" ON public.investments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
CREATE POLICY "investments_delete_own" ON public.investments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 10. POLÍTICAS: ASSETS
-- ==============================================================================
DROP POLICY IF EXISTS "assets_select_own" ON public.assets;
CREATE POLICY "assets_select_own" ON public.assets
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assets_insert_own" ON public.assets;
CREATE POLICY "assets_insert_own" ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assets_update_own" ON public.assets;
CREATE POLICY "assets_update_own" ON public.assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "assets_delete_own" ON public.assets;
CREATE POLICY "assets_delete_own" ON public.assets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 11. POLÍTICAS: LIABILITIES
-- ==============================================================================
DROP POLICY IF EXISTS "liabilities_select_own" ON public.liabilities;
CREATE POLICY "liabilities_select_own" ON public.liabilities
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "liabilities_insert_own" ON public.liabilities;
CREATE POLICY "liabilities_insert_own" ON public.liabilities
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "liabilities_update_own" ON public.liabilities;
CREATE POLICY "liabilities_update_own" ON public.liabilities
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "liabilities_delete_own" ON public.liabilities;
CREATE POLICY "liabilities_delete_own" ON public.liabilities
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 12. POLÍTICAS: BUDGETS
-- ==============================================================================
DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;
CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 13. POLÍTICAS: NOTIFICATIONS
-- ==============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
