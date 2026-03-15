/*
 * MPU-6050 Pin Finder — XIAO ESP32S3
 *
 * Tries every likely I2C pin combination to find the MPU-6050.
 * Upload this, open Serial Monitor at 115200, and it will tell you
 * which pins work.
 *
 * Keep your 4 wires connected as they are.
 */

#include <Wire.h>

#define MPU_ADDR 0x68

// All usable GPIO pins on XIAO ESP32S3
// D0=GPIO1, D1=GPIO2, D2=GPIO3, D3=GPIO4, D4=GPIO5, D5=GPIO6,
// D6=GPIO43, D7=GPIO44, D8=GPIO7, D9=GPIO8, D10=GPIO9
int pins[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 43, 44};
const char* pinNames[] = {"D0(GPIO1)", "D1(GPIO2)", "D2(GPIO3)", "D3(GPIO4)",
                           "D4(GPIO5)", "D5(GPIO6)", "D8(GPIO7)", "D9(GPIO8)",
                           "D10(GPIO9)", "D6(GPIO43)", "D7(GPIO44)"};
int numPins = 11;

bool scanBus(int sda, int gnd_scl) {
    Wire.begin(sda, gnd_scl);
    Wire.setClock(100000);
    delay(50);

    Wire.beginTransmission(MPU_ADDR);
    byte err = Wire.endTransmission();

    Wire.end();
    delay(10);

    return (err == 0);
}

void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);
    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println("  MPU-6050 Pin Finder — XIAO ESP32S3");
    Serial.println("========================================");
    Serial.println();
    Serial.println("Testing all pin combinations for I2C device at 0x68...");
    Serial.println("(This takes about 30 seconds)");
    Serial.println();

    int found = 0;

    for (int i = 0; i < numPins; i++) {
        for (int j = 0; j < numPins; j++) {
            if (i == j) continue;  // SDA and SCL must be different pins

            int sdaPin = pins[i];
            int sclPin = pins[j];

            if (scanBus(sdaPin, sclPin)) {
                Serial.print("  >>> FOUND MPU-6050!  SDA = ");
                Serial.print(pinNames[i]);
                Serial.print(",  SCL = ");
                Serial.println(pinNames[j]);
                found++;
            }
        }
    }

    Serial.println();
    if (found > 0) {
        Serial.println("========================================");
        Serial.print("  Found ");
        Serial.print(found);
        Serial.println(" working combination(s) above.");
        Serial.println("  Use the first one in your sketch.");
        Serial.println("========================================");
        Serial.println();

        // Now do a full test with the first working combo
        // Re-scan to find it again
        for (int i = 0; i < numPins; i++) {
            for (int j = 0; j < numPins; j++) {
                if (i == j) continue;
                if (scanBus(pins[i], pins[j])) {
                    // Use this combo for the live test
                    Serial.println("Starting live sensor test...");
                    Serial.println();
                    Wire.begin(pins[i], pins[j]);
                    Wire.setClock(100000);
                    delay(50);

                    // Read WHO_AM_I
                    Wire.beginTransmission(MPU_ADDR);
                    Wire.write(0x75);
                    Wire.endTransmission(false);
                    Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)1);
                    uint8_t whoami = Wire.read();
                    Serial.print("  WHO_AM_I = 0x");
                    Serial.println(whoami, HEX);

                    // Wake up
                    Wire.beginTransmission(MPU_ADDR);
                    Wire.write(0x6B);
                    Wire.write(0x00);
                    Wire.endTransmission();
                    delay(100);
                    Serial.println("  Sensor awake. Reading data...");
                    Serial.println();
                    Serial.println("  AccelX  AccelY  AccelZ  | GyroX   GyroY   GyroZ");
                    Serial.println("  ------  ------  ------  | ------  ------  ------");
                    return;  // go to loop()
                }
            }
        }
    } else {
        Serial.println("========================================");
        Serial.println("  NO WORKING PIN COMBINATION FOUND!");
        Serial.println("========================================");
        Serial.println();
        Serial.println("  This means the problem is NOT the pin mapping.");
        Serial.println("  Possible causes:");
        Serial.println("    1. Bad jumper wire — try different wires");
        Serial.println("    2. Bad solder joint on header pins");
        Serial.println("    3. MPU-6050 board is dead (LED on ≠ chip working)");
        Serial.println("    4. SDA/SCL not connected to correct MPU-6050 pins");
        Serial.println();
        Serial.println("  Try: swap each wire one at a time with a known-good one.");
        while (1) delay(1000);
    }
}

void loop() {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14);

    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    int16_t temp = (Wire.read() << 8) | Wire.read();
    int16_t gx = (Wire.read() << 8) | Wire.read();
    int16_t gy = (Wire.read() << 8) | Wire.read();
    int16_t gz = (Wire.read() << 8) | Wire.read();

    char buf[80];
    snprintf(buf, sizeof(buf), "  %6d  %6d  %6d  | %6d  %6d  %6d",
             ax, ay, az, gx, gy, gz);
    Serial.println(buf);

    delay(500);
}
