from flask import Flask, jsonify
from dotenv import load_dotenv

def create_app():
    load_dotenv()
    app = Flask(__name__)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app
