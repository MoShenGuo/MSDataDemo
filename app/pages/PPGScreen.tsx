import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
// import ECGWaveView from "./ECGWaveView";
import { BleSDK } from "@moshenguo/ms-data-sdk";
// import * as BleConst from "ms-data-sdk/build/sdk/bleConst";
// const { DeviceConst } = BleConst;
import { useNavigation, useRoute } from "@react-navigation/core";
import ECGChartView, { ECGChartRef } from "./ECGChartView";
const { width } = Dimensions.get("window");

const TEST_TIME = 300;

export default function PPGScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mac, name } = route.params || {};

  /** ===== 测量状态 ===== */
  const isMeasuringRef = useRef(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const [progress, setProgress] = useState(0);

  /** ===== 丢包统计 ===== */
  const lastPacketIdRef = useRef<number | null>(null);
  const lostTimestampsRef = useRef<number[]>([]);
  const totalLostCountRef = useRef(0);

  const [totalLost, setTotalLost] = useState(0);
  const [lostIn5s, setLostIn5s] = useState(0);
  // 保存 writeData 引用
  const writeDataRef = React.useRef<((data: any) => void) | null>(null);
  /** ===== ECG 数据 ===== */
  const waveRef = useRef<ECGChartRef | null>(null);
  const start = () => {
    isMeasuringRef.current = true;
    setIsMeasuring(true);
    safeWrite(BleSDK.healthMeasurementWithDataType(0x04, true, null)); //
  };

  const stop = () => {
    isMeasuringRef.current = false;
    setIsMeasuring(false);
    safeWrite(BleSDK.healthMeasurementWithDataType(0x04, false, null)); //
  };

  /** ================== 数据接收 ================== */
  const onRawDataReceived = useCallback((data: number[]) => {
    if (!data || data.length < 2) return;

    const type = data[0];

    // 0x28: 设备询问是否实时波形
    if (type === 0x28) {
      if (isMeasuringRef.current) {
        console.log('---true')
        safeWrite(BleSDK.realECGWave(true));

      } else {
        console.log('---false')
        safeWrite(BleSDK.realECGWave(false));
      }
      // 这里通常不用处理，是否实时由 start/stop 控制
    } else if (type === 0x07) {
      // 7: ECG 数据
      if (data.length > 16) {
        const packetId = data[1];
        handlePacketId(packetId);

        const ecgValues: number[] = [];
        const count = Math.floor((data.length - 2) / 3);

        for (let i = 0; i < count; i++) {
          const value =
            data[2 + 3 * i] |
            (data[3 + 3 * i] << 8) |
            (data[4 + 3 * i] << 16);

          ecgValues.push(adcToMv(value));
        }

        waveRef.current?.addShowDatasECG?.(ecgValues)
      }

    }


  }, []);
  // 更新 writeData
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };
  /** ================== 丢包统计 ================== */
  const handlePacketId = (packetId: number) => {
    const last = lastPacketIdRef.current;

    if (last === null) {
      lastPacketIdRef.current = packetId;
      return;
    }

    const expected = (last + 1) & 0xff;

    if (packetId !== expected) {
      const lost = (packetId - expected) & 0xff;
      totalLostCountRef.current += lost;

      const now = Date.now() / 1000;
      for (let i = 0; i < lost; i++) {
        lostTimestampsRef.current.push(now);
      }

      setTotalLost(totalLostCountRef.current);
    }

    lastPacketIdRef.current = packetId;
    updateLostIn5s();
  };

  const updateLostIn5s = () => {
    const now = Date.now() / 1000;
    const window = 5;

    const valid = lostTimestampsRef.current.filter(
      (t) => now - t <= window
    );

    lostTimestampsRef.current = valid;
    setLostIn5s(valid.length);
  };

  /** ================== ADC 转换 ================== */
  const adcToMv = (value: number) => {
    const temp = (2.4 * 1000) / (126976 * 32);
    const allTemp = value - 63488 * 32;
    return (allTemp * temp) / 20.6;
  };
  const safeWrite = (cmd: any) => {
    writeDataRef.current?.(cmd);
  };

  const renderBleButton = (
    connected: boolean,
    connect: (deviceId: string) => void
  ) => {
    let text = "连接蓝牙";
    let disabled = false;

    if (connected) {
      text = "已连接";
      disabled = true;
    }

    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          connect(mac);
        }}
        style={[
          styles.bleBtn,
          disabled && styles.btnDisabled,
        ]}
      >
        <Text>{text}</Text>
      </TouchableOpacity>
    );
  };


  /** ================== UI ================== */
  return (<BaseBleComponent onRawDataReceived={onRawDataReceived}>
    {({ connected, connect, writeData }) => {
      updateWriteData(writeData);

      return (
        <View style={styles.container}>

          {/* 蓝牙连接按钮 */}
          {renderBleButton(connected, connect)}

          {/* Start / Stop */}
          <View style={styles.row}>
            {/* Start */}
            <TouchableOpacity
              disabled={!connected || isMeasuring}
              style={[
                styles.btn,
                (!connected || isMeasuring) && styles.btnDisabled,
              ]}
              onPress={start}
            >
              <Text>Start</Text>
            </TouchableOpacity>

            {/* Stop */}
            <TouchableOpacity
              disabled={!connected}
              style={[
                styles.btn,
                (!connected) && styles.btnDisabled,
              ]}
              onPress={stop}
            >
              <Text>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* 丢包 */}
          <View style={styles.row}>
            <Text>Lost: {totalLost}</Text>
            <Text>Lost(5s): {lostIn5s}</Text>
          </View>

          <ECGChartView
            ref={waveRef}
            width={width}
            height={400}
            showTime={5}
            singleNumber={255}
            lineColor="#fb0e3b"
            lineWidth={1}
            blankCount={200}
          />

        </View>
      );
    }}
  </BaseBleComponent>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  btn: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
  },
  btnDisabled: {
    backgroundColor: "#ccc",
  },

  bleBtn: {
    padding: 14,
    backgroundColor: "#d0ebff",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },

});
