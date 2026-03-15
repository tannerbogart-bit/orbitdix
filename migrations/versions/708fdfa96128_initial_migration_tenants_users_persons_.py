"""Initial migration: tenants, users, persons, edges (with indexes + constraints)

Revision ID: 708fdfa96128
Revises:
Create Date: 2026-02-24 21:50:40.242293

"""
import sqlalchemy as sa
from alembic import op

revision = '708fdfa96128'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tenants',
        sa.Column('id',         sa.Integer(),   nullable=False),
        sa.Column('name',       sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(),  nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'users',
        sa.Column('id',            sa.Integer(),   nullable=False),
        sa.Column('tenant_id',     sa.Integer(),   nullable=False),
        sa.Column('email',         sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role',          sa.String(50),  nullable=False),
        sa.Column('created_at',    sa.DateTime(),  nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_tenant_id', 'users',   ['tenant_id'])
    op.create_index('ix_users_email',     'users',   ['email'])

    op.create_table(
        'persons',
        sa.Column('id',           sa.Integer(),   nullable=False),
        sa.Column('tenant_id',    sa.Integer(),   nullable=False),
        sa.Column('user_id',      sa.Integer(),   nullable=True),
        sa.Column('is_self',      sa.Boolean(),   nullable=False),
        sa.Column('first_name',   sa.String(255), nullable=True),
        sa.Column('last_name',    sa.String(255), nullable=True),
        sa.Column('email',        sa.String(255), nullable=True),
        sa.Column('linkedin_url', sa.String(500), nullable=True),
        sa.Column('created_at',   sa.DateTime(),  nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'],   ['users.id'],   ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'is_self', name='uq_person_user_is_self'),
    )
    op.create_index('ix_persons_tenant_id', 'persons', ['tenant_id'])
    op.create_index('ix_persons_user_id',   'persons', ['user_id'])
    op.create_index('ix_persons_email',     'persons', ['email'])

    op.create_table(
        'edges',
        sa.Column('id',                sa.Integer(),   nullable=False),
        sa.Column('tenant_id',         sa.Integer(),   nullable=False),
        sa.Column('from_person_id',    sa.Integer(),   nullable=False),
        sa.Column('to_person_id',      sa.Integer(),   nullable=False),
        sa.Column('relationship_type', sa.String(100), nullable=False, server_default='linkedin'),
        sa.Column('strength',          sa.Integer(),   nullable=True),
        sa.Column('created_at',        sa.DateTime(),  nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'],      ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_person_id'], ['persons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_person_id'],   ['persons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'from_person_id', 'to_person_id', name='uq_edge_tenant_pair'),
        sa.CheckConstraint('from_person_id != to_person_id', name='ck_edge_no_self_loop'),
    )
    op.create_index('ix_edges_tenant_id',      'edges', ['tenant_id'])
    op.create_index('ix_edges_from_person_id', 'edges', ['from_person_id'])
    op.create_index('ix_edges_to_person_id',   'edges', ['to_person_id'])
    op.create_index('ix_edges_bfs',            'edges', ['tenant_id', 'from_person_id', 'to_person_id'])


def downgrade():
    op.drop_index('ix_edges_bfs',            table_name='edges')
    op.drop_index('ix_edges_to_person_id',   table_name='edges')
    op.drop_index('ix_edges_from_person_id', table_name='edges')
    op.drop_index('ix_edges_tenant_id',      table_name='edges')
    op.drop_table('edges')

    op.drop_index('ix_persons_email',     table_name='persons')
    op.drop_index('ix_persons_user_id',   table_name='persons')
    op.drop_index('ix_persons_tenant_id', table_name='persons')
    op.drop_table('persons')

    op.drop_index('ix_users_email',     table_name='users')
    op.drop_index('ix_users_tenant_id', table_name='users')
    op.drop_table('users')

    op.drop_table('tenants')
