"""add linkedin_id and source to persons

Revision ID: 44004343be4b
Revises: 5e9f88fd50cb
Create Date: 2026-03-24 21:43:29.700293

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44004343be4b'
down_revision = '5e9f88fd50cb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.add_column(sa.Column('linkedin_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=True))


def downgrade():
    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.drop_column('source')
        batch_op.drop_column('linkedin_id')
