import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent';

/**
 * ECG History Waveform Page
 * - Send 0x71 command
 * - Receive parsed data via handleDataReceived
 */
const EcgHistoryBlePage: React.FC = () => {
  const writeDataRef = useRef<((data: number[]) => void) | null>(null);

  const [index, setIndex] = useState('0'); // BB: 0~9
  const [time, setTime] = useState('2025-12-12 09:50:10'); // YYMMDDHHmmSS
  const [log, setLog] = useState<string[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [ecgData, setEcgData] = useState<number[]>([]);

  const updateWriteData = (writeData: (data: number[]) => void) => {
    writeDataRef.current = writeData;
  };

  const sendCommand = (cmd: number[]) => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }
    writeDataRef.current(cmd);
    setLog(prev => [
      'TX: ' + cmd.map(b => b.toString(16).padStart(2, '0')).join(' '),
      ...prev,
    ]);
  };

  /** 读取 ECG 历史波形 */
  const readEcgHistory = useCallback(() => {
    const cmd = BleSDK.getEcgHistory({
      index: Number(index),
      time, // YYMMDDHHmmSS
    });
    sendCommand(cmd);

    // 清空旧数据
    setMeta({});
    setEcgData([]);
  }, [index, time]);

  /** 删除全部 ECG 保存数据 */
  const deleteAllEcg = useCallback(() => {
    const cmd = BleSDK.deleteAllEcgHistory();
    sendCommand(cmd);
    setMeta({});
    setEcgData([]);
  }, []);

  /** 接收解析后的 ECG 数据 */
  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    const data = arg[DeviceKey.Data];
    const end = Boolean(arg[DeviceKey.End]);

    if (dataType !== BleConst.ECGdata) return;

    // 已读，不需要再读
    if (end && !data) {
      setLog(prev => ['ECG 已读取，无需重复读取', ...prev]);
      return;
    }

    // 第一包：包含头信息
    if (data?.[DeviceKey.Date]) {
      setMeta({
        id: data[DeviceKey.ECGId],
        date: data[DeviceKey.Date],
        total: data[DeviceKey.ECGPointCount],
        hrv: data[DeviceKey.HRV],
        hr: data[DeviceKey.HeartRate],
        mood: data[DeviceKey.ECGMoodValue],
      });
    }

    // ECG 波形数据（多包累加）
    if (Array.isArray(data?.[DeviceKey.ECGValue])) {
      setEcgData(prev => [...prev, ...data[DeviceKey.ECGValue]]);
    }

    if (end) {
      setLog(prev => ['ECG 数据接收完成', ...prev]);
    }
  }, []);

  const renderRow = (
    title: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'numeric'
  ) => (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <TextInput
        style={styles.rowInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ writeData }) => {
        updateWriteData(writeData);

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <SafeAreaView style={styles.safeArea}>
              <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>ECG 历史波形读取</Text>

                {renderRow('读取序号 BB', index, setIndex, '0~9')}
                {renderRow('时间 YYMMDDHHmmSS', time, setTime, '如：230101120000', 'default')}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={readEcgHistory}>
                    <Text style={styles.buttonText}>读取 ECG</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerButton} onPress={deleteAllEcg}>
                    <Text style={styles.buttonText}>删除全部</Text>
                  </TouchableOpacity>
                </View>

                {meta?.date && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaText}>时间：{meta.date}</Text>
                    <Text style={styles.metaText}>ID：{meta.id}</Text>
                    <Text style={styles.metaText}>总点数：{meta.total}</Text>
                    <Text style={styles.metaText}>HR：{meta.hr}</Text>
                    <Text style={styles.metaText}>HRV：{meta.hrv}</Text>
                    <Text style={styles.metaText}>Mood：{meta.mood}</Text>
                    <Text style={styles.metaText}>已接收点数：{ecgData.length}</Text>
                  </View>
                )}

                <Text style={styles.logTitle}>通信日志</Text>
                {log.map((item, index) => (
                  <Text key={index} style={styles.logText}>{item}</Text>
                ))}
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        );
      }}
    </BaseBleComponent>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#f8f8f8' },
  scrollContent: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  rowTitle: { width: 140, fontSize: 14, color: '#333' },
  rowInput: { flex: 1, fontSize: 14 },

  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  metaBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  metaText: { fontSize: 13, color: '#333', marginBottom: 4 },

  logTitle: { fontSize: 16, marginTop: 20, marginBottom: 6 },
  logText: { fontSize: 12, color: '#555', marginBottom: 4 },
});

export default EcgHistoryBlePage;
