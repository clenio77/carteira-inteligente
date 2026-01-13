/* Schema for Supabase (PostgreSQL) */
/* Run this in the Supabase SQL Editor */

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE assettype AS ENUM ('ACAO', 'FII', 'ETF', 'RENDA_FIXA', 'BDR', 'CRYPTO');
CREATE TYPE transactiontype AS ENUM ('BUY', 'SELL');
CREATE TYPE proceedtype AS ENUM ('DIVIDEND', 'JCP', 'RENDIMENTO', 'BONIFICACAO', 'DIREITO');
CREATE TYPE notificationtype AS ENUM ('DIVIDEND', 'JCP', 'EARNINGS', 'CORPORATE_ACTION', 'SYNC_STATUS', 'ALERT', 'INFO');
CREATE TYPE pf_transaction_type AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE fixedincometype AS ENUM ('TESOURO_SELIC', 'TESOURO_PREFIXADO', 'TESOURO_PREFIXADO_JUROS', 'TESOURO_IPCA', 'TESOURO_IPCA_JUROS', 'CDB', 'LCI', 'LCA', 'LC', 'DEBENTURE', 'CRI', 'CRA', 'POUPANCA', 'OUTRO');
CREATE TYPE indexertype AS ENUM ('SELIC', 'CDI', 'IPCA', 'IGPM', 'PREFIXADO', 'TR', 'OUTRO');
CREATE TABLE users (
	id SERIAL NOT NULL, 
	email VARCHAR NOT NULL, 
	hashed_password VARCHAR NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	is_superuser BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);
CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE TABLE assets (
	id SERIAL NOT NULL, 
	ticker VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	type assettype NOT NULL, 
	sector VARCHAR, 
	description VARCHAR, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_assets_ticker ON assets (ticker);
CREATE INDEX ix_assets_id ON assets (id);
CREATE TABLE asset_positions (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	asset_id INTEGER NOT NULL, 
	quantity FLOAT NOT NULL, 
	average_price FLOAT NOT NULL, 
	current_price FLOAT, 
	last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id)
);
CREATE INDEX ix_asset_positions_asset_id ON asset_positions (asset_id);
CREATE INDEX ix_asset_positions_user_id ON asset_positions (user_id);
CREATE INDEX ix_asset_positions_id ON asset_positions (id);
CREATE TABLE transactions (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	asset_id INTEGER NOT NULL, 
	type transactiontype NOT NULL, 
	date TIMESTAMP WITH TIME ZONE NOT NULL, 
	quantity FLOAT NOT NULL, 
	price FLOAT NOT NULL, 
	total_amount FLOAT NOT NULL, 
	fees FLOAT, 
	broker VARCHAR, 
	notes VARCHAR, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id)
);
CREATE INDEX ix_transactions_date ON transactions (date);
CREATE INDEX ix_transactions_asset_id ON transactions (asset_id);
CREATE INDEX ix_transactions_id ON transactions (id);
CREATE INDEX ix_transactions_user_id ON transactions (user_id);
CREATE TABLE proceeds (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	asset_id INTEGER NOT NULL, 
	type proceedtype NOT NULL, 
	date DATE NOT NULL, 
	value_per_share FLOAT NOT NULL, 
	quantity FLOAT NOT NULL, 
	total_value FLOAT NOT NULL, 
	description VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id)
);
CREATE INDEX ix_proceeds_date ON proceeds (date);
CREATE INDEX ix_proceeds_user_id ON proceeds (user_id);
CREATE INDEX ix_proceeds_id ON proceeds (id);
CREATE INDEX ix_proceeds_asset_id ON proceeds (asset_id);
CREATE TABLE cei_credentials (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	cpf VARCHAR NOT NULL, 
	encrypted_password VARCHAR NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	last_sync_at TIMESTAMP WITH TIME ZONE, 
	last_sync_status VARCHAR, 
	last_sync_error VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE UNIQUE INDEX ix_cei_credentials_user_id ON cei_credentials (user_id);
CREATE INDEX ix_cei_credentials_id ON cei_credentials (id);
CREATE TABLE notifications (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	type notificationtype NOT NULL, 
	title VARCHAR NOT NULL, 
	message TEXT NOT NULL, 
	asset_id INTEGER, 
	is_read BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	read_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id)
);
CREATE INDEX ix_notifications_user_id ON notifications (user_id);
CREATE INDEX ix_notifications_id ON notifications (id);
CREATE TABLE pf_accounts (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	type VARCHAR NOT NULL, 
	balance FLOAT, 
	color VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_pf_accounts_id ON pf_accounts (id);
CREATE TABLE pf_categories (
	id SERIAL NOT NULL, 
	user_id INTEGER, 
	name VARCHAR NOT NULL, 
	icon VARCHAR, 
	type pf_transaction_type NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_pf_categories_id ON pf_categories (id);
CREATE TABLE fixed_income_investments (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	type fixedincometype NOT NULL, 
	issuer VARCHAR, 
	invested_amount FLOAT NOT NULL, 
	purchase_date DATE NOT NULL, 
	maturity_date DATE, 
	indexer indexertype NOT NULL, 
	rate FLOAT NOT NULL, 
	is_percentage_of_indexer INTEGER, 
	current_value FLOAT, 
	gross_value FLOAT, 
	last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	notes VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_fixed_income_investments_user_id ON fixed_income_investments (user_id);
CREATE INDEX ix_fixed_income_investments_id ON fixed_income_investments (id);
CREATE TABLE pf_transactions (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	account_id INTEGER NOT NULL, 
	category_id INTEGER, 
	type pf_transaction_type NOT NULL, 
	amount FLOAT NOT NULL, 
	description VARCHAR, 
	date DATE NOT NULL, 
	is_paid BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(account_id) REFERENCES pf_accounts (id), 
	FOREIGN KEY(category_id) REFERENCES pf_categories (id)
);
CREATE INDEX ix_pf_transactions_id ON pf_transactions (id);
