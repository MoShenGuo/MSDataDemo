import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
const HealthMeasurementPage: React.FC = () => {
     const { t } = useTranslation(); 
  // 测量模式：2-心率，3-血氧
  const [mode, setMode] = useState<number>(2);
  const [enable, setEnable] = useState<boolean>(false);
  const [text, setText] = useState<string>(t('等待数据...'));
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 保存 writeData 引用
  const writeDataRef = React.useRef<((data: any) => void) | null>(null);

  // 处理蓝牙数据回调
  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];

    const isMeasurementType =
      [
        BleConst.MeasurementHrvCallback,
        BleConst.MeasurementHeartCallback,
        BleConst.MeasurementOxygenCallback,
        BleConst.MeasurementTempCallback,
        BleConst.StopMeasurementHrvCallback,
        BleConst.StopMeasurementHeartCallback,
        BleConst.StopMeasurementOxygenCallback,
        BleConst.StopMeasurementTempCallback,
      ].includes(dataType);

    if (isMeasurementType) {
      setText(JSON.stringify(arg));
    } else if (dataType === BleConst.RealTimeStep) {
      const data = arg[DeviceKey.Data];
      const displayText = `心率: ${data?.[DeviceKey.HeartRate] ?? '?'}, 血氧: ${data?.[DeviceKey.Blood_oxygen] ?? '?'}%`;
      setText(displayText);
    }
  }, []);

  // 更新 writeData
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 发送健康测量指令
  const sendHealthCommand = () => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }
    const command = BleSDK.healthMeasurementWithDataType(mode, enable);
    writeDataRef.current(command);
  };

  // 启动定时器：每30秒发送一次指令（只要 enable 为 true）
  const startTimer = () => {
    stopTimer(); // 清除旧定时器

    let currentSeconds = 29;

    const interval = setInterval(() => {
      currentSeconds -= 1;
      if (currentSeconds <= 0) {
        currentSeconds = 29;
        if (enable && writeDataRef.current) {
          sendHealthCommand();
        }
      }
    }, 1000);

    timerRef.current = interval;
  };

  // 停止定时器
   
  const stopTimer = useCallback(() => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}, []); // 👈 添加空依赖数组
  // 使用 useEffect 确保在组件卸载时关闭定时器
  useEffect(() => {
    return () => {
      // 清理定时器
      stopTimer();
      endRealTimeStep();
      
    };
  }, [endRealTimeStep, stopTimer]); // 注意依赖
  // 处理设置按钮点击
  const handleSet = () => {
    sendHealthCommand();
    if (enable) {
      startTimer();
    } else {
      stopTimer();
    }
  };
const endRealTimeStep = useCallback(() => {
  
  if (writeDataRef.current) {
      const command = BleSDK.realTimeStep(false, false);
    writeDataRef.current(command);
    writeDataRef.current = null;
  }
}, []);
  // 处理连接设备
  const handleConnect = () => {
    setIsConnecting(true);
    // 假设通过 writeDataRef 判断是否连接，或通过 connected 参数
    // 实际连接逻辑应由 BaseBleComponent 提供，这里仅模拟
    Alert.alert('提示', '连接功能需由 BaseBleComponent 实现', [
      { text: '确定', onPress: () => setIsConnecting(false) },
    ]);
  };
   
  // 开启实时计步
  const handleStartRealTimeStep = () => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }
    const command = BleSDK.realTimeStep(true, false);
    writeDataRef.current(command);
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        updateWriteData(writeData);

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <SafeAreaView style={styles.safeArea}>
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 连接设备按钮 */}
                <TouchableOpacity
                  style={[styles.button, connected && styles.buttonDisabled]}
                  onPress={connected ? undefined : handleConnect}
                  disabled={connected || isConnecting}
                >
                  <Text style={styles.buttonText}>
                    {connected ? t('已连接') : isConnecting ? t('连接中...') : t('连接设备')}
                  </Text>
                  {isConnecting && <ActivityIndicator size="small" color="#fff" style={styles.spinner} />}
                </TouchableOpacity>

                {/* 测量模式选择 */}
                <View style={styles.radioGroup}>
                  <View style={styles.radioButton}>
                    <TouchableOpacity onPress={() => setMode(2)}>
                      <View style={[styles.radio, mode === 2 && styles.radioSelected]} />
                    </TouchableOpacity>
                    <Text style={styles.radioLabel}>{t('心率')}</Text>
                  </View>

                  <View style={styles.radioButton}>
                    <TouchableOpacity onPress={() => setMode(3)}>
                      <View style={[styles.radio, mode === 3 && styles.radioSelected]} />
                    </TouchableOpacity>
                    <Text style={styles.radioLabel}>{t('血氧')}</Text>
                  </View>
                </View>

                {/* 测量状态开关 */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>{t('测量状态')}:</Text>
                  <Switch value={enable} onValueChange={setEnable} />
                  <Text style={styles.switchText}>{enable ? t('开') : t('关')}</Text>
                </View>

                {/* 设置按钮 */}
                <TouchableOpacity style={styles.button} onPress={handleSet}>
                  <Text style={styles.buttonText}>{t('设置')}</Text>
                </TouchableOpacity>

                {/* 开启实时计步按钮 */}
                <TouchableOpacity style={styles.button} onPress={handleStartRealTimeStep}>
                  <Text style={styles.buttonText}>{t('开启实时计步')}</Text>
                </TouchableOpacity>

                {/* 数据显示 */}
                <View style={styles.dataContainer}>
                  <Text style={styles.dataText}>{text}</Text>
                </View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        );
      }}
    </BaseBleComponent>
  );
};

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginLeft: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  radioSelected: {
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    marginRight: 12,
    color: '#333',
  },
  switchText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  dataContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dataText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
  },
});

export default HealthMeasurementPage;