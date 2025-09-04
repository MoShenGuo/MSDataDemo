
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent';
// ✅ 正确定义组件
const HrvDataPage: React.FC = () => {
     const { t } = useTranslation(); 
  const modeStart = 0;
  const modeContinue = 2;
  const modeDelete = 99;

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const listRef = useRef<any[]>([]);
  const countRef = useRef(0);
  const loadingRef = useRef(false);

  // 初始化 ref
  React.useEffect(() => {
    listRef.current = [];
    countRef.current = 0;
    loadingRef.current = false;
  }, []);

  const handleDataReceived = useCallback((dataMap: any) => {

    const dataType = dataMap[DeviceKey.DataType];
    if (dataType !== BleConst.GetHRVData) return;

    const dataList = dataMap[DeviceKey.Data] || [];
    const finish = dataMap[DeviceKey.End] || false;

    listRef.current = [...listRef.current, ...dataList];
    setList([...listRef.current]);
    countRef.current += 1;

    if (finish) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    if (countRef.current >= 50) {
      countRef.current = 0;
      // 注意：这里需要 writeData，稍后处理
    }
  }, []);

  const getDetailData = useCallback(
    (mode: number, writeData: (data: number[]) => void) => {
      loadingRef.current = true;
      setLoading(true);
      listRef.current = [];
      setList([]);
      const cmd = BleSDK.getHRVDataWithMode(mode, '');
      writeData(cmd);
    },
    []
  );

  // ✅ 必须 return 返回 JSX！
  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => (
        <View style={styles.container}>
          <View style={styles.buttonContainer}>
            <Button
              title={t("读取HRV数据")}
              onPress={() => getDetailData(modeStart, writeData)}
            //   disabled={!connected}
            />
            <Button
              title={t("删除HRV数据")}
              color="red"
              onPress={() => getDetailData(modeDelete, writeData)}
            //   disabled={!connected}
            />
          </View>

          {loading && <ActivityIndicator size="large" color="#0000ff" />}

          {list.length === 0 ? (
            <Text style={styles.emptyText}>{t('暂无数据')}</Text>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Text>{JSON.stringify(item)}</Text>
                </View>
              )}
            />
          )}
        </View>
      )}
    </BaseBleComponent>
  );
};

export default HrvDataPage;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#3f51b5',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlRow: {
    padding: 16,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
    padding: 12,
    backgroundColor: '#3f51b5',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    padding: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  activityIndicatorWrapper: {
    backgroundColor: '#FFFFFF',
    height: 100,
    width: 200,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
});