/* SQL para atualizar as tabelas existentes */
/* Execute no SQL Editor do Supabase */

-- Adicionar colunas faltantes na tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS ticker VARCHAR(20),
ADD COLUMN IF NOT EXISTS asset_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(20) DEFAULT 'ACAO',
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- Atualizar ticker baseado no asset_id se existir
UPDATE transactions t
SET ticker = a.ticker
FROM assets a
WHERE t.asset_id = a.id AND t.ticker IS NULL;

-- Criar índice para ticker se não existir
CREATE INDEX IF NOT EXISTS ix_transactions_ticker ON transactions (ticker);

-- Adicionar colunas faltantes na tabela asset_positions
ALTER TABLE asset_positions 
ADD COLUMN IF NOT EXISTS ticker VARCHAR(20),
ADD COLUMN IF NOT EXISTS asset_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(20) DEFAULT 'ACAO',
ADD COLUMN IF NOT EXISTS total_invested FLOAT DEFAULT 0;

-- Atualizar ticker baseado no asset_id se existir
UPDATE asset_positions ap
SET ticker = a.ticker,
    asset_name = a.name
FROM assets a
WHERE ap.asset_id = a.id AND ap.ticker IS NULL;

-- Criar índice para ticker se não existir
CREATE INDEX IF NOT EXISTS ix_asset_positions_ticker ON asset_positions (ticker);

-- Criar unique constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'asset_positions_user_id_ticker_key'
    ) THEN
        -- Remover duplicatas antes de adicionar constraint
        DELETE FROM asset_positions a
        WHERE a.id NOT IN (
            SELECT MIN(id) FROM asset_positions 
            GROUP BY user_id, ticker
        ) AND ticker IS NOT NULL;
        
        -- Adicionar constraint
        ALTER TABLE asset_positions 
        ADD CONSTRAINT asset_positions_user_id_ticker_key UNIQUE (user_id, ticker);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Criar tabela pf_accounts se não existir
CREATE TABLE IF NOT EXISTS pf_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance FLOAT DEFAULT 0,
    color VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pf_accounts_user_id ON pf_accounts (user_id);

-- Function to adjust account balance
CREATE OR REPLACE FUNCTION adjust_account_balance(account_id INTEGER, amount FLOAT)
RETURNS void AS $$
BEGIN
    UPDATE pf_accounts 
    SET balance = balance + amount 
    WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (DROP primeiro para evitar duplicatas)
DROP POLICY IF EXISTS "Service role transactions policy" ON transactions;
DROP POLICY IF EXISTS "Service role asset_positions policy" ON asset_positions;
DROP POLICY IF EXISTS "Service role pf_accounts policy" ON pf_accounts;

CREATE POLICY "Service role transactions policy" ON transactions FOR ALL USING (true);
CREATE POLICY "Service role asset_positions policy" ON asset_positions FOR ALL USING (true);
CREATE POLICY "Service role pf_accounts policy" ON pf_accounts FOR ALL USING (true);

SELECT 'Schema atualizado com sucesso!' as resultado;
