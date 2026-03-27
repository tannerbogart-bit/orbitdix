"""add terms consent fields to users

Revision ID: 12bfa326590e
Revises: 44004343be4b
Create Date: 2026-03-27 05:47:17.728711

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '12bfa326590e'
down_revision = '44004343be4b'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('agreed_to_terms_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('terms_version', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('signup_ip', sa.String(length=45), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('signup_ip')
        batch_op.drop_column('terms_version')
        batch_op.drop_column('agreed_to_terms_at')
