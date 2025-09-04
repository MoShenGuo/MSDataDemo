import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
const SetGoalsPage: React.FC = () => {
  const { t } = useTranslation(); 
  // 控制器（TextInput 的值）
  const stepController = useRef<TextInput>(null);
  const distanceController = useRef<TextInput>(null);
  const calorieController = useRef<TextInput>(null);
  const sleepHourController = useRef<TextInput>(null);
  const sleepMinuteController = useRef<TextInput>(null);

  // 本地状态存储文本值
  const [stepText, setStepText] = useState<string>('');
  const [distanceText, setDistanceText] = useState<string>('');
  const [calorieText, setCalorieText] = useState<string>('');
  const [sleepHourText, setSleepHourText] = useState<string>('');
  const [sleepMinuteText, setSleepMinuteText] = useState<string>('');

  // 使用 useRef 保存最新的 writeData
  const writeDataRef = useRef<((data: any) => void) | null>(null);

  // 处理从设备接收到的数据
  const handleDataReceived = useCallback((arg: any) => {
      const map = arg;
      const dataType = map[DeviceKey.DataType];
const data = map[DeviceKey.Data];
    switch (dataType) {
      case BleConst.SetStepGoal:
        Alert.alert(t('设置结果'), JSON.stringify(data));
        break;

      case BleConst.GetStepGoal:
        const goal = data[DeviceKey.StepGoal];
        const distance = data[DeviceKey.DistanceGoal];
        const calorie = data[DeviceKey.CalorieGoal];
        const sleepTime = data[DeviceKey.SleepTimeGoal];

        if (goal !== undefined) setStepText(goal.toString());
        if (distance !== undefined) setDistanceText(distance.toString());
        if (calorie !== undefined) setCalorieText(calorie.toString());

        if (sleepTime !== undefined) {
          const totalMinutes = parseInt(sleepTime, 10);
          const hour = Math.floor(totalMinutes / 60);
          const minute = totalMinutes % 60;
          setSleepHourText(hour.toString());
          setSleepMinuteText(minute.toString());
        }
        break;

      default:
        break;
    }
  }, []);

  // 更新 writeData 到 ref
  const updateWriteData = (writeData: (data: any) => void) => {
    writeDataRef.current = writeData;
  };

  // 设置目标按钮点击
  const handleSetGoals = () => {
    const step = parseInt(stepText, 10);
    const distance = parseInt(distanceText, 10);
    const calorie = parseInt(calorieText, 10);
    const sleepHour = parseInt(sleepHourText, 10);
    const sleepMinute = parseInt(sleepMinuteText, 10);

    // 验证输入
    if (
      isNaN(step) ||
      isNaN(distance) ||
      isNaN(calorie) ||
      isNaN(sleepHour) ||
      isNaN(sleepMinute)
    ) {
      Alert.alert(t('提示'), t('请填写所有目标值'));
      return;
    }

    if (step < 2000 || step > 50000) {
      Alert.alert(t('提示)'), t('目标步数范围：2000-50000'));
      return;
    }
    if (distance < 1 || distance > 200) {
      Alert.alert(t('提示'), '目标距离范围：1-200 千米');
      return;
    }
    if (calorie < 100 || calorie > 10000) {
      Alert.alert(t('提示'), '卡路里范围：100-10000 千卡');
      return;
    }

    const totalSleepMinutes = sleepHour * 60 + sleepMinute;

    // 发送设置指令
    if (writeDataRef.current) {
      const command = BleSDK.setStepGoal(step, 3600, distance, calorie, totalSleepMinutes);
      writeDataRef.current(command);
    } else {
      Alert.alert(t('错误'), t('蓝牙未连接'));
    }
  };

  // 获取目标按钮点击
  const handleGetGoals = () => {
    if (writeDataRef.current) {
      writeDataRef.current(BleSDK.GetStepGoal());
    } else {
      Alert.alert(t('错误'), t('蓝牙未连接'));
    }
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => {
        // 每次渲染更新 writeData 引用
        updateWriteData(writeData);

        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
          >
            <SafeAreaView style={styles.safeArea}>
              {/* 页面标题 */}
              {/* 滚动内容 */}
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 目标步数 */}
                <View style={styles.row}>
                  <Text style={styles.label}>{t('目标步数(步)')}</Text>
                  <TextInput
                    ref={stepController}
                    style={styles.input}
                    value={stepText}
                    onChangeText={setStepText}
                    textAlign="center"
                    placeholder="2000-50000"
                    keyboardType="number-pad"
                  />
                </View>

                {/* 目标距离 */}
                <View style={styles.row}>
                  <Text style={styles.label}>{t('目标距离(千米)')}</Text>
                  <TextInput
                    ref={distanceController}
                    style={styles.input}
                    value={distanceText}
                    onChangeText={setDistanceText}
                    textAlign="center"
                    placeholder="1-200"
                    keyboardType="number-pad"
                  />
                </View>

                {/* 卡路里 */}
                <View style={styles.row}>
                  <Text style={styles.label}>{t('卡路里(千卡)')}</Text>
                  <TextInput
                    ref={calorieController}
                    style={styles.input}
                    value={calorieText}
                    onChangeText={setCalorieText}
                    textAlign="center"
                    placeholder="100-10000"
                    keyboardType="number-pad"
                  />
                </View>

                {/* 睡眠目标 */}
                <View style={styles.row}>
                  <Text style={styles.label}>{t('睡眠目标')}</Text>
                  <TextInput
                    ref={sleepHourController}
                    style={styles.halfInput}
                    value={sleepHourText}
                    onChangeText={setSleepHourText}
                    textAlign="center"
                    placeholder= {t("小时")}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    ref={sleepMinuteController}
                    style={styles.halfInput}
                    value={sleepMinuteText}
                    onChangeText={setSleepMinuteText}
                    textAlign="center"
                    placeholder= {t("分钟")}
                    keyboardType="number-pad"
                  />
                </View>

                {/* 按钮组 */}
                <View style={styles.buttonRow}>
                  <View style={styles.buttonContainer}>
                    <Button title={t("设置")} onPress={handleSetGoals} />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button title={t("获取")} onPress={handleGetGoals} color="#007AFF" />
                  </View>
                </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  label: {
    width: 100,
    fontSize: 16,
    color: '#333',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  halfInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default SetGoalsPage;