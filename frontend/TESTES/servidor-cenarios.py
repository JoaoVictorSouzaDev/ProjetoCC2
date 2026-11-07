"""Servidor de testes isolado: não acessa API real nem modifica arquivos da aplicação."""
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import json
import re
import time

FRONTEND = Path(__file__).resolve().parents[1]


class Cenarios(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def responder(self, corpo, tipo='application/javascript', status=200):
        dados = corpo.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', tipo + '; charset=utf-8')
        self.send_header('Content-Length', str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def responder_api(self, caminho):
        cenario = caminho.split('/')[2]
        if cenario == 'offline':
            self.connection.close()
            return
        if cenario == 'error':
            self.responder('{}', 'application/json', 503)
            return
        if cenario == 'invalid':
            self.responder('{}', 'application/json')
            return
        if cenario == 'partial' and caminho.endswith('/historico'):
            self.responder('{}', 'application/json', 503)
            return
        if cenario == 'loading':
            time.sleep(3)
        if caminho.endswith('/'):
            self.responder('{}', 'application/json')
            return
        if cenario == 'empty':
            if caminho.endswith('/recente'):
                self.responder(json.dumps({'detail': 'Nenhuma leitura registrada para esta estação.'}),
                               'application/json', 404)
            else:
                self.responder('[]', 'application/json')
            return
        station_id = int(caminho.split('/')[-2])
        idade = 60 if cenario == 'stale' else 1
        instante = datetime.now(timezone.utc) - timedelta(minutes=idade)
        leitura = {'estacao_id': station_id, 'temperatura': 18 + station_id % 10,
                   'umidade': 50 + station_id % 10, 'pressao': 1010,
                   'qualidade_ar': 21, 'luminosidade': 400, 'data_hora': instante.isoformat()}
        dados = leitura if caminho.endswith('/recente') else [
            {**leitura, 'temperatura': leitura['temperatura'] - 3 + i,
             'data_hora': (instante - timedelta(minutes=30 - i * 10)).isoformat()} for i in range(4)]
        if cenario == 'unknown-time':
            for item in ([dados] if isinstance(dados, dict) else dados):
                item.pop('data_hora', None)
        self.responder(json.dumps(dados), 'application/json')

    def do_GET(self):
        caminho = urlsplit(self.path).path
        if caminho.startswith('/api-test/'):
            return self.responder_api(caminho)
        arquivo = Path(self.translate_path(self.path))
        if arquivo.name == 'painel.css':
            texto = arquivo.read_text(encoding='utf-8')
            tema = parse_qs(urlsplit(self.headers.get('Referer', '')).query).get('tema', [''])[0]
            if tema in ('light', 'dark'):
                media = 'all' if tema == 'dark' else 'not all'
                texto = texto.replace('(prefers-color-scheme: dark)', media)
            return self.responder(texto, 'text/css')
        if arquivo.name == 'configuracao-api.js':
            texto = arquivo.read_text(encoding='utf-8').replace("export const API_BASE_URL = '';",
                "export const API_BASE_URL = location.origin + '/api-test/' + "
                "(new URL(location.href).searchParams.get('cenario') || 'success');")
            return self.responder(texto)
        if arquivo.name == 'estacoes.js':
            texto = arquivo.read_text(encoding='utf-8')
            contador = iter(range(101, 106))
            texto = re.sub(r'apiId: null', lambda _: f'apiId: {next(contador)}', texto)
            return self.responder(texto)
        if arquivo.suffix == '.html' and arquivo.is_file():
            texto = arquivo.read_text(encoding='utf-8').replace('<main ',
                '<p class="aviso">Ambiente de testes: todas as respostas da API são simuladas.</p><main ', 1)
            return self.responder(texto, 'text/html')
        return super().do_GET()


if __name__ == '__main__':
    handler = partial(Cenarios, directory=str(FRONTEND))
    ThreadingHTTPServer(('127.0.0.1', 8766), handler).serve_forever()
