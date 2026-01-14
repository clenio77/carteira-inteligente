/* SQL adicional para criar tabela pf_transactions e pf_categories */
/* Execute no SQL Editor do Supabase */

-- Criar tabela de categorias se não existir
CREATE TABLE IF NOT EXISTS pf_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    type VARCHAR(20) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pf_categories_user_id ON pf_categories (user_id);

-- Criar tabela de transações pessoais se não existir
CREATE TABLE IF NOT EXISTS pf_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES pf_accounts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES pf_categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    amount FLOAT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pf_transactions_user_id ON pf_transactions (user_id);
CREATE INDEX IF NOT EXISTS ix_pf_transactions_account_id ON pf_transactions (account_id);
CREATE INDEX IF NOT EXISTS ix_pf_transactions_date ON pf_transactions (date);

-- Inserir categorias padrão
INSERT INTO pf_categories (user_id, name, icon, type) VALUES
    (NULL, 'Salário', '💰', 'INCOME'),
    (NULL, 'Freelance', '💻', 'INCOME'),
    (NULL, 'Investimentos', '📈', 'INCOME'),
    (NULL, 'Outros (Receita)', '💵', 'INCOME'),
    (NULL, 'Alimentação', '🍔', 'EXPENSE'),
    (NULL, 'Transporte', '🚗', 'EXPENSE'),
    (NULL, 'Moradia', '🏠', 'EXPENSE'),
    (NULL, 'Saúde', '🏥', 'EXPENSE'),
    (NULL, 'Educação', '📚', 'EXPENSE'),
    (NULL, 'Lazer', '🎮', 'EXPENSE'),
    (NULL, 'Compras', '🛒', 'EXPENSE'),
    (NULL, 'Outros (Despesa)', '📦', 'EXPENSE')
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE pf_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Service role pf_categories policy" ON pf_categories;
DROP POLICY IF EXISTS "Service role pf_transactions policy" ON pf_transactions;

CREATE POLICY "Service role pf_categories policy" ON pf_categories FOR ALL USING (true);
CREATE POLICY "Service role pf_transactions policy" ON pf_transactions FOR ALL USING (true);

SELECT 'Tabelas de finanças pessoais criadas com sucesso!' as resultado;
