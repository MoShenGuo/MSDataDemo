// AllHistoryDataPage.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 请按你的项目路径调整
const MODE_START = 0;        // 读最近的步数详细数据
const MODE_CONTINUE = 2;     // 继续上次读的位置下一段数据
const MODE_DELETE = 0x99;    // 删除步数详细数据

// YYYY-MM-DD HH:mm:ss
const formatDateTime = (d = new Date()) => {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
};

const AllHistoryDataPage: React.FC = () => {
     const { t } = useTranslation(); 
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateStr, setDateStr] = useState<string>(formatDateTime());
  const [time, setTime] = useState<string>(''); // 与 Flutter 一致，用于断点续传的时间参数
  const [dataCount, setDataCount] = useState<number>(0);

  // 保存 writeData 引用，方便在回调里续传
  const writeRef = useRef<(data: number[]) => void>();

  /** 发送命令（与 Flutter getDetailData 一致） */
  const getDetailData = useCallback((status: number, timeStr: string) => {
    if (!writeRef.current) return;
    const cmd = BleSDK.getTotalActivityDataWithModeForTime(status, timeStr || '');
    console.log('cmd:',cmd);
    writeRef.current(cmd);
  }, []);

  /** 接收设备数据（翻译自 Flutter 的 EventBus 处理逻辑） */
  const handleDataReceived = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;

    const dataType = data[DeviceKey.DataType];
    const finish = Boolean(data[DeviceKey.End]);

    switch (dataType) {
      case BleConst.GetTotalActivityData: {
        const chunk: any[] = Array.isArray(data[DeviceKey.Data]) ? data[DeviceKey.Data] : [];
        // 追加数据
        setHistoryList(prev => [...prev, ...chunk]);

        // 计数 +1
        setDataCount(prevCount => {
          const next = prevCount + 1;

          // 每 50 包做一次续传判断
          if (next === 50) {
            // 重置计数
            setTimeout(() => setDataCount(0), 0);

            if (!finish) {
              // 继续获取下一段
              getDetailData(MODE_CONTINUE, time);
            } else {
              // 已结束
              setLoading(false);
            }
          } else {
            // 未到 50 包，如果设备已结束，直接结束
            if (finish) {
              setLoading(false);
            }
          }
          return next;
        });

        break;
      }

      default:
        // 其他数据类型按需扩展
        break;
    }
  }, [getDetailData, time]);

  /** 读取所有数据 */
  const handleReadAll = useCallback(() => {
    setLoading(true);
    setHistoryList([]);
    setTime('');         // Flutter：time = ''
    setDataCount(0);
    getDetailData(MODE_START, '');
  }, [getDetailData]);

  /** 删除数据 */
  const handleDeleteAll = useCallback(() => {
    setLoading(true);
    setHistoryList([]);
    setTime('');         // Flutter：time = ''
    setDataCount(0);
    // Flutter：getDetailData(modeDelete, time);
    getDetailData(MODE_DELETE, '');
    // 是否要等待设备回包再清空 UI？如果你希望完全一致，可以在收到特定回包后清空页面
    // 这里可以先提示一下，等待设备确认
    Alert.alert('提示', '已发送删除指令，等待设备确认...');
  }, [getDetailData, time]);

  /** 根据时间获取数据 */
  const handleReadByTime = useCallback(() => {
    if (!dateStr || dateStr.length !== 19) {
      Alert.alert('提示', '请输入有效的日期时间，格式：YYYY-MM-DD HH:mm:ss');
      return;
    }
    setLoading(true);
    setHistoryList([]);
    setTime(dateStr); // Flutter：time = dateController.text
    setDataCount(0);
    getDetailData(MODE_START, dateStr);
  }, [dateStr, getDetailData]);

  /** 渲染项 */
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={styles.cell}>
        <Text style={styles.cellText}>{JSON.stringify(item)}</Text>
        <View style={styles.separator} />
      </View>
    );
  }, []);

  const keyExtractor = useCallback((_, i) => String(i), []);

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        // 绑定 writeData 引用
        writeRef.current = writeData;

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {/* 加载中 */}
              {loading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>同步中...</Text>
                </View>
              )}

              {/* 顶部按钮：读取所有数据 / 删除 */}
              <View style={styles.row}>
                <View style={styles.btnWrap}>
                  <Button
                    title={t("读取所有数据")}
                    onPress={handleReadAll}
                    disabled={!connected}
                  />
                </View>
                <View style={styles.btnWrap}>
                  <Button
                    title={t("删除")}
                    onPress={handleDeleteAll}
                    disabled={!connected}
                    color={Platform.select({ ios: '#ff3b30', android: '#ff3b30', default: undefined })}
                  />
                </View>
              </View>

              {/* 日期输入 */}
              <View style={[styles.row, { alignItems: 'center' }]}>
                <Text style={styles.label}>{t('日期')} </Text>
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={dateStr}
                    onChangeText={setDateStr}
                    style={styles.input}
                    placeholder="YYYY-MM-DD HH:mm:ss"
                    keyboardType="numbers-and-punctuation"
                    textAlign="center"
                  />
                </View>
              </View>

              {/* 根据时间获取 */}
              <View style={styles.row}>
                <View style={styles.btnFull}>
                  <Button
                    title={t("根据时间获取数据")}
                    onPress={handleReadByTime}
                    disabled={!connected}
                  />
                </View>
              </View>

              {/* 数据列表 */}
              <View style={styles.listBox}>
                {historyList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{t('无数据')}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={historyList}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingTop: 10 }}
                  />
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      }}
    </BaseBleComponent>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnWrap: { flex: 1, marginHorizontal: 6 },
  btnFull: { flex: 1, marginHorizontal: 6 },
  label: { fontSize: 16, color: '#333' },
  input: {
    height: 40,
    borderWidth: 1, borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, marginBottom: 12,
  },
  loadingText: { marginLeft: 10, color: '#007AFF' },
  listBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    minHeight: 120,
  },
  emptyBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#999' },
  cell: { paddingVertical: 10, paddingHorizontal: 8 },
  cellText: { color: '#333', fontSize: 14 },
  separator: { height: 1, backgroundColor: '#ddd', marginTop: 6 },
});

export default AllHistoryDataPage;
