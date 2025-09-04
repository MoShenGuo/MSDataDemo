// import { BleConst, DeviceKey } from '@/sdk/bleConst';
// import BleSDK from '@/sdk/bleSDK';
// import { MyAutomaticHRMonitoring } from '@/sdk/models';
import { BleConst, BleSDK, DeviceKey, MyAutomaticHRMonitoring } from "@moshenguo/ms-data-sdk";
import DateTimePicker from '@react-native-community/datetimepicker'; // 需要安装
import React, {
  useCallback,
  useRef,
  useState
} from 'react';
import { useTranslation } from "react-i18next";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确

const AutoHeartRateIntervalPage = () => {
     const { t } = useTranslation(); 
  // 模式状态
  const [mode, setMode] = useState<number>(0); // 0:关闭, 1:一直开启, 2:间隔开启
  const [type, setType] = useState<number>(1); // 1:心率, 2:血氧, 3:温度, 4:HRV

  // 时间选择
  const [startHour, setStartHour] = useState<number>(0);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(0);
  const [endMinute, setEndMinute] = useState<number>(0);

  // 星期选择 (0=周日, 1=周一, ..., 6=周六)
  const [weeks, setWeeks] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // 间隔时间输入
  const [minuteInput, setMinuteInput] = useState<string>('');

  // 时间选择器可见性
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);

  // 提示对话框
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogMessage, setDialogMessage] = useState<string>('');

  const writeDataRef = useRef<((data: any) => void) | null>(null);

  // 更新 writeData 到 ref
  const updateWriteDataRef = useCallback((writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  }, []);

  // 处理 BLE 数据接收
  const handleDataReceived = useCallback((arg: any) => {
    const map = arg;
    const dataType = map[DeviceKey.DataType];

    switch (dataType) {
      case BleConst.SetAutomaticHRMonitoring:
        setDialogMessage(JSON.stringify(map));
        setDialogVisible(true);
        break;

      case BleConst.GetAutomaticHRMonitoring:
        const data = map[DeviceKey.Data];
        if (!data) return;

        const startH = parseInt(data[DeviceKey.StartTime] || '0', 10);
        const startM = parseInt(data[DeviceKey.KHeartStartMinter] || '0', 10);
        const endH = parseInt(data[DeviceKey.EndTime] || '0', 10);
        const endM = parseInt(data[DeviceKey.KHeartEndMinter] || '0', 10);
        const intervalTime = data[DeviceKey.IntervalTime] || '';
        const weekStr = data[DeviceKey.Weeks] || '';
        const weekBits = weekStr.split('-').map(bit => parseInt(bit, 10));

        setMode(parseInt(data[DeviceKey.WorkMode] || '0', 10));
        setStartHour(startH);
        setStartMinute(startM);
        setEndHour(endH);
        setEndMinute(endM);
        setMinuteInput(intervalTime);
        setWeeks(weekBits);
        break;
    }
  }, []);

  // 打开时间选择器
  const showStartTimePickerHandler = () => {
    setShowStartTimePicker(true);
  };

  const showEndTimePickerHandler = () => {
    setShowEndTimePicker(true);
  };

  // 时间选择回调
  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartHour(selectedTime.getHours());
      setStartMinute(selectedTime.getMinutes());
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndHour(selectedTime.getHours());
      setEndMinute(selectedTime.getMinutes());
    }
  };

  // 切换星期
  const toggleWeek = (index: number) => {
    setWeeks(prev => {
      const newWeeks = [...prev];
      newWeeks[index] = newWeeks[index] ? 0 : 1;
      return newWeeks;
    });
  };

  // 获取数据
  const handleGet = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);
    if (BleSDK.getAutomaticHRMonitoring) {
      writeData(BleSDK.getAutomaticHRMonitoring(type));
    } else {
      Alert.alert('错误', 'SDK 方法 GetAutomaticHRMonitoring 未定义');
    }
  }, [type, updateWriteDataRef]);

  // 设置数据
  const handleSet = useCallback((writeData: (data: any) => void) => {
    updateWriteDataRef(writeData);

    if (!minuteInput || isNaN(parseInt(minuteInput))) {
      Alert.alert(t('提示'), t('请输入有效的间隔时间'));
      return;
    }

    // 计算星期位掩码
    let weekMask = 0;
    weeks.forEach((value, index) => {
      if (value === 1) {
        weekMask += Math.pow(2, index);
      }
    });

    const info: MyAutomaticHRMonitoring = {
      open: mode,
      startHour,
      startMinute,
      endHour,
      endMinute,
      week: weekMask,
      time: parseInt(minuteInput),
      type,
    };

    if (BleSDK.setAutomaticHRMonitoring) {
      writeData(BleSDK.setAutomaticHRMonitoring(info));
    } else {
      Alert.alert('错误', 'SDK 方法 SetAutomaticHRMonitoring 未定义');
    }
  }, [mode, startHour, startMinute, endHour, endMinute, weeks, minuteInput, type, updateWriteDataRef]);

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        updateWriteDataRef(writeData);

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 模式选择：关闭/一直开启/间隔开启 */}
                <View style={styles.radioRow}>
                  <Pressable onPress={() => setMode(0)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, mode === 0 && styles.radioSelected]}>
                      {mode === 0 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('关闭')}</Text>
                  </Pressable>

                  <Pressable onPress={() => setMode(1)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, mode === 1 && styles.radioSelected]}>
                      {mode === 1 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('一直开启')}</Text>
                  </Pressable>

                  <Pressable onPress={() => setMode(2)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, mode === 2 && styles.radioSelected]}>
                      {mode === 2 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('间隔开启')}</Text>
                  </Pressable>
                </View>

                {/* 类型选择：心率/血氧/温度/HRV */}
                <View style={styles.radioRow}>
                  <Pressable onPress={() => setType(1)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, type === 1 && styles.radioSelected]}>
                      {type === 1 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('心率')}</Text>
                  </Pressable>

                  <Pressable onPress={() => setType(2)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, type === 2 && styles.radioSelected]}>
                      {type === 2 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('血氧')}</Text>
                  </Pressable>
                </View>

                <View style={styles.radioRow}>
                  <Pressable onPress={() => setType(3)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, type === 3 && styles.radioSelected]}>
                      {type === 3 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{t('温度')}</Text>
                  </Pressable>

                  <Pressable onPress={() => setType(4)} style={styles.radioContainer}>
                    <View style={[styles.radioOuter, type === 4 && styles.radioSelected]}>
                      {type === 4 && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Hrv</Text>
                  </Pressable>
                </View>

                {/* 开始/结束时间选择 */}
                <View style={styles.buttonRow}>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={showStartTimePickerHandler}
                    >
                      <Text style={styles.buttonText}>{t('开始时间')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={showEndTimePickerHandler}
                    >
                      <Text style={styles.buttonText}>{t('结束时间')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 显示选择的时间 */}
                <View style={styles.buttonRow}>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity style={styles.timeDisplayButton} disabled>
                      <Text style={styles.timeDisplayText}>
                        {String(startHour).padStart(2, '0')}:{String(startMinute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity style={styles.timeDisplayButton} disabled>
                      <Text style={styles.timeDisplayText}>
                        {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 星期标题 */}
                <View style={styles.weekTitleContainer}>
                  <Text style={styles.weekTitle}>{t('星期选择')}</Text>
                </View>

                {/* 星期选择网格 */}
                <View style={styles.weekGrid}>
                  {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
                    <Pressable
                      key={index}
                      style={styles.weekItem}
                      onPress={() => toggleWeek(index)}
                    >
                      <View style={[styles.checkboxOuter, weeks[index] === 1 && styles.checkboxChecked]}>
                        {weeks[index] === 1 && <View style={styles.checkboxInner} />}
                      </View>
                      <Text style={styles.weekText}>{t(day)}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* 间隔时间输入 */}
                <View style={styles.intervalRow}>
                  <Text style={styles.intervalLabel}>{t('间隔时间')}</Text>
                  <TextInput
                    style={styles.input}
                    value={minuteInput}
                    onChangeText={setMinuteInput}
                    keyboardType="numeric"
                    textAlign="center"
                    placeholder={t("分钟")}
                  />
                  <Text style={styles.intervalUnit}>{t('分钟')}</Text>
                </View>

                {/* 获取 & 设置按钮 */}
                <View style={styles.buttonRow}>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: '#34C759' }]}
                      onPress={() => handleGet(writeData)}
                    >
                      <Text style={styles.buttonText}>{t('获取')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => handleSet(writeData)}
                    >
                      <Text style={styles.buttonText}>{t('设置')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 时间选择器 */}
                {showStartTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={onStartTimeChange}
                  />
                )}
                {showEndTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={onEndTimeChange}
                  />
                )}

                {/* 提示对话框 */}
                <Modal
                  transparent
                  visible={dialogVisible}
                  animationType="fade"
                  onRequestClose={() => setDialogVisible(false)}
                >
                  <View style={styles.modalBackground}>
                    <View style={styles.dialogContainer}>
                      <Text style={styles.dialogTitle}>设置结果</Text>
                      <Text style={styles.dialogMessage}>{dialogMessage}</Text>
                      <TouchableOpacity
                        style={styles.dialogButton}
                        onPress={() => setDialogVisible(false)}
                      >
                        <Text style={styles.dialogButtonText}>确定</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        );
      }}
    </BaseBleComponent>
  );
};

export default AutoHeartRateIntervalPage;

// 样式
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
    marginVertical: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
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
  timeDisplayButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeDisplayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  weekTitleContainer: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginBottom: 10,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  weekText: {
    fontSize: 14,
    color: '#333',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  intervalLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  intervalUnit: {
    fontSize: 16,
    color: '#333',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 32,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  dialogButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dialogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});