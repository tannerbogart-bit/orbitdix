"""add agent_contexts and target_accounts tables

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-03-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'agent_contexts',
        sa.Column('id',              sa.Integer(),     primary_key=True),
        sa.Column('user_id',         sa.Integer(),     sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('my_company',      sa.String(255),   nullable=True),
        sa.Column('my_role',         sa.String(255),   nullable=True),
        sa.Column('what_i_sell',     sa.Text(),        nullable=True),
        sa.Column('icp_description', sa.Text(),        nullable=True),
        sa.Column('updated_at',      sa.DateTime(),    nullable=True),
    )
    op.create_table(
        'target_accounts',
        sa.Column('id',           sa.Integer(),     primary_key=True),
        sa.Column('user_id',      sa.Integer(),     sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id',    sa.Integer(),     sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_name', sa.String(255),   nullable=False),
        sa.Column('reason',       sa.Text(),        nullable=True),
        sa.Column('created_at',   sa.DateTime(),    nullable=True),
        sa.UniqueConstraint('user_id', 'company_name', name='uq_target_account_user_company'),
    )
    op.create_index('ix_target_accounts_user_id',   'target_accounts', ['user_id'])
    op.create_index('ix_target_accounts_tenant_id', 'target_accounts', ['tenant_id'])


def downgrade():
    op.drop_index('ix_target_accounts_tenant_id', table_name='target_accounts')
    op.drop_index('ix_target_accounts_user_id',   table_name='target_accounts')
    op.drop_table('target_accounts')
    op.drop_table('agent_contexts')
