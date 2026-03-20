"""add last_synced_at to tenants

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tenants', sa.Column('last_synced_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('tenants', 'last_synced_at')
