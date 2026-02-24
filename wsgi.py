import os
from src.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=os.getenv("DEBUG", "False") == "True", host="127.0.0.1", port=port)
^Z
mkdir src
mkdir tests
copy con src\app.py
from flask import Flask, jsonify
from dotenv import load_dotenv

def create_app():
    load_dotenv()
    app = Flask(__name__)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app
^Z
copy con tests\test_health.py
from src.app import create_app

def test_health():
    app = create_app()
    client = app.test_client()
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"
^Zdir
dir src
dir tests



dir
dir src
dir tests
