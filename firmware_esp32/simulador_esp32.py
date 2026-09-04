import requests
import time
import random
from datetime import datetime

# URL do endpoint da nossa API FastAPI
API_URL = "http://127.0.0.1:8000/api/leituras"

# ID da Estação cadastrada no MySQL
ESTACAO_ID = 1

# Estado inicial dos sensores (valores médios típicos de Sorocaba)
temperatura = 23.5
umidade = 65.0
pressao = 1013.25
qualidade_ar = 25.0
luminosidade = 500.0

print("🚀 Simulador de Estação Meteorológica IoT (ESP32) Iniciado!")
print(f"📡 Enviando dados para: {API_URL}")
print("Pressione CTRL+C para interromper a simulação.\n")

def variar_sensor(valor_atual, variacao_max, limite_min, limite_max):
    """Aplica uma variação aleatória suave ao valor do sensor."""
    delta = random.uniform(-variacao_max, variacao_max)
    novo_valor = valor_atual + delta
    return round(max(limite_min, min(limite_max, novo_valor)), 2)

try:
    while True:
        # Simula variações climáticas suaves a cada ciclo
        temperatura = variar_sensor(temperatura, 0.3, 15.0, 38.0)
        umidade = variar_sensor(umidade, 1.0, 30.0, 95.0)
        pressao = variar_sensor(pressao, 0.1, 990.0, 1030.0)
        qualidade_ar = variar_sensor(qualidade_ar, 0.5, 10.0, 150.0)
        luminosidade = variar_sensor(luminosidade, 15.0, 0.0, 1000.0)

        # Payload exato esperado pelo DTO (Pydantic / Pydantic Schema)
        payload = {
            "estacao_id": ESTACAO_ID,
            "temperatura": temperatura,
            "umidade": umidade,
            "pressao": pressao,
            "qualidade_ar": qualidade_ar,
            "luminosidade": luminosidade
        }

        hora_atual = datetime.now().strftime("%H:%M:%S")

        try:
            # Envia a requisição HTTP POST para a API FastAPI
            response = requests.post(API_URL, json=payload, timeout=5)

            if response.status_code == 201:
                print(f"[{hora_atual}] ✅ Leitura enviada com sucesso! | Temp: {temperatura}°C | Umidade: {umidade}% | Q. Ar: {qualidade_ar} AQI")
            else:
                print(f"[{hora_atual}] ⚠️ Erro na API (Status {response.status_code}): {response.text}")

        except requests.exceptions.ConnectionError:
            print(f"[{hora_atual}] ❌ Erro de conexão: A API FastAPI está rodando em http://127.0.0.1:8000?")

        # Intervalo de envio para testes (5 segundos)
        # Em produção / entrega final, alterar para 300 segundos (5 minutos)
        time.sleep(5)

except KeyboardInterrupt:
    print("\n🛑 Simulação encerrada pelo usuário.")