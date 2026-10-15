#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "João_Souza";
const char* password = "121044Luthia@";
const char* serverUrl = "http://192.168.1.104:8000/api/leituras";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi Conectado!");
  Serial.print("IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http; // Instancia o cliente HTTP

    int estacao_id = 1;
    float temperatura = 24.5;
    float umidade = 65.0;
    float pressao = 1013.2;
    float qualidade_ar = 400.0;
    int luminosidade = 500;

    // Cria um buffer de texto para armazenar o JSON
    char jsonBuffer[256];

    // Formata o JSON com os 6 campos exigidos pelo FastAPI
    snprintf(jsonBuffer, sizeof(jsonBuffer),
      "{\"estacao_id\":%d,\"temperatura\":%.2f,\"umidade\":%.2f,\"pressao\":%.2f,\"qualidade_ar\":%.2f,\"luminosidade\":%d}",
      estacao_id, temperatura, umidade, pressao, qualidade_ar, luminosidade
    );

    String jsonPayload = String(jsonBuffer);

    // Envio HTTP POST (usa serverUrl)
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      Serial.print("Resposta da API: ");
      Serial.println(response);
    } else {
      Serial.print("Erro no envio POST: ");
      Serial.println(httpResponseCode);
    }

    http.end(); // Libera os recursos da conexão
  } else {
    Serial.println("Conexão Wi-Fi perdida!");
  }

  // Envia uma nova leitura a cada 10 segundos
  delay(10000);
}

// put function definitions here:
int myFunction(int x, int y) {
  return x + y;
}