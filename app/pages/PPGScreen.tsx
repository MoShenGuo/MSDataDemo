import { BleSDK, } from "@moshenguo/ms-data-sdk";
import { useNavigation, useRoute } from "@react-navigation/core";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
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


  /** ===== 丢包统计 ===== */
  const lostTimestampsRef = useRef<number[]>([]);

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
