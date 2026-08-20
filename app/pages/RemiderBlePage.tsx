import { BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
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

const REMINDER_TYPES = [
  { label: '来电', value: 0x00 },
  { label: '手机信息 / 其它APP', value: 0x01 },
  { label: '微信', value: 0x02 },
  { label: 'Facebook', value: 0x03 },
  { label: 'Instagram', value: 0x04 },
  { label: 'Skype', value: 0x05 },
  { label: 'Telegram', value: 0x06 },
  { label: 'Tweetie2', value: 0x07 },
  { label: 'VK', value: 0x08 },
  { label: 'WhatsApp', value: 0x09 },
  { label: 'QQ', value: 0x0A },
  { label: 'LinkedIn', value: 0x0B },
  { label: '停止来电提醒', value: 0xff },
];

const RemiderBlePage: React.FC = () => {
  const [type, setType] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const writeDataRef = useRef<((data: number[]) => void) | null>(null);

  const updateWriteData = (writeData: (data: number[]) => void) => {
    writeDataRef.current = writeData;
  };

  const sendReminder = useCallback(() => {
  if (!writeDataRef.current) {
    Alert.alert('错误', '蓝牙未连接');
    return;
  }

  const cmd = BleSDK.reminderCommand(type, message, contact);
  writeDataRef.current(cmd);
}, [type, message, contact]);


  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    const data = arg[DeviceKey.Data];

    // 此命令一般只发送，不强依赖回包，这里仅记录
    setLog(prev => [`RX(${dataType}): ${JSON.stringify(data)}`, ...prev]);
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
                <Text style={styles.label}>提醒类型 (AA)</Text>
                <View style={styles.typeWrap}>
                  {REMINDER_TYPES.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.typeButton,
                        type === item.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setType(item.value)}
                    >
                      <Text
                        style={type === item.value ? styles.typeTextActive : styles.typeText}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>提醒内容 (≤60 bytes)</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="请输入提醒内容"
                  style={styles.input}
                  multiline
                />

                <Text style={styles.label}>联系人 (≤15 bytes)</Text>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  placeholder="请输入联系人"
                  style={styles.input}
                />

                <TouchableOpacity style={styles.sendButton} onPress={sendReminder}>
                  <Text style={styles.sendButtonText}>发送提醒指令</Text>
                </TouchableOpacity>

                <Text style={styles.label}>通信日志</Text>
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
  label: { fontSize: 16, marginTop: 16, marginBottom: 8 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  typeButtonActive: { backgroundColor: '#4CAF50' },
  typeText: { color: '#333' },
  typeTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  sendButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logText: {
    fontSize: 12,
    color: '#555',
    marginTop: 6,
  },
});

export default RemiderBlePage;
