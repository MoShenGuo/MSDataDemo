import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确

// 运动状态常量
const Status = {
  START: 1,
  PAUSE: 2,
  CONTINUE: 3,
  FINISH: 4,
};

const SportModePage: React.FC = () => {
  const { t } = useTranslation(); 
  const [mode, setMode] = useState<number>(0);
  const [status, setStatus] = useState<number>(0); // 0: 未开始, 1: 运行中, 2: 暂停, 3: 继续, 4: 结束
  const [second, setSecond] = useState<number>(0);
  const [content, setContent] = useState<string>(t('等待运动开始...'));

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const writeDataRef = React.useRef<((data: any) => void) | null>(null);

  // 运动项目标题
  const sportTitles = [
    '跑步', '骑车', '羽毛球', '足球', '网球', '瑜伽',
    '呼吸', '舞蹈', '篮球', '郊游野游', '锻炼', '板球',
    '徒步旅行', '有氧运动', '乒乓球', '跳绳', '仰卧起坐', '排球',
  ];

  // 更新 writeData 引用
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 处理蓝牙数据回调
  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    if (dataType === BleConst.EnterActivityMode) {
      const data = arg[DeviceKey.Data];
      if (data && data[DeviceKey.HeartRate]) {
        const heartRate = parseInt(data[DeviceKey.HeartRate], 10);
        // 心率 255 表示运动停止
        if (heartRate === 255) {
          endSport();
        }
      }
      setContent(JSON.stringify(arg));
    }
  }, []);

  // 发送指令
  const sendCommand = (command: number[]) => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }
    writeDataRef.current(command);
  };

  // 开始运动
  const startSport = useCallback(() => {
    if (status === 0 || status === 4) {
      setSecond(0);
      sendCommand(BleSDK.enterActivityMode(mode, Status.START));
      // 启动每秒计时器
      timerRef.current = setInterval(() => {
        setSecond((prev) => {
          const newSecond = prev + 1;
          if (newSecond >= 1 && writeDataRef.current) {
            sendCommand(BleSDK.sendHeartPackage(0, newSecond, 2));
          }
          return newSecond;
        });
      }, 1000);
      setStatus(Status.START);
    }
  }, [mode, status]);

  // 暂停运动
  const pauseSport = useCallback(() => {
    if (status === Status.START || status === Status.CONTINUE) {
      sendCommand(BleSDK.enterActivityMode(mode, Status.PAUSE));
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus(Status.PAUSE);
    }
  }, [mode, status]);

  // 继续运动
  const continueSport = useCallback(() => {
    if (status === Status.PAUSE) {
      sendCommand(BleSDK.enterActivityMode(mode, Status.CONTINUE));
      timerRef.current = setInterval(() => {
        setSecond((prev) => {
          const newSecond = prev + 1;
          if (newSecond >= 1 && writeDataRef.current) {
            sendCommand(BleSDK.sendHeartPackage(0, newSecond, 2));
          }
          return newSecond;
        });
      }, 1000);
      setStatus(Status.CONTINUE);
    }
  }, [mode, status]);

  // 结束运动
  const endSport = useCallback(() => {
    if (status === Status.START || status === Status.CONTINUE) {
      sendCommand(BleSDK.enterActivityMode(mode, Status.FINISH));
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSecond(0);
      setStatus(Status.FINISH);
    }
  }, [mode, status]);

  // 页面卸载时清理
  useEffect(() => {
    return () => {
      endSport(); // 退出时自动结束运动
    };
  }, [endSport]);

  // 渲染单个运动项目
  const renderSportItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.radioItem}
      onPress={() => setMode(index)}
    >
      <View style={[styles.radio, mode === index && styles.radioSelected]} />
      <Text style={styles.radioLabel}>{t(item)}</Text>
    </TouchableOpacity>
  );

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
                {/* 运动模式选择 Grid */}
                <FlatList
                  data={sportTitles}
                  renderItem={renderSportItem}
                  keyExtractor={(item, index) => index.toString()}
                  numColumns={3}
                  scrollEnabled={false}
                  style={styles.grid}
                  contentContainerStyle={styles.gridContainer}
                />

                {/* 控制按钮组 */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={startSport}>
                    <Text style={styles.buttonText}>{t('开始')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={endSport}>
                    <Text style={styles.buttonText}>{t('停止')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.buttonWarning]} onPress={pauseSport}>
                    <Text style={styles.buttonText}>{t('暂停')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.buttonSuccess]} onPress={continueSport}>
                    <Text style={styles.buttonText}>{t('继续')}</Text>
                  </TouchableOpacity>
                </View>

                {/* 数据显示 */}
                <View style={styles.dataContainer}>
                  <Text style={styles.dataText}>{t('秒数')}: {second}</Text>
                  <Text style={styles.dataText}>{t('状态')}: {status}</Text>
                  <Text style={[styles.dataText, { marginTop: 8 }]}>{content}</Text>
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
  grid: {
    marginBottom: 16,
  },
  gridContainer: {
    justifyContent: 'center',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '33.33%',
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
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default SportModePage;