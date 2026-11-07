#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// CONFIGURAÇÕES DE REDE E SERVIDOR
const char* WIFI_SSID = "João_Souza";
const char* WIFI_PASSWORD = "121044Luthia@";
const char* API_URL = "http://192.168.1.104:8000/api/leituras";

// CONFIGURAÇÕES DA ESTAÇÃO
const int ESTACAO_ID = 1;
const unsigned long INTERVALO_LEITURA_MS = 5000; // Alterado para 5 segundos

// MAPEAMENTO DE PINOS E SENSORES
#define PIN_DHT22 4
#define PIN_MQ135 36  // ADC1 (VP)
#define PIN_LDR 34  // ADC1

#define DHTTYPE DHT22
DHT dht(PIN_DHT22, DHTTYPE);
Adafruit_BMP280 bmp;

// Variáveis de Controle de Tempo
unsigned long ultimaLeituraMs = 0;

// Garante que o Wi-Fi permaneça conectado
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Conectando ao Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Conectado!");
    Serial.print("IP Local: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha na conexão Wi-Fi. Tentará novamente no próximo ciclo.");
  }
}

// Média amostral para leitura analógica estável (remove ruído de leitura)
int lerAnalogicoEstavel(uint8_t pino, int amostras = 10) {
  long soma = 0;
  for (int i = 0; i < amostras; i++) {
    soma += analogRead(pino);
    delay(2);
  }
  return (int)(soma / amostras);
}

// Envio dos dados via POST para a API FastAPI
bool enviarPayloadHTTP(float temp, float umid, float pressao, float ar, int luz) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  char jsonPayload[256];
  snprintf(jsonPayload, sizeof(jsonPayload),
    "{\"estacao_id\":%d,\"temperatura\":%.2f,\"umidade\":%.2f,\"pressao\":%.2f,\"qualidade_ar\":%.2f,\"luminosidade\":%d}",
    ESTACAO_ID, temp, umid, pressao, ar, luz
  );

  int httpCode = http.POST(String(jsonPayload));
  http.end();

  if (httpCode > 0) {
    Serial.printf("Dados enviados com sucesso! HTTP Status: %d\n", httpCode);
    return true;
  } else {
    Serial.printf("Erro ao enviar payload. Código HTTP: %d\n", httpCode);
    return false;
  }
}

// SETUP
void setup() {
  Serial.begin(115200);
  Serial.println("\nInicializando Estação Meteorológica IoT...");

  analogReadResolution(12);

  // Inicialização do DHT22
  dht.begin();

  // Inicialização do BMP280 (I2C)
  Wire.begin(21, 22);
  if (!bmp.begin(0x76) && !bmp.begin(0x77)) {
    Serial.println("Alerta: BMP280 não encontrado no barramento I2C!");
  } else {
    Serial.println("✅ BMP280 Inicializado.");
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                    Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16,
                    Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
  }

  // Conectar ao Wi-Fi
  conectarWiFi();
}

// LOOP PRINCIPAL (Não-bloqueante)
void loop() {
  // Garante reconexão Wi-Fi contínua
  conectarWiFi();

  // Executa a leitura apenas quando o intervalo de 5 segundos é atingido
  if (millis() - ultimaLeituraMs >= INTERVALO_LEITURA_MS) {
    ultimaLeituraMs = millis();

    // 1. Leituras dos Sensores
    float temperatura = 0.0; //dht.readTemperature();
    float umidade = 0.0; //dht.readHumidity();
    float pressao = bmp.readPressure() / 100.0F; // Convertido para hPa
    
    // Leitura analógica bruta convertida para Porcentagem (0 a 100%)
    int brutoAr = lerAnalogicoEstavel(PIN_MQ135);
    float qualidadeAr = (float)map(brutoAr, 0, 4095, 0, 100); // 0% a 100% de poluição/gás

    int brutoLuz = lerAnalogicoEstavel(PIN_LDR);
    // Considerando o divisor de tensão onde mais luz = menor valor ou maior valor,
    // aqui mapeamos invertido caso o escuro seja alto, ou direto (0 a 4095 para 0 a 100):
    int luminosidade = map(brutoLuz, 0, 4095, 0, 100); 
luminosidade = constrain(luminosidade, 0, 100);

    // Monitoramento Local no Serial
    Serial.println("--------------------------------------------------");
    Serial.printf("🌡️ Temp: %.2f °C | 💧 Umid: %.2f %%\n", temperatura, umidade);
    Serial.printf("🎈 Pressão: %.2f hPa | 🌬️ Ar: %.0f %% | ☀️ Luz: %d %%\n", pressao, qualidadeAr, luminosidade);

    // Envio para o Banco via FastAPI
    enviarPayloadHTTP(temperatura, umidade, pressao, qualidadeAr, luminosidade);
  }
}