/* Schema Simplificado para Supabase (PostgreSQL) */
/* Execute este SQL no SQL Editor do Supabase para criar as tabelas necessárias */

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types if they exist (para evitar conflitos)
DO $$ BEGIN
    CREATE TYPE assettype AS ENUM ('ACAO', 'FII', 'ETF', 'RENDA_FIXA', 'BDR', 'CRYPTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transactiontype_v2 AS ENUM ('COMPRA', 'VENDA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: users (should already exist)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- Table: transactions (versão simplificada sem FK para assets)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    asset_type VARCHAR(20) DEFAULT 'ACAO',
    transaction_type VARCHAR(10) NOT NULL, -- COMPRA ou VENDA
    quantity FLOAT NOT NULL,
    price FLOAT NOT NULL,
    total_amount FLOAT NOT NULL,
    fees FLOAT DEFAULT 0,
    broker VARCHAR(100),
    notes TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS ix_transactions_ticker ON transactions (ticker);
CREATE INDEX IF NOT EXISTS ix_transactions_date ON transactions (transaction_date);

-- Table: asset_positions (versão simplificada sem FK para assets)
CREATE TABLE IF NOT EXISTS asset_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    asset_type VARCHAR(20) DEFAULT 'ACAO',
    quantity FLOAT NOT NULL DEFAULT 0,
    average_price FLOAT NOT NULL DEFAULT 0,
    total_invested FLOAT NOT NULL DEFAULT 0,
    current_price FLOAT,
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ticker)
);

CREATE INDEX IF NOT EXISTS ix_asset_positions_user_id ON asset_positions (user_id);
CREATE INDEX IF NOT EXISTS ix_asset_positions_ticker ON asset_positions (ticker);

-- Table: pf_accounts (contas financeiras pessoais)
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

-- Function to adjust account balance (used when linking transactions to accounts)
CREATE OR REPLACE FUNCTION adjust_account_balance(account_id INTEGER, amount FLOAT)
RETURNS void AS $$
BEGIN
    UPDATE pf_accounts 
    SET balance = balance + amount 
    WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir service_role acessar tudo
CREATE POLICY "Service role can do everything on users" ON users
    FOR ALL USING (true);

CREATE POLICY "Service role can do everything on transactions" ON transactions
    FOR ALL USING (true);

CREATE POLICY "Service role can do everything on asset_positions" ON asset_positions
    FOR ALL USING (true);

CREATE POLICY "Service role can do everything on pf_accounts" ON pf_accounts
    FOR ALL USING (true);
