"""increase_asset_ticker_length

Revision ID: 32444dfd29d2
Revises: f34040365de8
Create Date: 2026-01-14 16:32:45.927554

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32444dfd29d2'
down_revision: Union[str, None] = 'f34040365de8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('assets', 'ticker',
               existing_type=sa.String(length=20),
               type_=sa.String(length=60),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('assets', 'ticker',
               existing_type=sa.String(length=60),
               type_=sa.String(length=20),
               existing_nullable=False)

