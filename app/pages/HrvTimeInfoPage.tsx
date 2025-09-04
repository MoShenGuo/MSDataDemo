import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import React, { useCallback, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
// 生成下拉菜单选项 (0 ~ 255)
const getMenuList = (): string[] => {
  const list: string[] = [];
  for (let i = 0; i < 256; i++) {
    list.push(i.toString());
  }
  return list;
};

const HrvTimeInfoPage: React.FC = () => {
    const { t } = useTranslation(); 
  const [selectValue, setSelectValue] = useState<string>('0');
  const [list, setList] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);

  const writeDataRef = React.useRef<((data: any) => void) | null>(null);
  const menuList = getMenuList(); // 预生成选项

  // 更新 writeData 引用
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 发送指令
  const sendCommand = (command: number[]) => {
    if (!writeDataRef.current) {
      Alert.alert('错误', '蓝牙未连接');
      return;
    }
    writeDataRef.current(command);
  };

  // 设置 HRV 测量时间
  const setHrvTime = useCallback((time: number) => {
    setIsLoading(true);
    sendCommand(BleSDK.setHrvTestTime(time));
  }, []);

  // 获取 HRV 测量时间
  const getHrvTime = useCallback(() => {
    setIsLoading(true);
    sendCommand(BleSDK.getHrvTestTime());
  }, []);

  // 数据接收回调
  const handleDataReceived = useCallback((arg: any) => {
    const dataType = arg[DeviceKey.DataType];
    if (dataType === BleConst.GetHrvTimeValue) {
      const data = arg[DeviceKey.Data] as Record<string, any>;
      const isEnd = Boolean(arg[DeviceKey.End]);

      // 清空旧数据，添加新数据
      setList([data]);

      if (isEnd) {
        setIsLoading(false);
      }
    }
  }, []);

  // 处理设置按钮点击
  const handleSetTime = () => {
    const time = parseInt(selectValue, 10);
    if (isNaN(time) || time < 0 || time > 255) {
      Alert.alert('无效输入', '请选择 0-255 之间的数值');
      return;
    }
    setHrvTime(time);
  };

  // 自定义下拉选择组件（React Native 无原生 DropdownButton）
  const renderDropdown = () => {
    return (
      <View style={styles.dropdownContainer}>
        <Pressable style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
          <Text style={styles.dropdownText}>{selectValue}</Text>
        </Pressable>

        <Modal
          visible={dropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
            <View style={styles.dropdownModal}>
              <FlatList
                data={menuList}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                    onPress={() => {
                      setSelectValue(item);
                      setDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </Pressable>
                )}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </Pressable>
        </Modal>
      </View>
    );
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
                {/* 标题 + 下拉选择 */}
                <View style={styles.rowCenter}>
                  <Text style={styles.label}>Unit(seconds)</Text>
                  {renderDropdown()}
                </View>

                {/* 操作按钮 */}
                <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleSetTime}>
                  <Text style={styles.buttonText}>{t('设置时长')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={getHrvTime}>
                  <Text style={styles.buttonText}>{t('读取')}</Text>
                </TouchableOpacity>

                {/* 加载状态 */}
                {isLoading && (
                  <View style={styles.loading}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>{t('同步中...')}</Text>
                  </View>
                )}

                {/* 数据展示 */}
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
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    width: '80%',
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemPressed: {
    backgroundColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#5AC8FA',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
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

export default HrvTimeInfoPage;