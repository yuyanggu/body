// ============================================================
// imu-sensor.js — BLE connection to XIAO ESP32S3 Sense IMU
// ============================================================
// Streams accelerometer + gyroscope from a knee-mounted sensor
// over BLE. Computes micro-tremor and knee flexion angle.
// ============================================================

const SERVICE_UUID        = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Ring buffer size for tremor computation (1 sec at 50Hz)
const TREMOR_BUFFER_SIZE = 50;

// Complementary filter weights (gyro-dominant, accel corrects drift)
const GYRO_WEIGHT = 0.96;
const ACCEL_WEIGHT = 0.04;

// ---- State ----

export const imuState = {
    connected: false,
    connecting: false,
    // Raw latest sample
    accel: { x: 0, y: 0, z: 0 },  // g
    gyro:  { x: 0, y: 0, z: 0 },  // dps
    // Derived metrics
    tremor: 0,       // 0–1, micro-tremor magnitude
    kneeAngle: 0,    // degrees, 0 = standing straight
};

// Reconnection config
const RECONNECT_DELAY_MS = 500;
const RECONNECT_MAX_ATTEMPTS = 50;

// Private state
let _device = null;
let _characteristic = null;
let _accelMagHistory = [];      // ring buffer for tremor
let _gyroIntegral = 0;          // integrated pitch angle (radians)
let _calibrationOffset = 0;     // standing-straight angle offset
let _lastTimestamp = 0;
let _calibrated = false;
let _calibrationSamples = [];   // collect samples during calibration
const CALIBRATION_COUNT = 25;   // 0.5 sec of data at 50Hz
let _reconnectAttempts = 0;
let _reconnectTimer = null;
let _intentionalDisconnect = false;

// ---- Public API ----

/**
 * Check if Web Bluetooth is available in this browser.
 */
export function isBLEAvailable() {
    return !!(navigator.bluetooth);
}

/**
 * Connect to the KneeSensor BLE device.
 * Must be called from a user gesture (button click).
 */
export async function connectSensor() {
    if (imuState.connected || imuState.connecting) return;
    imuState.connecting = true;

    try {
        _device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }],
        });

        _device.addEventListener('gattserverdisconnected', _onDisconnect);

        const server = await _device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        _characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        _characteristic.addEventListener('characteristicvaluechanged', _onData);
        await _characteristic.startNotifications();

        // Reset state for new connection
        _accelMagHistory = [];
        _gyroIntegral = 0;
        _calibrationOffset = 0;
        _calibrated = false;
        _calibrationSamples = [];
        _lastTimestamp = performance.now();
        _reconnectAttempts = 0;
        _intentionalDisconnect = false;

        imuState.connected = true;
        imuState.connecting = false;
        console.log('[IMU] Connected to KneeSensor');

    } catch (err) {
        imuState.connecting = false;
        _reset();
        throw err;
    }
}

/**
 * Disconnect from the sensor (intentional — no auto-reconnect).
 */
export function disconnectSensor() {
    _intentionalDisconnect = true;
    if (_reconnectTimer) {
        clearTimeout(_reconnectTimer);
        _reconnectTimer = null;
    }
    if (_device && _device.gatt.connected) {
        _device.gatt.disconnect();
    }
    _reset();
}

// ---- BLE Data Handler ----

function _onData(event) {
    const dv = event.target.value; // DataView, 12 bytes
    if (dv.byteLength < 12) return;

    // Parse int16 little-endian, convert from milli-units to real units
    imuState.accel.x = dv.getInt16(0, true) / 1000;  // g
    imuState.accel.y = dv.getInt16(2, true) / 1000;
    imuState.accel.z = dv.getInt16(4, true) / 1000;
    imuState.gyro.x  = dv.getInt16(6, true) / 1000;  // dps
    imuState.gyro.y  = dv.getInt16(8, true) / 1000;
    imuState.gyro.z  = dv.getInt16(10, true) / 1000;

    const now = performance.now();
    const dt = (now - _lastTimestamp) / 1000; // seconds
    _lastTimestamp = now;

    // Guard against huge dt (first sample or resume from sleep)
    if (dt > 0.1) return;

    _computeTremor();
    _computeKneeAngle(dt);
}

// ---- Tremor Computation ----

