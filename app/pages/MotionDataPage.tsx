import React, { useEffect, useRef, useState } from 'react';
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
  TextInput,
  View
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
// 模式常量
const MODE_START = 0;        // 读最近的步数详细数据
const MODE_CONTINUE = 2;     // 继续读取下一段
const MODE_DELETE = 0x99;    // 删除数据

const MotionDataPage: React.FC = () => {
     const { t } = useTranslation(); 
  const [list, setList] = useState<Record<string, any>[]>([]);
  const [dataCount, setDataCount] = useState<number>(0);
  const [time, setTime] = useState<string>('');

  // 用于保存最新的 writeData 函数
  const writeDataRef = useRef<(data: any) => void | null>(null);

  // 输入框引用（模拟你提到的 inputRef）
  const inputRef = useRef<TextInput>(null);

  // 初始化时间
  useEffect(() => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setTime(formattedDate);
    if (inputRef.current) {
      inputRef.current.setNativeProps({ text: formattedDate });
    }
  }, []);
// 监听 writeData 变化，更新到 ref
  const updateWriteDataRef = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };
 // 处理从设备接收到的数据
  const handleDataReceived = (dataMap: any) => {
      if (!dataMap || typeof dataMap !== "object") return;
    const finish = dataMap[DeviceKey.End];
    const dataType = dataMap[DeviceKey.DataType];
    if (dataType === BleConst.GetActivityModeData) {
      const newData =  dataMap[DeviceKey.Data] || [];
      setList((prev) => [...prev, ...newData]);

      setDataCount((prevCount) => {
        const newCount = prevCount + 1;

        // 每 50 条数据判断是否继续
        if (newCount >= 50) {
          if (finish) {
            console.log('数据同步完成');
          } else {
            // ✅ 通过 ref 调用最新的 writeData
            if (writeDataRef.current) {
              writeDataRef.current(BleSDK.getActivityModeDataWithMode(MODE_CONTINUE));
            }
          }
          return 0;
        }
        return newCount;
      });

      // 如果是最后一包且不足 50
      if (finish && dataCount < 50) {
        console.log('数据同步完成');
      }
    }
  };


  // 获取详细数据（通过 writeData 发送指令）
  const getDetailData = (status: number, writeData: (command: any) => void) => {
    writeData(BleSDK.getActivityModeDataWithMode(status));
  };

  // 模拟显示加载（实际中可集成 Loading 组件）
  const showLoading = () => {
    Alert.alert('', '同步中');
  };

  const dismissDialog = () => {
    // 可在此关闭 loading，根据你的 UI 库实现
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        updateWriteDataRef(writeData);
        return(
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* 获取按钮 */}
              <View style={styles.buttonContainer}>
                <Button
                  title={t("获取")}
                  onPress={() => {
                    showLoading();
                    setList([]);
                    getDetailData(MODE_START, writeData);
                  }}
                />
              </View>

              {/* 删除按钮 */}
              <View style={styles.buttonContainer}>
                <Button
                  title={t("删除")}
                  color="red"
                  onPress={() => {
                    getDetailData(MODE_DELETE, writeData);
                  }}
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
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.listItem} key={index}>
                      <Text style={styles.itemText}>{JSON.stringify(item)}</Text>
                      <View style={styles.separator} />
                    </View>
                  )}
                  scrollEnabled={false} // 防止 FlatList 嵌套滚动冲突
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}}
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
    backgroundColor: '#f5f5f5',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginTop: 10,
  },
});

export default MotionDataPage;