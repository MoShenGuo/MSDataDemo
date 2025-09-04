import React, { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent';
const TempHistoryPage: React.FC = () => {
     const { t } = useTranslation(); 
  // 模式定义
  const MODE_MAIN = 1;
  const MODE_TEST = 2;

  const modeStart = 0;      // 开始读取
  const modeContinue = 2;   // 继续读取
  const modeDelete = 0x99;  // 删除数据

  // 状态
  const [list, setList] = useState<string[]>([]);
  const [dataCount, setDataCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<number>(MODE_MAIN); // 1: 主页, 2: 测试页

  // 保存 writeData 引用
  const writeDataRef = React.useRef<((data: any) => void) | null>(null);

  // 处理蓝牙数据回调
  const handleDataReceived = useCallback((arg: any) => {
        const map = arg;
        const dataType = map[DeviceKey.DataType];

      const isTargetType =
        dataType === BleConst.GetAxillaryTemperatureDataWithMode ||
        dataType === BleConst.Temperature_history;

      if (!isTargetType) return;

      // 如果是测试页模式，更新 UI 模式
      if (dataType === BleConst.GetAxillaryTemperatureDataWithMode) {
        setMode(MODE_TEST);
      }
      const end = map[DeviceKey.End];
      // 将整个消息对象转为字符串添加（与 Flutter 一致）
      const itemStr = JSON.stringify(arg); // 或根据需求提取 data 字段
      setList((prev) => [...prev, itemStr]);
      setDataCount((prev) => prev + 1);

      // 每 50 条响应检查是否继续
      if (dataCount + 1 >= 50) {
        setDataCount(0);

        if (end) {
          setIsLoading(false);
        } else {
          getDetailData(modeContinue);
        }
      } else if (end) {
        setIsLoading(false);
      }
    },
    [dataCount]
  );

  // 更新 writeData
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 发送获取数据指令
  const getDetailData = (status: number) => {
    if (!writeDataRef.current) {
      Alert.alert(t('错误'), t('蓝牙未连接'));
      return;
    }

    const command =
      mode === MODE_MAIN
        ? BleSDK.getTemperature_historyDataWithMode(status, '')
        : BleSDK.getAxillaryTemperatureDataWithMode(status, '');

    writeDataRef.current(command);
  };

  // 获取温度数据（测试页面）
  const handleFetchData = () => {
    setMode(MODE_TEST);
    setList([]);
    setIsLoading(true);
    // 可替换为自定义 Loading 组件
    Alert.alert('', '同步中...', [{ text: '确定' }], { onDismiss: () => {} });
    getDetailData(modeStart);
  };

  // 删除数据
  const handleDeleteData = () => {
    Alert.alert(
      t('确认删除'),
      t('确定要删除所有温度历史数据吗？'),
      [
        { text: t('取消'), style: 'cancel' },
        {
          text: t('删除'),
          style: 'destructive',
          onPress: () => {
            getDetailData(modeDelete);
            setList([]); // 立即清空 UI
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 列表渲染项
  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.listItem}>
      <Text style={styles.itemText} numberOfLines={2}>
        {item}
      </Text>
      <View style={styles.separator} />
    </View>
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
                {/* 获取温度数据按钮 */}
                <View style={styles.buttonContainer}>
                  <Button title={t("获取温度数据(测试页面)")} onPress={handleFetchData} />
                </View>

                {/* 删除数据按钮 */}
                <View style={styles.buttonContainer}>
                  <Button
                    title={t("删除数据")}
                    color="#ff3b30"
                    onPress={handleDeleteData}
                  />
                </View>

                {/* 数据列表 */}
                {list.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('无数据')}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={list}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    scrollEnabled={false}
                    style={styles.list}
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
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  list: {
    marginTop: 10,
  },
  listItem: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default TempHistoryPage;