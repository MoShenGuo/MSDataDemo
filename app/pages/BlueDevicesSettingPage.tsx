
import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确

const BlueDevicesSettingPage: React.FC = () => {
     const { t } = useTranslation(); 
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState('');

  // 处理从蓝牙设备接收到的数据
  const handleDataReceived = useCallback((data: any) => {
    const map = data;
    const finish = map[DeviceKey.End];
    const type = map[DeviceKey.DataType];
    switch (type) {
      case BleConst.CloseDevices:
        const data = map[DeviceKey.Data];
        if (finish) {

          setLoading(false);
        }
        setResultData(`关闭成功: ${data}`);
        break;
      default:
        break;
    }
  }, []);

  // 发送关闭蓝牙指令
  const closeDevices = useCallback((writeData: (data: number[]) => void) => {
    try {
      const command = BleSDK.closeBlueDevice();
      writeData(command);
      setResultData('指令已发送，等待响应...');
    } catch (error) {
      console.error('发送指令失败:', error);
      setResultData('发送失败');
      setLoading(false);
    }
  }, []);

  // 按钮点击处理
  const handleClosePress = (writeData: (data: number[]) => void) => {
    setLoading(true);
    setResultData('正在关闭设备...');

    // 模拟延迟（可去掉）
    setTimeout(() => {
      closeDevices(writeData);
    }, 100);
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 标题 */}
            {/* 关闭蓝牙按钮 */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleClosePress(writeData)}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>
                {loading ? t('关闭中...') : t('关闭蓝牙')}
              </Text>
            </TouchableOpacity>

            {/* 结果显示 */}
            {resultData ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>结果：</Text>
                <Text style={styles.resultText}>{resultData}</Text>
              </View>
            ) : null}

            {/* Loading 模态框 */}
            <Modal visible={loading} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>同步中...</Text>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BaseBleComponent>
  );
};

export default BlueDevicesSettingPage;

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    width: '100%',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});