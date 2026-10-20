Control Dashboard (With AI)

A full-stack, local AI orchestration platform demonstrating deterministic edge-hardware actuation, real-time MQTT telemetry, and natural language command routing. Engineered with zero cloud dependencies.

System Architecture

* **Edge Node:** ESP32-C3 RISC-V executing a non-blocking C++ state machine. Features debounced PIR motion sensing, 10s retained-state MQTT heartbeats, and local physical overrides.
* **Hardware Protection:** Inductive load isolation via 1N5819 flyback diode and a dual 470µF/0.1µF decoupling capacitor array to prevent logic-level brownouts during motor stall-current spikes.
* **Middleware Broker:** Node.js Aedes dual-broker streaming raw TCP (Port 1883) for the microcontroller and WebSockets (Port 9001) for the frontend.
* **AI Orchestration Layer:** 3-Tier local LLM pipeline (via Ollama):
  1. **Router:** Llama 3.2 (1B) for low-latency intent classification.
  2. **Executor:** Llama 3.1 (8B) for deterministic tool-calling and MQTT actuation.
  3. **Synthesizer:** Gemma 2 for context-aware user feedback.
* **Frontend:** React-based telemetry dashboard with auto-discovery, live Firehose logging, and dynamic state recovery.

Flow Diagram

[ PIR Sensor ] ──> [ ESP32-C3 Edge Node ] <──(MQTT 1883)──┐
                                                          │
[ React Fleet Hub ] <───(WebSocket 9001)────> [ Aedes Broker / Node Backend ]
                                                          │
[ Natural Language ] ──> [ Local Ollama AI Layer ] ───────┘

Quickstart

### 1. Firmware Setup
1. Navigate to `/firmware`.
2. Rename `secrets.example.h` to `secrets.h` and input your 2.4GHz Wi-Fi credentials and Node backend IPv4 address.
3. Flash to the ESP32-C3 via Arduino IDE (Enable USB CDC On Boot).

### 2. Backend & AI Layer
1. Ensure Ollama is running locally with `llama3.2:1b`, `llama3.1:8b`, and `gemma2:latest`.
2. Navigate to `/dashboard-backend`.
3. Run `npm install` then `node server.js`.

### 3. Frontend Dashboard
1. Navigate to `/dashboard-frontend`.
2. Run `npm install` then `npm run dev`.
3. Open the local dashboard to monitor real-time WebSocket telemetry and issue AI override commands.