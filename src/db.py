from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()

# Production pool settings — applied in create_app() when not using SQLite.
# SQLite uses a StaticPool / NullPool and doesn't support these options.
PROD_POOL_OPTIONS = {
    "pool_pre_ping":  True,   # heartbeat before each checkout — catches stale connections
    "pool_size":      5,      # number of persistent connections
    "max_overflow":   10,     # extra connections allowed above pool_size under burst load
    "pool_timeout":   30,     # seconds to wait for a connection before raising
    "pool_recycle":   1800,   # recycle connections after 30 min (avoids server-side timeout drops)
}
