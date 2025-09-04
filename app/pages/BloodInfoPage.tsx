import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
const BloodInfoPage: React.FC = () => {
     const { t } = useTranslation(); 
  const [banfenValue, setBanfenValue] = useState<number>(0);
  const [list, setList] = useState<Record<string, any>[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondRef = useRef<number>(0);
  const allSecond = 300; // 总时长 5 分钟

  const writeDataRef = useRef<((data: any) => void) | null>(null);

  // 更新 writeData 引用
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 发送指令
  const sendCommand = (command: number[]) => {
    if (!writeDataRef.current) {
      Alert.alert(t('错误'), t('蓝牙未连接'));
      return;
    }
    writeDataRef.current(command);
  };

  // 开始测量
  const start = useCallback(() => {
    sendCommand(BleSDK.startBloodSugar());
  }, []);

  // 结束测量
  const end = useCallback(() => {
    sendCommand(BleSDK.endBloodSugar());
  }, []);

  // 更新进度
  const updateProgress = useCallback((progress: number) => {
    sendCommand(BleSDK.progressBloodSugar(progress));
  }, []);

  // 启动倒计时
  const startCount = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setList([]);
    secondRef.current = 0;
    setBanfenValue(0);

    timerRef.current = setInterval(() => {
      secondRef.current += 1;

      if (secondRef.current > allSecond) {
        secondRef.current = 0;
        endCount();
        return;
      }

      const percent = (secondRef.current / allSecond) * 100;
      const roundedPercent = Math.min(Math.round(percent), 100);

      setBanfenValue(roundedPercent);
      updateProgress(roundedPercent);
    }, 1000);
  }, [updateProgress]);

  // 结束倒计时
  const endCount = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 数据接收回调
  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    const data = arg[DeviceKey.Data];
    const finish = Boolean(arg[DeviceKey.End]);

    switch (dataType) {
      case BleConst.BoolsugarStatus:
        const flag = data[DeviceKey.EcgStatus];
        switch (flag) {
          case 1:
            startCount();
            break;
          case 3:
            endCount();
            break;
          // 其他状态忽略
        }
        break;

      case BleConst.BoolsugarValue:
        // 插入到列表最前面
        setList((prev) => [data, ...prev]);
        break;
    }
  }, [startCount, endCount]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
                {/* 进度显示 */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {t('进度')}：{banfenValue}%
                  </Text>
                </View>

                {/* 操作按钮 */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.startButton]} onPress={start}>
                    <Text style={styles.buttonText}>{t('开始测量')}</Text>
                  </TouchableOpacity>
                  <View style={styles.buttonSpacer} />
                  <TouchableOpacity style={[styles.button, styles.endButton]} onPress={end}>
                    <Text style={styles.buttonText}>{t('结束测量')}</Text>
                  </TouchableOpacity>
                </View>

                {/* 数据列表 */}
                {list.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('无数据')}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={list}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <View style={styles.listItem} key={index}>
                        <Text style={styles.listItemText}>{JSON.stringify(item)}</Text>
                        <View style={styles.divider} />
                      </View>
                    )}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                )}
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
  progressContainer: {
    marginLeft: 10,
    marginTop: 10,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  endButton: {
    backgroundColor: '#F44336',
  },
  buttonSpacer: {
    width: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
  listItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  listItemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginTop: 10,
  },
});

export default BloodInfoPage;