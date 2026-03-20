/*
 * Knee IMU WiFi — XIAO ESP32S3 + MPU-6050
 *
 * Reads MPU-6050 accelerometer + gyroscope at 50Hz
 * and streams 12-byte packets over WebSocket.
 *
 * Uses raw I2C registers (no Adafruit library) to avoid
 * Wire.begin() pin conflicts on XIAO ESP32S3.
 *
 * Wiring (I2C):
 *   MPU-6050 VCC → 3V3
 *   MPU-6050 GND → GND
 *   MPU-6050 SDA → D4 (GPIO5)
 *   MPU-6050 SCL → D5 (GPIO6)
 *
 * Packet format (little-endian, same as BLE version):
 *   [0-1]  accelX  (int16, milli-g)
 *   [2-3]  accelY  (int16, milli-g)
 *   [4-5]  accelZ  (int16, milli-g)
 *   [6-7]  gyroX   (int16, milli-dps)
 *   [8-9]  gyroY   (int16, milli-dps)
 *   [10-11] gyroZ  (int16, milli-dps)
 *
 * Mount: right shin, just below knee.
 * Board Y-axis perpendicular to sagittal plane (pitch = knee flexion).
 *
 * ──────────────────────────────────────────────────────
 *  TO REVERT TO BLE: flash arduino/knee_imu_ble/knee_imu_ble.ino
 *  and revert lib/imu-sensor.js from lib/imu-sensor-ble.js
 * ──────────────────────────────────────────────────────
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <Wire.h>

// ════════════════════════════════════════════════════════
//  WiFi credentials — change these when switching networks
// ════════════════════════════════════════════════════════
const char* WIFI_SSID = "Yuyang's iPhone (3)";
const char* WIFI_PASS = "qawsed123";
// ════════════════════════════════════════════════════════

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Timing
#define NOTIFY_INTERVAL_MS 20  // 50Hz

// I2C pins for XIAO ESP32S3
#define I2C_SDA 5  // D4 = GPIO5
#define I2C_SCL 6  // D5 = GPIO6

// MPU-6050 registers
#define MPU_ADDR       0x68
#define REG_PWR_MGMT_1 0x6B
#define REG_WHO_AM_I   0x75
#define REG_ACCEL_CFG  0x1C
#define REG_GYRO_CFG   0x1B
#define REG_CONFIG     0x1A
#define REG_ACCEL_XOUT 0x3B

// State
bool clientConnected = false;
uint8_t clientNum = 0;
unsigned long lastNotifyTime = 0;

// --- Raw I2C helpers ---
void writeReg(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(reg);
    Wire.write(val);
    Wire.endTransmission();
}

uint8_t readReg(uint8_t reg) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(reg);
    Wire.endTransmission(false);
    Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)1);
    return Wire.read();
}

// WebSocket event handler
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("WebSocket client [%u] disconnected\n", num);
            clientConnected = false;
            break;
        case WStype_CONNECTED:
            Serial.printf("WebSocket client [%u] connected\n", num);
            clientConnected = true;
            clientNum = num;
            break;
        case WStype_TEXT:
            // Could handle commands here if needed
            break;
        default:
            break;
    }
}

void setup() {
    Serial.begin(115200);
    delay(2000);
    Serial.println("Knee IMU WiFi starting...");

    // Init I2C with explicit pins
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(100000);
    delay(250);

    // Verify MPU-6050 is present
    uint8_t whoami = readReg(REG_WHO_AM_I);
    Serial.print("WHO_AM_I = 0x");
    Serial.println(whoami, HEX);

    if (whoami == 0x00 || whoami == 0xFF) {
        Serial.println("No response — check wiring!");
        while (1) delay(1000);
    }
    Serial.println("IMU found! (may be MPU-6050 compatible clone)");

    // Wake up (clear sleep bit)
    writeReg(REG_PWR_MGMT_1, 0x00);
    delay(100);

    // Configure: +-8G accel, +-500 dps gyro, 21Hz bandwidth
    writeReg(REG_ACCEL_CFG, 0x10);  // AFS_SEL=2 → +-8G
    writeReg(REG_GYRO_CFG, 0x08);   // FS_SEL=1  → +-500 dps
    writeReg(REG_CONFIG, 0x04);      // DLPF_CFG=4 → ~21Hz bandwidth

    Serial.println("  Accel: +-8G  Gyro: +-500dps  Filter: 21Hz");

    // Connect to WiFi
    Serial.printf("Connecting to WiFi '%s'...\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    WiFi.setAutoReconnect(true);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("════════════════════════════════════════");
        Serial.print("  WiFi connected! IP: ");
        Serial.println(WiFi.localIP());
        Serial.println("  WebSocket server on port 81");
        Serial.printf("  Connect from browser: ws://%s:81\n", WiFi.localIP().toString().c_str());
        Serial.println("════════════════════════════════════════");
    } else {
        Serial.println("\nWiFi connection FAILED — sensor will still print to serial");
    }

    // Start WebSocket server
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);

    Serial.println("Waiting for WebSocket client...");
}

// Serial print throttle (print at 5Hz, not 50Hz — keeps monitor readable)
unsigned long lastPrintTime = 0;
#define PRINT_INTERVAL_MS 200

void loop() {
    unsigned long now = millis();

    // Handle WebSocket events
    webSocket.loop();

    // Reconnect WiFi if dropped
    if (WiFi.status() != WL_CONNECTED) {
        static unsigned long lastReconnect = 0;
        if (now - lastReconnect > 5000) {
            lastReconnect = now;
            Serial.println("WiFi lost — reconnecting...");
            WiFi.reconnect();
        }
    }

    // Read sensor at 50Hz (always, so serial works even without WiFi)
    if (now - lastNotifyTime >= NOTIFY_INTERVAL_MS) {
        lastNotifyTime = now;

        // Read 14 bytes: accelXYZ (6) + temp (2) + gyroXYZ (6)
        Wire.beginTransmission(MPU_ADDR);
        Wire.write(REG_ACCEL_XOUT);
        Wire.endTransmission(false);
        Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14);

        int16_t rawAx = (Wire.read() << 8) | Wire.read();
        int16_t rawAy = (Wire.read() << 8) | Wire.read();
        int16_t rawAz = (Wire.read() << 8) | Wire.read();
        int16_t rawT  = (Wire.read() << 8) | Wire.read();  // skip temp
        int16_t rawGx = (Wire.read() << 8) | Wire.read();
        int16_t rawGy = (Wire.read() << 8) | Wire.read();
        int16_t rawGz = (Wire.read() << 8) | Wire.read();

        // Convert raw → milli-g and milli-dps
        // +-8G range: sensitivity = 4096 LSB/g
        // +-500dps range: sensitivity = 65.5 LSB/dps
        float ax = (float)rawAx / 4096.0f;   // → g
        float ay = (float)rawAy / 4096.0f;
        float az = (float)rawAz / 4096.0f;
        float gx = (float)rawGx / 65.5f;     // → dps
        float gy = (float)rawGy / 65.5f;
        float gz = (float)rawGz / 65.5f;

        // Pack as int16 milli-units (same format as BLE version)
        int16_t data[6];
        data[0] = (int16_t)(ax * 1000.0f);   // milli-g
        data[1] = (int16_t)(ay * 1000.0f);
        data[2] = (int16_t)(az * 1000.0f);
        data[3] = (int16_t)(gx * 1000.0f);   // milli-dps
        data[4] = (int16_t)(gy * 1000.0f);
        data[5] = (int16_t)(gz * 1000.0f);

        // Send over WebSocket if client connected
        if (clientConnected) {
            webSocket.sendBIN(clientNum, (uint8_t*)data, 12);
        }

        // Print to serial at 5Hz
        if (now - lastPrintTime >= PRINT_INTERVAL_MS) {
            lastPrintTime = now;
            char buf[120];
            snprintf(buf, sizeof(buf),
                "A: %+7.2fg %+7.2fg %+7.2fg | G: %+7.1f %+7.1f %+7.1f dps%s",
                ax, ay, az, gx, gy, gz,
                clientConnected ? "  [WS]" : "");
            Serial.println(buf);
        }
    }
}
