"""Add company/position to persons, source to edges, unique linkedin_url per tenant

Revision ID: a1b2c3d4e5f6
Revises: 708fdfa96128
Create Date: 2026-02-25 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '708fdfa96128'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('persons', sa.Column('company', sa.String(length=255), nullable=True))
    op.add_column('persons', sa.Column('position', sa.String(length=255), nullable=True))
    op.create_unique_constraint(
        'uq_person_tenant_linkedin_url', 'persons', ['tenant_id', 'linkedin_url']
    )
    op.add_column('edges', sa.Column('source', sa.String(length=100), nullable=True))


def downgrade():
    op.drop_column('edges', 'source')
    op.drop_constraint('uq_person_tenant_linkedin_url', 'persons', type_='unique')
    op.drop_column('persons', 'position')
    op.drop_column('persons', 'company')
