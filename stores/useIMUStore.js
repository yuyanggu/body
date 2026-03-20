import { create } from 'zustand';

const useIMUStore = create((set) => ({
    connected: false,
    connecting: false,
    accelX: 0, accelY: 0, accelZ: 0,
    gyroX: 0, gyroY: 0, gyroZ: 0,
    tremor: 0,
    kneeAngle: 0,

    updateFromIMU: (imuState) => {
        set({
            connected: imuState.connected,
            connecting: imuState.connecting,
            accelX: imuState.accel.x,
            accelY: imuState.accel.y,
            accelZ: imuState.accel.z,
            gyroX: imuState.gyro.x,
            gyroY: imuState.gyro.y,
            gyroZ: imuState.gyro.z,
            tremor: imuState.tremor,
            kneeAngle: imuState.kneeAngle,
        });
    },
}));

export default useIMUStore;
