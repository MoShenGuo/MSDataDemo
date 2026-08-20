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

import { BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
import BaseBleComponent from '../BaseBleComponent';

const WeatherBlePage: React.FC = () => {
  const writeDataRef = useRef<((data: number[]) => void) | null>(null);

  const [weatherCode, setWeatherCode] = useState('0');
  const [currentTemp, setCurrentTemp] = useState('25');
  const [maxTemp, setMaxTemp] = useState('30');
  const [minTemp, setMinTemp] = useState('20');
  const [aqi, setAqi] = useState('80');
  const [address, setAddress] = useState('Shenzhen');
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

  const sendWeather = useCallback(() => {
    const cmd = BleSDK.updateWeather({
      weatherCode: Number(weatherCode),
      currentTemp: Number(currentTemp),
      maxTemp: Number(maxTemp),
      minTemp: Number(minTemp),
      aqi: Number(aqi),
      address,
    });

    sendCommand(cmd);
  }, [weatherCode, currentTemp, maxTemp, minTemp, aqi, address]);

  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    const data = arg[DeviceKey.Data];

    setLog(prev => [
      `RX(${dataType}): ${JSON.stringify(data)}`,
      ...prev,
    ]);
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
                {renderRow('天气代码', weatherCode, setWeatherCode, '如：0=晴，1=多云')}
                {renderRow('当前温度', currentTemp, setCurrentTemp, '单位 ℃')}
                {renderRow('最高温度', maxTemp, setMaxTemp, '单位 ℃')}
                {renderRow('最低温度', minTemp, setMinTemp, '单位 ℃')}
                {renderRow('空气质量', aqi, setAqi, '0~65535')}
                {renderRow('城市 / 地址 TX', address, setAddress, '最多 32 字节', 'default')}

                <TouchableOpacity style={styles.sendButton} onPress={sendWeather}>
                  <Text style={styles.sendButtonText}>发送天气指令</Text>
                </TouchableOpacity>

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
  rowTitle: {
    width: 120,
    fontSize: 14,
    color: '#333',
  },
  rowInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },

  sendButton: {
    backgroundColor: '#03A9F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  logTitle: { fontSize: 16, marginTop: 20, marginBottom: 6 },
  logText: { fontSize: 12, color: '#555', marginBottom: 4 },
});

export default WeatherBlePage;
