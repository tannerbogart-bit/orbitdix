"""add agent_messages table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a1
Create Date: 2026-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'agent_messages',
        sa.Column('id',         sa.Integer(),     nullable=False),
        sa.Column('user_id',    sa.Integer(),     nullable=False),
        sa.Column('role',       sa.String(20),    nullable=False),
        sa.Column('content',    sa.Text(),        nullable=False),
        sa.Column('created_at', sa.DateTime(),    nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_agent_messages_user_id', 'agent_messages', ['user_id'])


def downgrade():
    op.drop_index('ix_agent_messages_user_id', table_name='agent_messages')
    op.drop_table('agent_messages')
