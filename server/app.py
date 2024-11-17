from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
from io import BytesIO

app = Flask(__name__)

# Configura CORS para permitir solo un dominio específico
CORS(app)

@app.route('/spotify-stl', methods=['POST'])
def download_zip():
    try:
        import spotifystl

        # Recibir el enlace enviado por el cliente
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({"error": "Missing parameter 'url'"}), 400
        
        zip_filename = url.split('/')[-1]
        zip_path = '/tmp/{}.zip'.format(zip_filename)
        if not os.path.exists(zip_filename):
            svg = spotifystl.codes.download_spotify_svg(url)
            spotifystl.scene.generate_stl(svg, zip_path)

        # Enviar el archivo zip al cliente
        return_data = BytesIO()
        with open(zip_path, 'rb') as f:
            return_data.write(f.read())
        return_data.seek(0)
        
        # Borrar el archivo zip localmente
        os.remove(zip_path)
        
        # Devolver el archivo como respuesta
        return send_file(return_data, mimetype='application/zip', as_attachment=True, download_name='{}.zip'.format(zip_filename))
    
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)