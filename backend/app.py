import requests
import json
import ssl
import socket
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Sirve archivos desde la carpeta frontend
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

def check_ssl_cert(hostname):
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(5.0)
            s.connect((hostname, 443))
            cert = s.getpeercert()
            expires_on = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
            days_left = (expires_on - datetime.utcnow()).days
            return {
                'valid': True,
                'expires_on': expires_on.strftime('%Y-%m-%d'),
                'days_left': days_left
            }
    except Exception as e:
        return {'valid': False, 'error': str(e)}

@app.route('/check')
def check():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'Falta parámetro url'}), 400

    try:
        start = datetime.utcnow()
        res = requests.get(url, timeout=5)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        hostname = url.split('//')[-1].split('/')[0]
        cert_info = check_ssl_cert(hostname)

        return jsonify({
            'url': url,
            'status': res.status_code,
            'elapsed_ms': int(elapsed),
            'headers': dict(res.headers),
            'body': res.text[:300],
            'ssl': cert_info
        })
    except Exception as e:
        return jsonify({'url': url, 'error': str(e)})

# 👉 Estas rutas sirven el frontend
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=False)