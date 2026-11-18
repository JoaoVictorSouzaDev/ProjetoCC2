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
const unsigned long INTERVALO_LEITURA_MS = 10000; // 1 minuto para testes

// MAPEAMENTO DE PINOS E SENSORES
#define PIN_DHT22 4
#define PIN_MQ135 36       // ADC1 (VP)
#define PIN_LDR 34         // ADC1
#define PIN_PLUVIOMETRO 25 // Pino digital para o Sensor Hall do Pluviômetro

// CALIBRAÇÃO DO PLUVIÔMETRO (Baseado no seu YAML do ESPHome)
const float RAIN_MM_PER_TIP = 0.64; // Cada tombo da báscula = 0.64 mm de chuva

#define DHTTYPE DHT22
DHT dht(PIN_DHT22, DHTTYPE);
Adafruit_BMP280 bmp;

// Variáveis de Controle de Tempo
unsigned long ultimaLeituraMs = 0;

// Variáveis do Pluviômetro (volatile é obrigatório para interrupções)
volatile int contadorTombos = 0;
volatile unsigned long ultimoPulsoPluviometro = 0;

// FUNÇÃO DE INTERRUPÇÃO DO PLUVIÔMETRO (Roda a cada passagem do ímã)
void IRAM_ATTR detectarTomboChuva() {
  unsigned long tempoAtual = millis();
  // Debounce de 200ms (evita contar ruído ou vibração da báscula)
  if (tempoAtual - ultimoPulsoPluviometro > 200) {
    contadorTombos++;
    ultimoPulsoPluviometro = tempoAtual;
  }
}

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

// Média amostral para leitura analógica estável
int lerAnalogicoEstavel(uint8_t pino, int amostras = 10) {
  long soma = 0;
  for (int i = 0; i < amostras; i++) {
    soma += analogRead(pino);
    delay(2);
  }
  return (int)(soma / amostras);
}

// Envio dos dados via POST para a API FastAPI (Agora incluindo 'pluviometria')
bool enviarPayloadHTTP(float temp, float umid, float pressao, float ar, int luz, float pluviometria) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  char jsonPayload[350];
  snprintf(jsonPayload, sizeof(jsonPayload),
    "{\"estacao_id\":%d,\"temperatura\":%.2f,\"umidade\":%.2f,\"pressao\":%.2f,\"qualidade_ar\":%.2f,\"luminosidade\":%d,\"pluviometria\":%.2f}",
    ESTACAO_ID, temp, umid, pressao, ar, luz, pluviometria
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

// SETUP'
void setup() {
  Serial.begin(115200);
  Serial.println("\nInicializando Estação Meteorológica IoT...");

  analogReadResolution(12);

  // Inicialização do Pluviômetro (Sensor Hall)
  pinMode(PIN_PLUVIOMETRO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_PLUVIOMETRO), detectarTomboChuva, FALLING);
  Serial.println("✅ Pluviômetro (Sensor Hall) Inicializado no GPIO 25.");

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
  conectarWiFi();

  if (millis() - ultimaLeituraMs >= INTERVALO_LEITURA_MS) {
    ultimaLeituraMs = millis();

    // 1. Leituras dos Sensores Climáticos
    float temperatura = dht.readTemperature();
    float umidade = dht.readHumidity();

    // Proteção contra falha ou desconexão do DHT22 (evita o bug de 125°C / NaN)
    if (isnan(temperatura) || isnan(umidade) || temperatura >= 120.0) {
      Serial.println("⚠️ Aviso: Falha na leitura do DHT22!");
      temperatura = 0.0;
      umidade = 0.0;
    }

    float pressao = bmp.readPressure() / 100.0F;
    
    int brutoAr = lerAnalogicoEstavel(PIN_MQ135);
    float qualidadeAr = (float)map(brutoAr, 0, 4095, 0, 100);

    int brutoLuz = lerAnalogicoEstavel(PIN_LDR);
    int luminosidade = map(brutoLuz, 0, 4095, 0, 100); 
    luminosidade = constrain(luminosidade, 0, 100);

    // 2. Leitura e Cálculo do Pluviômetro (Volume acumulado no intervalo)
    noInterrupts();
    int tombosNoIntervalo = contadorTombos;
    contadorTombos = 0; // Zera o contador para o próximo ciclo
    interrupts();

    float pluviometria = tombosNoIntervalo * RAIN_MM_PER_TIP;

    // 3. Monitoramento Local no Serial
    Serial.println("--------------------------------------------------");
    Serial.printf("🌡️ Temp: %.2f °C | 💧 Umid: %.2f %%\n", temperatura, umidade);
    Serial.printf("🎈 Pressão: %.2f hPa | 🌬️ Ar: %.0f %% | ☀️ Luz: %d %%\n", pressao, qualidadeAr, luminosidade);
    Serial.printf("🌧️ Pluviometria: %.2f mm (%d tombos)\n", pluviometria, tombosNoIntervalo);

    // 4. Envio para o Banco via FastAPI
    enviarPayloadHTTP(temperatura, umidade, pressao, qualidadeAr, luminosidade, pluviometria);
  }
}