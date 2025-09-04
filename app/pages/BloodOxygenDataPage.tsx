
import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useState } from 'react';
import { useTranslation } from "react-i18next";
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
  View
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent';

const BloodOxygenDataPage: React.FC = () => {
     const { t } = useTranslation(); 
  // 模式定义
  const modeStart = 0;      // 读取最近数据
  const modeContinue = 2;   // 继续读取下一段
  const modeDelete = 0x99;  // 删除数据

  // 状态
  const [list, setList] = useState<Record<string, any>[]>([]);
  const [dataCount, setDataCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<1 | 2>(1); // 1: 手动血氧, 2: 自动血氧

  // 引用保存 writeData
  const writeDataRef = React.useRef<((data: any) => void) | null>(null);

  // 处理从设备接收的数据
  const handleDataReceived = useCallback((arg: any) => {
      const map = arg;
      const dataType = map[DeviceKey.DataType];

      const isAuto = dataType === BleConst.AutoBloodOxygen;
      const isManual = dataType === BleConst.Blood_oxygen;

      const end = map[DeviceKey.End];
      const data = map[DeviceKey.Data];

      if (!isAuto && !isManual) return;

      // 更新模式
      if (isAuto) setMode(2);
      if (isManual) setMode(1);

      // 添加新数据
      setList((prev) => [...prev, ...data]);
      setDataCount((prev) => prev + 1);

      // 每 50 次响应检查是否继续
      if (dataCount + 1 >= 50) {
        setDataCount(0);

        if (end) {
          setIsLoading(false);
        } else {
          // 继续获取下一段数据
          getDetailData(modeContinue);
        }
      } else if (end) {
        setIsLoading(false);
      }
    },
    [dataCount]
  );

  // 更新 writeData 到 ref
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 获取血氧数据
  const getDetailData = (status: number) => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }

    const command =
      mode === 1
        ? BleSDK.getBloodOxygen(status, '')
        : BleSDK.getAutoBloodOxygen(status, '');

    writeDataRef.current(command);
  };

  // 获取数据按钮
  const handleFetchData = () => {
    setMode(2); // 设置为自动血氧模式
    setList([]); // 清空旧数据
    setIsLoading(true);
    // 模拟 loading 提示（实际可用 Modal 或 ActivityIndicator）
    Alert.alert('', '同步中...', [{ text: '确定' }], { onDismiss: () => {} });
    getDetailData(modeStart);
  };

  // 删除数据按钮
  const handleDeleteData = () => {
    setMode(2);
    Alert.alert(
      t('确认删除'),
      t('确定要删除所有自动血氧数据吗？'),
      [
        { text: t('取消'), style: 'cancel' },
        {
          text: t('删除'),
          style: 'destructive',
          onPress: () => {
            getDetailData(modeDelete);
            setList([]); // 立即清空 UI 显示
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 渲染列表项
  const renderItem = ({ item }: { item: Record<string, any> }) => (
    <View style={styles.listItem}>
      <Text style={styles.itemText}>{JSON.stringify(item)}</Text>
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
                <Text style={styles.sectionTitle}>{t('自动血氧数据')}</Text>

                {/* 按钮组 */}
                <View style={styles.buttonRow}>
                  <View style={styles.buttonContainer}>
                    <Button title={t("获取")} onPress={handleFetchData} />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button title={t("删除")} color="#ff3b30" onPress={handleDeleteData} />
                  </View>
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
  sectionTitle: {
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 5,
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

export default BloodOxygenDataPage;