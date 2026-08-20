import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  BleSDK,
  ConstParams,
  ECGSignalProcessor,
  Stats,
} from "@yhmedical/ms-data-sdk";
import { useRoute } from "@react-navigation/native";
import BaseBleComponent from "../BaseBleComponent";

import EcgController from "./ecg/EcgController";
import ECGDataBuffer from "./ecg/ECGDataBuffer";

import ECGNewChartView, {
  ECGChartRef,
} from "./ecg/ECGNewChartView";

const { width } = Dimensions.get("window");

export default function PPGScreen() {

  /** ================= 路由参数 ================= */

  const route = useRoute<any>();
  const { mac } = route.params || {};

  /** ================= BLE ================= */

  const writeDataRef = useRef<any>(null);
  const isMeasuringRef = useRef(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  /** ================= 控制器 ================= */

  const redController = useRef(new EcgController(1050));
  const greenController = useRef(new EcgController(1050));

  const redChartRef = useRef<ECGChartRef>(null);
  const greenChartRef = useRef<ECGChartRef>(null);

  /** ================= 数据处理 ================= */

  const ecgBuffer = useRef(new ECGDataBuffer());
  const tempArray = useRef<number[]>([]);
  const params = useRef(new ConstParams());
  const stats = useRef(new Stats());

  /** ================= 60fps 输出 ================= */

  useEffect(() => {

    ecgBuffer.current.onOutputBatch = (batch) => {

      batch.forEach(value => {

        // 1️⃣ BP 滤波
        const filtered =
          ECGSignalProcessor.ecgBPFilter(value);

        // 2️⃣ 填充 1050 窗口
        if (tempArray.current.length < 1050) {
          tempArray.current.push(filtered);
        } else {

          // 3️⃣ 分析
          const analyzed =
            ECGSignalProcessor.analyzeSignal(
              tempArray.current,
              params.current,
              stats.current
            );

          // 4️⃣ 滑动 50
          const redData = analyzed.slice(50);
          const greenData = tempArray.current.slice(50);

          redController.current.addRawBatch(redData);
          greenController.current.addRawBatch(greenData);

          tempArray.current.splice(0, 50);

          // 5️⃣ 更新 UI
          redChartRef.current?.setData(
            redController.current.data
          );

          greenChartRef.current?.setData(
            greenController.current.data
          );
        }
      });
    };

    ecgBuffer.current.startOutput();

    return () => {
      ecgBuffer.current.stopOutput();
    };

  }, []);

  /** ================= BLE 数据接收 ================= */

  const onRawDataReceived = (data: number[]) => {
    if (!data || data.length < 2) return;

    const type = data[0];

    // 0x28 控制包
    if (type === 0x28) {
      safeWrite(BleSDK.realECGWave(isMeasuringRef.current));
      return;
    }

    // 0x07 ECG 数据
    if (type !== 0x07) return;
    if (data.length <= 2) return;

    const count = Math.floor((data.length - 2) / 3);
    const ecgArray: number[] = [];

    for (let i = 0; i < count; i++) {

      const base = 2 + i * 3;
      if (base + 2 >= data.length) break;

      let raw =
        data[base] |
        (data[base + 1] << 8) |
        (data[base + 2] << 16);

      // 24bit 有符号
      if (raw & 0x800000) {
        raw -= 0x1000000;
      }

      ecgArray.push(raw);
    }

    if (ecgArray.length > 0) {
      ecgBuffer.current.appendDataArray(ecgArray);
    }
  };

  /** ================= Start / Stop ================= */

  const start = () => {
    isMeasuringRef.current = true;
    setIsMeasuring(true);
    safeWrite(
      BleSDK.healthMeasurementWithDataType(0x04, true, null)
    );
  };

  const stop = () => {
    isMeasuringRef.current = false;
    setIsMeasuring(false);
    safeWrite(
      BleSDK.healthMeasurementWithDataType(0x04, false, null)
    );
  };

  const safeWrite = (cmd: any) => {
    writeDataRef.current?.(cmd);
  };

  /** ================= UI ================= */

  return (
    <BaseBleComponent onRawDataReceived={onRawDataReceived}>
      {({ connected, connect, writeData }) => {

        writeDataRef.current = writeData;

        return (
          <View style={styles.container}>

            {/* 蓝牙连接 */}
            <TouchableOpacity
              disabled={connected}
              onPress={() => connect(mac)}
              style={[
                styles.bleBtn,
                connected && styles.btnDisabled
              ]}
            >
              <Text>
                {connected ? "已连接" : "连接蓝牙"}
              </Text>
            </TouchableOpacity>

            {/* Start / Stop */}
            <View style={styles.row}>
              <TouchableOpacity
                disabled={!connected || isMeasuring}
                style={[
                  styles.btn,
                  (!connected || isMeasuring) &&
                  styles.btnDisabled
                ]}
                onPress={start}
              >
                <Text>Start</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!connected}
                style={[
                  styles.btn,
                  (!connected) && styles.btnDisabled
                ]}
                onPress={stop}
              >
                <Text>Stop</Text>
              </TouchableOpacity>
            </View>

            {/* 分析后波形 */}
            <ECGNewChartView
              ref={redChartRef}
              width={width}
              height={200}
              lineColor="red"
            />

            {/* 原始波形 */}
            <ECGNewChartView
              ref={greenChartRef}
              width={width}
              height={200}
              lineColor="green"
            />

          </View>
        );
      }}
    </BaseBleComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff"
  },
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