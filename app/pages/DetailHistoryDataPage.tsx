import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import * as FileSystem from 'expo-file-system';
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
// 页面组件
const DetailHistoryDataPage = () => {
     const { t } = useTranslation(); 
  const [mode, setMode] = useState<1 | 2>(1);
  const [list, setList] = useState<Record<string, any>[]>([]);
  const [listAll, setListAll] = useState<Record<string, any>[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [continueNeeded, setContinueNeeded] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // ✅ 新增：useRef 保存最新的 writeData
  const writeDataRef = useRef<(data: any) => void | null>(null);

  // 初始化时间
  useEffect(() => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setTime(formattedDate);
    if (inputRef.current) {
      inputRef.current.setNativeProps({ text: formattedDate });
    }
  }, []);

  // 更新 writeDataRef 当 writeData 变化时
  const updateWriteDataRef = useCallback((writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  }, []);

  // 处理 BLE 数据接收
  const handleDataReceived = useCallback((arg: Record<string, any>) => {
    const map = arg;
    const finish = map[DeviceKey.End];
    const dataType = map[DeviceKey.DataType];

    if (
      dataType === BleConst.GetDetailActivityData ||
      dataType === BleConst.GetDetailSleepData
    ) {
      console.log('BLE Data Received:', map);

      setListAll((prev) => [...prev, map]);
      setList((prev) => [...prev, ...(map[DeviceKey.Data] || [])]);

      setDataCount((prevCount) => {
        const newCount = prevCount + 1;

        if (newCount === 50 && !finish) {
          setContinueNeeded(true);
        } else if (finish) {
          setLoading(false);
        }

        return newCount;
      });
    }
  }, []);

  // 封装发送指令逻辑
  const getDetailData = useCallback((
    status: number,
    timeStr: string
  ) => {
    if (!writeDataRef.current) return;

    const command = mode === 1
      ? BleSDK.getDetailActivityDataWithModeForTime(status, timeStr)
      : BleSDK.getDetailSleepDataWithModeForTime(status, timeStr);
    
    writeDataRef.current(command);
  }, [mode]);

  // ✅ 使用 useRef 的 writeData，不再依赖外部变量
  useEffect(() => {
    if (continueNeeded) {
      const timer = setTimeout(() => {
        getDetailData(2, time); // modeContinue = 2
        setContinueNeeded(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [continueNeeded, getDetailData, time]);

  // 读取所有数据
  const handleReadAll = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData); // ✅ 保存 writeData
    setLoading(true);
    setList([]);
    setListAll([]);
    setDataCount(0);
    setContinueNeeded(false);
    getDetailData(0, ''); // modeStart = 0
  }, [getDetailData, updateWriteDataRef]);

  // 删除数据
  const handleDelete = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);
    Alert.alert(
      t('确认删除'),
      t('确定要删除设备上的详细历史数据吗？'),
      [
        { text: t('取消'), style: 'cancel' },
        { text: t('确定'), onPress: () => getDetailData(0x99, '') },
      ]
    );
  }, [getDetailData, updateWriteDataRef]);

  // 根据时间读取
  const handleReadByTime = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);
    const trimmedTime = time.trim();
    if (trimmedTime.length !== 19) {
      Alert.alert('错误', '请输入完整的日期时间，格式：YYYY-MM-DD HH:MM:SS');
      return;
    }
    setLoading(true);
    setList([]);
    setListAll([]);
    setDataCount(0);
    setContinueNeeded(false);
    getDetailData(0, trimmedTime);
  }, [time, getDetailData, updateWriteDataRef]);

const handleExport = useCallback(async (listAll: any[]) => {
  if (listAll.length === 0) {
    Alert.alert('提示', '没有数据可导出');
    return;
  }

  try {
    // 转成 JSON 字符串
    const jsonString = JSON.stringify(listAll, null, 2);
    const fileName = 'history.txt';
    const filePath = FileSystem.documentDirectory + fileName;

    // 写入文件
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 检测平台是否支持分享
    // const canShare = await Sharing.isAvailableAsync();
    // if (!canShare) {
    //   Alert.alert('提示', '当前设备不支持分享功能');
    //   return;
    // }

    // 分享文件
    // await Sharing.shareAsync(filePath, {
    //   mimeType: 'text/plain',
    //   dialogTitle: '导出数据',
    //   UTI: 'public.plain-text', // iOS 可选
    // });
  } catch (error: any) {
    console.error('导出失败:', error);
    Alert.alert('导出失败', error.message || '未知错误');
  }
}, []);

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        // ✅ 每次渲染时更新 ref
        updateWriteDataRef(writeData);

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            {/* 加载模态框 */}
            <Modal transparent visible={loading}>
              <View style={styles.modalBackground}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>{t('同步中...')}</Text>
                </View>
              </View>
            </Modal>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* 模式选择 */}
              <View style={styles.radioGroup}>
                <View style={styles.radioItem}>
                  <TouchableOpacity
                    onPress={() => setMode(1)}
                    style={styles.radioCircle}
                  >
                    {mode === 1 && <View style={styles.radioInner} />}
                  </TouchableOpacity>
                  <Text style={styles.radioLabel}>{t('步数')}</Text>
                </View>

                <View style={styles.radioItem}>
                  <TouchableOpacity
                    onPress={() => setMode(2)}
                    style={styles.radioCircle}
                  >
                    {mode === 2 && <View style={styles.radioInner} />}
                  </TouchableOpacity>
                  <Text style={styles.radioLabel}>{t('睡眠')}</Text>
                </View>
              </View>

              {/* 按钮行：读取 & 删除 */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleReadAll(writeData)}
                  >
                    <Text style={styles.buttonText}>{t('读取所有数据')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#ff3b30' }]}
                    onPress={() => handleDelete(writeData)}
                  >
                    <Text style={styles.buttonText}>{t('删除')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 时间输入 */}
              <View style={styles.inputRow}>
                <Text style={styles.label}>{t('日期')}</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="YYYY-MM-DD HH:MM:SS"
                  keyboardType="ascii-capable"
                  textAlign="center"
                />
              </View>

              {/* 功能按钮：按时间读取 & 导出 */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleReadByTime(writeData)}
                  >
                    <Text style={styles.buttonText}>{t('根据时间获取数据')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleExport}
                  >
                    <Text style={styles.buttonText}>{t('数据导出')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 数据列表 */}
              <View style={styles.listContainer}>
                {list.length === 0 ? (
                  <Text style={styles.emptyText}>{t('无数据')}</Text>
                ) : (
                  list.map((item, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.listItemText}>{JSON.stringify(item)}</Text>
                      <View style={styles.divider} />
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }}
    </BaseBleComponent>
  );
};

export default DetailHistoryDataPage;

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  listContainer: {
    marginTop: 16,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  listItem: {
    paddingVertical: 12,
  },
  listItemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginTop: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
});