"""merge branches

Revision ID: 5e9f88fd50cb
Revises: 09629af3068e, e1f2a3b4c5d6
Create Date: 2026-03-24 21:42:54.399701

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5e9f88fd50cb'
down_revision = ('09629af3068e', 'e1f2a3b4c5d6')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
