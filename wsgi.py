import os
from src.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=os.getenv("DEBUG", "False") == "True", host="0.0.0.0", port=port)