function _computeTremor() {
    const { x, y, z } = imuState.accel;
    const mag = Math.sqrt(x * x + y * y + z * z);

    // Push to ring buffer
    _accelMagHistory.push(mag);
    if (_accelMagHistory.length > TREMOR_BUFFER_SIZE) {
        _accelMagHistory.shift();
    }

    // Need enough samples for meaningful stats
    if (_accelMagHistory.length < 10) {
        imuState.tremor = 0;
        return;
    }

    // Compute mean
    let sum = 0;
    for (let i = 0; i < _accelMagHistory.length; i++) {
        sum += _accelMagHistory[i];
    }
    const mean = sum / _accelMagHistory.length;

    // Compute standard deviation
    let variance = 0;
    for (let i = 0; i < _accelMagHistory.length; i++) {
        const diff = _accelMagHistory[i] - mean;
        variance += diff * diff;
    }
    variance /= _accelMagHistory.length;
    const stddev = Math.sqrt(variance);

    // Map to 0–1 range (8x scaling factor, tunable)
    imuState.tremor = Math.min(1, stddev * 8);
}

// ---- Knee Angle (Complementary Filter) ----

function _computeKneeAngle(dt) {
    const { x: ax, y: ay, z: az } = imuState.accel;
    const gyroY = imuState.gyro.y; // pitch axis for knee flexion

    // Accelerometer-derived pitch angle (radians)
    const accelPitch = Math.atan2(ax, Math.sqrt(ay * ay + az * az));

    // Gyroscope integration (convert dps to radians/sec)
    const gyroRad = gyroY * Math.PI / 180;
    _gyroIntegral += gyroRad * dt;

    // Complementary filter
    const filteredAngle = GYRO_WEIGHT * _gyroIntegral + ACCEL_WEIGHT * accelPitch;
    _gyroIntegral = filteredAngle; // prevent drift accumulation

    // Convert to degrees
    const angleDeg = filteredAngle * 180 / Math.PI;

    // Calibration: collect samples while standing straight
    if (!_calibrated) {
        _calibrationSamples.push(angleDeg);
        if (_calibrationSamples.length >= CALIBRATION_COUNT) {
            let calSum = 0;
            for (let i = 0; i < _calibrationSamples.length; i++) {
                calSum += _calibrationSamples[i];
            }
            _calibrationOffset = calSum / _calibrationSamples.length;
            _calibrated = true;
            console.log('[IMU] Calibrated — standing offset:', _calibrationOffset.toFixed(1) + '°');
        }
        imuState.kneeAngle = 0;
        return;
    }

    // Output angle relative to standing position
    imuState.kneeAngle = Math.abs(angleDeg - _calibrationOffset);
}

// ---- Disconnect Handler + Auto-Reconnect ----

function _onDisconnect() {
    imuState.connected = false;
    _characteristic = null;

    if (_intentionalDisconnect) {
        console.log('[IMU] Sensor disconnected (user requested)');
        _reset();
        return;
    }

    console.log('[IMU] Sensor disconnected — will attempt to reconnect...');
    _scheduleReconnect();
}

function _scheduleReconnect() {
    if (_reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        console.log('[IMU] Max reconnect attempts reached, giving up');
        _reset();
        return;
    }

    _reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * Math.min(_reconnectAttempts, 3);
    console.log(`[IMU] Reconnect attempt ${_reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS} in ${delay}ms...`);

    imuState.connecting = true;

    _reconnectTimer = setTimeout(async () => {
        _reconnectTimer = null;
        if (!_device || _intentionalDisconnect) return;

        try {
            const server = await _device.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);
            _characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

            _characteristic.addEventListener('characteristicvaluechanged', _onData);
            await _characteristic.startNotifications();

            _lastTimestamp = performance.now();
            _reconnectAttempts = 0;

            imuState.connected = true;
            imuState.connecting = false;
            console.log('[IMU] Reconnected successfully');

        } catch (err) {
            console.log('[IMU] Reconnect failed:', err.message);
            _scheduleReconnect();
        }
    }, delay);
}

function _reset() {
    imuState.connected = false;
    imuState.connecting = false;
    imuState.accel = { x: 0, y: 0, z: 0 };
    imuState.gyro  = { x: 0, y: 0, z: 0 };
    imuState.tremor = 0;
    imuState.kneeAngle = 0;
    _accelMagHistory = [];
    _gyroIntegral = 0;
    _calibrationOffset = 0;
    _calibrated = false;
    _calibrationSamples = [];
    _device = null;
    _characteristic = null;
    _reconnectAttempts = 0;
    if (_reconnectTimer) {
        clearTimeout(_reconnectTimer);
        _reconnectTimer = null;
    }
}
