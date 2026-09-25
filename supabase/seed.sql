-- ==============================================================================
-- SALDOCERTO - SEED DE DESENVOLVIMENTO
-- Categorias padrão do sistema (user_id IS NULL)
-- ==============================================================================

-- Categorias padrão de despesas
INSERT INTO public.categories (name, type, icon, color) VALUES
  ('Moradia', 'expense', 'home', '#6366F1'),
  ('Alimentação', 'expense', 'utensils', '#F59E0B'),
  ('Transporte', 'expense', 'car', '#3B82F6'),
  ('Lazer', 'expense', 'gamepad-2', '#EC4899'),
  ('Saúde', 'expense', 'heart-pulse', '#EF4444'),
  ('Educação', 'expense', 'graduation-cap', '#8B5CF6'),
  ('Assinaturas', 'expense', 'tv', '#14B8A6'),
  ('Outros', 'expense', 'more-horizontal', '#64748B')
ON CONFLICT DO NOTHING;

-- Categorias padrão de receitas
INSERT INTO public.categories (name, type, icon, color) VALUES
  ('Salário', 'income', 'briefcase', '#16A34A'),
  ('Freelance', 'income', 'laptop', '#059669'),
  ('Benefícios', 'income', 'gift', '#10B981'),
  ('Investimentos', 'income', 'trending-up', '#0EA5E9'),
-- Assinantes autorizados iniciais (Administrador / Desenvolvedor)
INSERT INTO public.authorized_subscribers (email, full_name, order_id, status, product_name) VALUES
  ('luiz@saldocerto.com.br', 'Luiz Morais (Admin)', 'MANUAL-ADMIN-001', 'active', 'SaldoCerto Mensal - Admin')
ON CONFLICT (email) DO UPDATE SET status = 'active';
