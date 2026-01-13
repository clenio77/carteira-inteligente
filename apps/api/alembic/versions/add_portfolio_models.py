"""add_portfolio_models

Revision ID: 002
Revises: 
Create Date: 2025-10-01 15:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create assets table
    op.create_table(
        'assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticker', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.Enum('ACAO', 'FII', 'ETF', 'RENDA_FIXA', 'BDR', 'CRYPTO', name='assettype'), nullable=False),
        sa.Column('sector', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_id'), 'assets', ['id'], unique=False)
    op.create_index(op.f('ix_assets_ticker'), 'assets', ['ticker'], unique=True)

    # Create asset_positions table
    op.create_table(
        'asset_positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('average_price', sa.Float(), nullable=False),
        sa.Column('current_price', sa.Float(), nullable=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_positions_asset_id'), 'asset_positions', ['asset_id'], unique=False)
    op.create_index(op.f('ix_asset_positions_id'), 'asset_positions', ['id'], unique=False)
    op.create_index(op.f('ix_asset_positions_user_id'), 'asset_positions', ['user_id'], unique=False)

    # Create transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('BUY', 'SELL', name='transactiontype'), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('fees', sa.Float(), nullable=True),
        sa.Column('broker', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transactions_asset_id'), 'transactions', ['asset_id'], unique=False)
    op.create_index(op.f('ix_transactions_date'), 'transactions', ['date'], unique=False)
    op.create_index(op.f('ix_transactions_id'), 'transactions', ['id'], unique=False)
    op.create_index(op.f('ix_transactions_user_id'), 'transactions', ['user_id'], unique=False)

    # Create proceeds table
    op.create_table(
        'proceeds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('DIVIDEND', 'JCP', 'RENDIMENTO', 'BONIFICACAO', 'DIREITO', name='proceedtype'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('value_per_share', sa.Float(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('total_value', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proceeds_asset_id'), 'proceeds', ['asset_id'], unique=False)
    op.create_index(op.f('ix_proceeds_date'), 'proceeds', ['date'], unique=False)
    op.create_index(op.f('ix_proceeds_id'), 'proceeds', ['id'], unique=False)
    op.create_index(op.f('ix_proceeds_user_id'), 'proceeds', ['user_id'], unique=False)

    # Create cei_credentials table
    op.create_table(
        'cei_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=False),
        sa.Column('encrypted_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_status', sa.String(), nullable=True),
        sa.Column('last_sync_error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_cei_credentials_id'), 'cei_credentials', ['id'], unique=False)
    op.create_index(op.f('ix_cei_credentials_user_id'), 'cei_credentials', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_cei_credentials_user_id'), table_name='cei_credentials')
    op.drop_index(op.f('ix_cei_credentials_id'), table_name='cei_credentials')
    op.drop_table('cei_credentials')
    
    op.drop_index(op.f('ix_proceeds_user_id'), table_name='proceeds')
    op.drop_index(op.f('ix_proceeds_id'), table_name='proceeds')
    op.drop_index(op.f('ix_proceeds_date'), table_name='proceeds')
    op.drop_index(op.f('ix_proceeds_asset_id'), table_name='proceeds')
    op.drop_table('proceeds')
    
    op.drop_index(op.f('ix_transactions_user_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_date'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_asset_id'), table_name='transactions')
    op.drop_table('transactions')
    
    op.drop_index(op.f('ix_asset_positions_user_id'), table_name='asset_positions')
    op.drop_index(op.f('ix_asset_positions_id'), table_name='asset_positions')
    op.drop_index(op.f('ix_asset_positions_asset_id'), table_name='asset_positions')
    op.drop_table('asset_positions')
    
    op.drop_index(op.f('ix_assets_ticker'), table_name='assets')
    op.drop_index(op.f('ix_assets_id'), table_name='assets')
    op.drop_table('assets')

