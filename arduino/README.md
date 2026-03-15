# Knee IMU BLE — Arduino Setup Guide

Firmware for the Seeed Studio XIAO ESP32S3 + MPU-6050. Streams 6-axis IMU data (accelerometer + gyroscope) over BLE at 50Hz.

## Hardware

- **Board**: Seeed Studio XIAO ESP32S3 (any variant)
- **IMU**: MPU-6050 breakout board (external, wired via I2C)
- **Mount**: Right shin, just below the knee, strapped with an elastic band
- **Orientation**: Board Y-axis perpendicular to the sagittal plane (so pitch rotation = knee flexion)

## Wiring

4 wires between the MPU-6050 breakout and the XIAO ESP32S3:

```
MPU-6050        XIAO ESP32S3
────────        ────────────
VCC  ─────────  3V3
GND  ─────────  GND
SDA  ─────────  D4 (GPIO5)
SCL  ─────────  D5 (GPIO6)
```

Most MPU-6050 breakout boards include pull-up resistors on SDA/SCL — no extra components needed.

Leave the MPU-6050's AD0 pin unconnected (or tied to GND) for I2C address 0x68.

## Arduino IDE Setup

1. **Install Arduino IDE 2.x** from https://www.arduino.cc/en/software

2. **Add ESP32 board support**:
   - Go to `File → Preferences`
   - In "Additional boards manager URLs", add:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to `Tools → Board → Board Manager`
   - Search "esp32", install **"esp32 by Espressif Systems"** (v2.0.14 or later)

3. **Select board**:
   - `Tools → Board → esp32 → XIAO_ESP32S3`

4. **Install MPU-6050 library**:
   - `Sketch → Include Library → Manage Libraries`
   - Search "Adafruit MPU6050", install it
   - It will prompt to install dependencies — click **Install All** (installs Adafruit Unified Sensor + BusIO)

5. **Connect & upload**:
   - Wire the MPU-6050 to the XIAO ESP32S3 as shown above
   - Plug in the XIAO ESP32S3 via USB-C
   - Select the correct port under `Tools → Port` (usually `/dev/cu.usbmodem*` on Mac)
   - Click Upload

## Verifying It Works

1. Open `Tools → Serial Monitor` at 115200 baud
2. You should see:
   ```
   Knee IMU BLE starting...
   MPU-6050 initialized
     Accel range: +-8G  Gyro range: +-500 dps
     Filter: 21Hz bandwidth
   BLE advertising started — waiting for connection...
   ```
3. On your phone, open **nRF Connect** (free app)
4. Scan for BLE devices — you should see **"KneeSensor"**
5. Connect to it — the Serial Monitor should print "BLE client connected"
6. In nRF Connect, find the service `6e400001-...` and enable notifications on characteristic `6e400003-...`
7. You should see 12-byte data packets arriving at ~50Hz

## Data Format

Each BLE notification is 12 bytes (6 × int16, little-endian):

| Bytes | Field  | Unit       |
|-------|--------|------------|
| 0–1   | accelX | milli-g    |
| 2–3   | accelY | milli-g    |
| 4–5   | accelZ | milli-g    |
| 6–7   | gyroX  | milli-dps  |
| 8–9   | gyroY  | milli-dps  |
| 10–11 | gyroZ  | milli-dps  |

## Troubleshooting

- **"MPU-6050 not found!"**: Check the 4-wire connections. VCC→3V3, GND→GND, SDA→D4, SCL→D5. Make sure you're using a 3.3V-compatible breakout (most are).
- **"platform esp32:esp32 is not installed"**: You need to install the ESP32 board package. Go to Board Manager, search "esp32", and install "esp32 by Espressif Systems".
- **Board not detected**: Try holding the BOOT button while plugging in USB, then release.
- **BLE not advertising**: Ensure no other device is connected. Only one BLE central can connect at a time.
- **Noisy readings**: Make sure the wiring is solid — loose jumper wires cause I2C errors. Solder connections for the knee wearable.
