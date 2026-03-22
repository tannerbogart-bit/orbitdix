"""add target urls and outreach table

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b8c9
Create Date: 2026-03-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e1f2a3b4c5d6'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    # website_url + linkedin_url on target_accounts (added directly in SQLite previously)
    with op.batch_alter_table('target_accounts') as batch_op:
        batch_op.add_column(sa.Column('website_url', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('linkedin_url', sa.String(500), nullable=True))

    # outreach tracking table
    op.create_table(
        'outreach',
        sa.Column('id',              sa.Integer(),     primary_key=True),
        sa.Column('user_id',         sa.Integer(),     sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id',       sa.Integer(),     sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_name',     sa.String(255),   nullable=True),
        sa.Column('target_company',  sa.String(255),   nullable=True),
        sa.Column('via_person_name', sa.String(255),   nullable=True),
        sa.Column('path_summary',    sa.Text(),        nullable=True),
        sa.Column('message',         sa.Text(),        nullable=True),
        sa.Column('status',          sa.String(50),    nullable=False, server_default='drafted'),
        sa.Column('notes',           sa.Text(),        nullable=True),
        sa.Column('follow_up_at',    sa.DateTime(),    nullable=True),
        sa.Column('sent_at',         sa.DateTime(),    nullable=True),
        sa.Column('created_at',      sa.DateTime(),    nullable=True),
    )
    op.create_index('ix_outreach_user_id',   'outreach', ['user_id'])
    op.create_index('ix_outreach_tenant_id', 'outreach', ['tenant_id'])
    op.create_index('ix_outreach_status',    'outreach', ['status'])


def downgrade():
    op.drop_index('ix_outreach_status',    table_name='outreach')
    op.drop_index('ix_outreach_tenant_id', table_name='outreach')
    op.drop_index('ix_outreach_user_id',   table_name='outreach')
    op.drop_table('outreach')

    with op.batch_alter_table('target_accounts') as batch_op:
        batch_op.drop_column('linkedin_url')
        batch_op.drop_column('website_url')
