// ============================================================
// imu-sensor.js — WebSocket connection to XIAO ESP32S3 IMU
// ============================================================
// Streams accelerometer + gyroscope from a knee-mounted sensor
// over WiFi WebSocket. Computes micro-tremor and knee flexion angle.
//
// TO REVERT TO BLE: copy lib/imu-sensor-ble.js → lib/imu-sensor.js
// and flash arduino/knee_imu_ble/knee_imu_ble.ino onto the board.
// ============================================================

const WEBSOCKET_PORT = 81;
const LOCALSTORAGE_KEY = 'imu_sensor_ip';

// ════════════════════════════════════════════════════════
//  Known sensor IPs — add new entries here as needed.
//  Auto-connect tries each in order until one responds.
// ════════════════════════════════════════════════════════
const KNOWN_SENSOR_IPS = [
    '192.168.18.116',   // Home WiFi (ALHN-F1A4)
    // '192.168.1.42',  // Example: studio WiFi
    // '10.0.0.50',     // Example: university WiFi
];

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
const RECONNECT_MAX_ATTEMPTS = 100;

// Private state
let _ws = null;
let _sensorIP = null;
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
 * Get the stored sensor IP from localStorage, or null.
 */
export function getStoredSensorIP() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LOCALSTORAGE_KEY);
}

/**
 * Get the list of known sensor IPs (hardcoded + stored).
 */
export function getKnownIPs() {
    const stored = getStoredSensorIP();
    const ips = [...KNOWN_SENSOR_IPS];
    if (stored && !ips.includes(stored)) {
        ips.unshift(stored); // prioritize last-used IP
    }
    return ips;
}

/**
 * Connect to the KneeSensor via WebSocket.
 * @param {string} ip - IP address of the ESP32 (e.g. "192.168.1.42")
 */
export async function connectSensor(ip) {
    if (imuState.connected || imuState.connecting) return;
    if (!ip) throw new Error('No sensor IP provided');

    _sensorIP = ip;
    _intentionalDisconnect = false;
    imuState.connecting = true;

    // Store IP for next time
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCALSTORAGE_KEY, ip);
    }

    _connect();
}

/**
 * Auto-connect by trying known IPs in order.
 * Tries each IP with a short timeout, connects to the first that responds.
 */
export async function autoConnect() {
    if (imuState.connected || imuState.connecting) return;

    const ips = getKnownIPs();
    if (ips.length === 0) return false;

    console.log(`[IMU] Auto-connect: trying ${ips.length} known IP(s)...`);

    for (const ip of ips) {
        const success = await _tryConnect(ip, 2000);
        if (success) return true;
    }

    console.log('[IMU] Auto-connect: no sensor found');
    return false;
}

/**
 * Try connecting to an IP with a timeout. Returns true if connected.
 */
function _tryConnect(ip, timeoutMs) {
    return new Promise((resolve) => {
        const url = `ws://${ip}:${WEBSOCKET_PORT}`;
        console.log(`[IMU] Trying ${url}...`);

        let settled = false;
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                ws.close();
                resolve(false);
            }
        }, timeoutMs);

        ws.onopen = () => {
            if (settled) { ws.close(); return; }
            settled = true;
            clearTimeout(timer);
            ws.close(); // close the probe, connectSensor will open the real one
            console.log(`[IMU] Found sensor at ${ip}`);
            connectSensor(ip);
            resolve(true);
        };

        ws.onerror = () => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve(false);
            }
        };
    });
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
    if (_ws) {
        _ws.close();
    }
    _reset();
}

/**
 * Check if WebSocket is available (always true in modern browsers).
 */
export function isBLEAvailable() {
    return typeof WebSocket !== 'undefined';
}

// ---- WebSocket Connection ----

function _connect() {
    try {
        const url = `ws://${_sensorIP}:${WEBSOCKET_PORT}`;
        console.log(`[IMU] Connecting to ${url}...`);

        _ws = new WebSocket(url);
        _ws.binaryType = 'arraybuffer';

        _ws.onopen = () => {
            // Reset state for new connection
            _accelMagHistory = [];
            _gyroIntegral = 0;
            _calibrationOffset = 0;
            _calibrated = false;
            _calibrationSamples = [];
            _lastTimestamp = performance.now();
            _reconnectAttempts = 0;

            imuState.connected = true;
            imuState.connecting = false;
            console.log(`[IMU] Connected to KneeSensor at ${_sensorIP}`);
        };

        _ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                _onData(event.data);
            }
        };

        _ws.onclose = () => {
            imuState.connected = false;

            if (_intentionalDisconnect) {
                console.log('[IMU] Sensor disconnected (user requested)');
                _reset();
                return;
            }

            console.log('[IMU] WebSocket closed — will attempt to reconnect...');
            _scheduleReconnect();
        };

        _ws.onerror = (err) => {
            console.log('[IMU] WebSocket error');
            // onclose will fire after this, triggering reconnect
        };

    } catch (err) {
        imuState.connecting = false;
        console.log('[IMU] Connection failed:', err.message);
        _scheduleReconnect();
    }
}

// ---- Data Handler ----

function _onData(buffer) {
    if (buffer.byteLength < 12) return;

    const dv = new DataView(buffer);

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

// ---- Auto-Reconnect ----

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

    _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        if (!_sensorIP || _intentionalDisconnect) return;
        _connect();
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
    _ws = null;
    _sensorIP = null;
    _reconnectAttempts = 0;
    if (_reconnectTimer) {
        clearTimeout(_reconnectTimer);
        _reconnectTimer = null;
    }
}
