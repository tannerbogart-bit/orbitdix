"""add email_verified to users

Revision ID: a1b2c3d4e5f6
Revises: e8279d3cd8ac
Create Date: 2026-03-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'e8279d3cd8ac'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='0')
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('email_verified')
