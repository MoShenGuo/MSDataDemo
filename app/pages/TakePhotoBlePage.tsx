import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
import BaseBleComponent from '../BaseBleComponent';

const TakePhotoBlePage: React.FC = () => {
  const writeDataRef = useRef<((data: number[]) => void) | null>(null);
  const [log, setLog] = useState<string[]>([]);

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

  /** 进入拍照模式 */
  const enterTakePhoto = useCallback(() => {
    const cmd = BleSDK.enterTakePhoto();
    sendCommand(cmd);
  }, []);

  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    const data = arg[DeviceKey.Data];

    setLog(prev => [
      `RX(${dataType}): ${JSON.stringify(data)}`,
      ...prev,
    ]);
  }, []);

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
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>进入拍照模式</Text>
                  <TouchableOpacity style={styles.actionButton} onPress={enterTakePhoto}>
                    <Text style={styles.actionButtonText}>发送</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.desc}>
                  说明：点击按钮后，手环进入拍照遥控模式，
                  通常用于控制手机相机快门。
                </Text>

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
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  desc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },

  logTitle: { fontSize: 16, marginTop: 20, marginBottom: 6 },
  logText: { fontSize: 12, color: '#555', marginBottom: 4 },
});

export default TakePhotoBlePage;