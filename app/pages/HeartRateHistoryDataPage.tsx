import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, {
  useCallback,
  useRef,
  useState
} from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
const HeartRateHistoryDataPage = () => {
     const { t } = useTranslation(); 
  // 模式定义
  const [mode, setMode] = useState<number>(1); // 1: 动态心率, 2: 静态心率
  const modeStart = 0;
  const modeContinue = 2;
  const modeDelete = 0x99;

  const [list, setList] = useState<Record<string, any>[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const writeDataRef = useRef<((data: any) => void) | null>(null);

  // 更新 writeData 到 ref
  const updateWriteDataRef = useCallback((writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  }, []);

  // 处理 BLE 数据接收
  const handleDataReceived = useCallback((arg: Record<string, any>) => {
    const map = arg;
    const finish = map[DeviceKey.End];
    const dataType = map[DeviceKey.DataType];

    if (
      dataType === BleConst.GetDynamicHR ||
      dataType === BleConst.GetStaticHR
    ) {
      console.log('Received Heart Rate Data:', map);

      setList((prev) => [...prev, ...(map[DeviceKey.Data] || [])]);

      setDataCount((prevCount) => {
        const newCount = prevCount + 1;

        if (newCount === 50 && !finish) {
          // 继续拉取下一段
          if (writeDataRef.current) {
            const command = BleSDK.getDynamicHRWithMode?.(modeContinue, "") 
              || BleSDK.getStaticHRWithMode?.(modeContinue, "");
            writeDataRef.current(command);
          }
        } else if (finish) {
          setLoading(false);
        }

        return newCount === 50 ? 0 : newCount;
      });
    }
  }, [modeContinue]);

  // 获取数据指令
  const getDetailData = useCallback((status: number) => {
    if (!writeDataRef.current) return;

    const command = mode === 1
      ? BleSDK.getDynamicHRWithMode(status, "")
      : BleSDK.getStaticHRWithMode(status, "");

    writeDataRef.current(command);
  }, [mode]);

  // 读取数据
  const handleRead = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);
    setLoading(true);
    setList([]);
    setDataCount(0);
    getDetailData(modeStart);
  }, [getDetailData, modeStart, updateWriteDataRef]);

  // 删除数据
  const handleDelete = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);
    Alert.alert(
      t('确认删除'),
      t('确定要删除设备上的心率历史数据吗？'),
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => getDetailData(modeDelete) },
      ]
    );
  }, [getDetailData, modeDelete, updateWriteDataRef]);

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        // 每次渲染更新 writeData
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
              {/* 模式选择：动态/静态心率 */}
              <View style={styles.radioRow}>
                <Pressable onPress={() => setMode(1)} style={styles.radioContainer}>
                  <View style={[styles.radioOuter, mode === 1 && styles.radioSelected]}>
                    {mode === 1 && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{t('心率/动态')}</Text>
                </Pressable>

                <Pressable onPress={() => setMode(2)} style={styles.radioContainer}>
                  <View style={[styles.radioOuter, mode === 2 && styles.radioSelected]}>
                    {mode === 2 && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{t('单次心率/静态')}</Text>
                </Pressable>
              </View>

              {/* 按钮行：读取 & 删除 */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleRead(writeData)}
                  >
                    <Text style={styles.buttonText}>{t('读取')}</Text>
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

export default HeartRateHistoryDataPage;

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    backgroundColor: '#007AFF',
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
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