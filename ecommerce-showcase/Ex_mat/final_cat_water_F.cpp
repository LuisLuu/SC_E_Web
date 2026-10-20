#include <WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"

const char* ssid = SECRET_SSID;
const char* password = SECRET_PASS;
const char* mqtt_server = SECRET_MQTT_IP;

const int PIR_PIN = 3;       
const int PUMP_PIN = 10;     
const int BOARD_LED = 8;     

const unsigned long PUMP_RUN_TIME = 5000;  
const unsigned long COOLDOWN_TIME = 3000;  
const unsigned long DEBOUNCE_TIME = 100;   
const unsigned long CALIBRATION_TIME = 30000; 
const unsigned long HEARTBEAT_INTERVAL = 10000;

unsigned long pumpStartTime = 0;
unsigned long motionHighStart = 0;
unsigned long lastHeartbeat = 0;

bool isPumping = false;
bool inCooldown = false;
bool isMotionVerifying = false;

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.print("\n[MQTT INBOUND] Topic: ");
  Serial.print(topic);
  Serial.print(" | Payload: ");
  Serial.println(message);

  if (message == "PUMP_ON" && !isPumping) {
    Serial.println(">>> AI OVERRIDE: Activating Pump! <<<");
    isPumping = true;
    pumpStartTime = millis();
    digitalWrite(PUMP_PIN, HIGH);   
    digitalWrite(BOARD_LED, LOW); 
    
    client.publish("home/fountain/telemetry", "{\"pump_status\": \"AI_OVERRIDE_ON\"}");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_Fountain_Client")) {
      Serial.println(" CONNECTED!");
      client.subscribe("home/fountain/command");
      
      // Publish retained ONLINE status
      client.publish("home/fountain/telemetry", "{\"system_status\": \"ONLINE\", \"pump_status\": \"OFF\"}", true);
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000); 
  Serial.println("\n\n=== ESP32-C3 WATER FOUNTAIN BOOTING ===");

  pinMode(PIR_PIN, INPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(BOARD_LED, OUTPUT);

  digitalWrite(PUMP_PIN, LOW);   
  digitalWrite(BOARD_LED, HIGH); 

  Serial.print("Connecting to WiFi network: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected successfully!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

// === THE ONE AND ONLY LOOP ===
void loop() {
  if (!client.connected()) reconnect();
  client.loop(); 

  // 1. The 10-Second Retained Heartbeat
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    String currentPumpState = isPumping ? "ON" : "OFF";
    String payload = "{\"system_status\": \"ONLINE\", \"pump_status\": \"" + currentPumpState + "\"}";
    
    // Publish as retained so the dashboard sees it instantly on refresh
    client.publish("home/fountain/telemetry", payload.c_str(), true);
  }

  // 2. The PIR Motion Logic (with 30s calibration block)
  if (millis() > CALIBRATION_TIME) {
    int pirState = digitalRead(PIR_PIN);

    if (pirState == HIGH && !isPumping && !inCooldown) {
      if (!isMotionVerifying) {
        isMotionVerifying = true;
        motionHighStart = millis();
      } else if (millis() - motionHighStart >= DEBOUNCE_TIME) {
        Serial.println(">>> MOTION DETECTED: Activating Pump! <<<");
        isPumping = true;
        isMotionVerifying = false;
        pumpStartTime = millis();

        digitalWrite(PUMP_PIN, HIGH);   
        digitalWrite(BOARD_LED, LOW);
        client.publish("home/fountain/telemetry", "{\"pump_status\": \"MOTION_TRIGGERED\"}");
      }
    } else {
      isMotionVerifying = false;
    }
  }

  // 3. Pump Auto-Shutoff Logic
  if (isPumping && (millis() - pumpStartTime >= PUMP_RUN_TIME)) {
    Serial.println("Pump run time complete. Shutting down.");
    isPumping = false;
    inCooldown = true;

    digitalWrite(PUMP_PIN, LOW);    
    digitalWrite(BOARD_LED, HIGH);  
    
    // Publish the OFF state as retained as well!
    client.publish("home/fountain/telemetry", "{\"pump_status\": \"OFF\"}", true);
  }

  // 4. Cooldown Timer
  if (inCooldown && (millis() - (pumpStartTime + PUMP_RUN_TIME) >= COOLDOWN_TIME)) {
    inCooldown = false;
    Serial.println("Cooldown finished. Ready for motion.");
  }
}