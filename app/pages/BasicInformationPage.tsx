// BasicInformationPage.tsx
// import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';

import React, { useCallback, useState } from 'react';

import { BleConst, BleSDK, DeviceKey, MyPersonalInfo } from "@moshenguo/ms-data-sdk";

import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确

const BasicInformationPage: React.FC = () => {
   const { t } = useTranslation(); 
  // 表单状态
  const [sex, setSex] = useState<boolean>(false); // false=男, true=女
  const [age, setAge] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [stride, setStride] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 接收蓝牙数据
  const handleDataReceived = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;

    const dataType = data[DeviceKey.DataType];

    switch (dataType) {
      case BleConst.GetDeviceTime:
      //   const plainData = data instanceof Map 
      // ? Object.fromEntries(data.entries()) 
      // : data;

    Alert.alert('SetDeviceTime', JSON.stringify(data, null, 2));
        // Alert.alert('GetDeviceTime', JSON.stringify(data));
        break;
      case BleConst.SetDeviceTime:
        Alert.alert('SetDeviceTime', JSON.stringify(data));
        break;
      case BleConst.GetPersonalInfo:
        Alert.alert('GetPersonalInfo', JSON.stringify(data));
        // 可选：自动填充
        fillFormFromDevice(data);
        break;
      case BleConst.SetPersonalInfo:
        Alert.alert('SetPersonalInfo', JSON.stringify(data));
        break;
      default:
        console.log('Unknown data type:', dataType);
        break;
    }

    // 停止加载
    setLoading(false);
  }, []);

  // 自动填充表单
  const fillFormFromDevice = (data: any) => {
    console.log('info:',data);
    const info = data[DeviceKey.Data] || {};
        // const finish = data.get(DeviceKey.End) || false;
        const sex1 = info[DeviceKey.Gender];
         const age1 = info[DeviceKey.Age];
    setSex(Boolean(sex1 === 0)); // 根据协议调整,0表示女性
    setAge(String(age1|| ''));
    setHeight(String(info[DeviceKey.Height] || ''));
    setWeight(String(info[DeviceKey.Weight] || ''));
    setStride(String(info[DeviceKey.Stride] || ''));
  };

  // 设置手环时间
  const handleSetDeviceTime = (writeData: (data: number[]) => void) => {
    setLoading(true);
    const now = new Date();
    const command = BleSDK.setDeviceTime(now);
    writeData(command);
  };

  // 获取手环时间
  const handleGetDeviceTime = (writeData: (data: number[]) => void) => {
    setLoading(true);
    const command = BleSDK.getDeviceTime();
    writeData(command);
  };

  // 设置个人信息
  const handleSetPersonalInfo = (writeData: (data: number[]) => void) => {
    if (!age.trim()) {
      Alert.alert(t('提示'), t('没有输入年龄'));
      return;
    }
    if (!height.trim()) {
      Alert.alert(t('提示'), t('没有输入身高'));
      return;
    }
    if (!weight.trim()) {
      Alert.alert(t('提示'), t('没有输入体重'));
      return;
    }

    const info: MyPersonalInfo = {
      sex: sex ? 0 : 1, // 根据协议：女=0，男=1
      age: parseInt(age, 10),
      height: parseInt(height, 10),
      weight: parseInt(weight, 10),
    };
if (stride.trim()) {
  info.stepLength = parseInt(stride, 10);
}
    setLoading(true);
    const command = BleSDK.setPersonalInfo(info);
    writeData(command);
  };

  // 获取个人信息
  const handleGetPersonalInfo = (writeData: (data: number[]) => void) => {
    setLoading(true);
    const command = BleSDK.getPersonalInfo();
    writeData(command);
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 加载状态 */}
            {loading && <ActivityIndicator size="large" color="#007AFF" />}

            {/* 顶部按钮组 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button
                  title={t('设置手环时间')}
                  onPress={() => handleSetDeviceTime(writeData)}
                  disabled={!connected}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  title={t('获取手环时间')}
                  onPress={() => handleGetDeviceTime(writeData)}
                  disabled={!connected}
                />
              </View>
            </View>

            {/* 标题 */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('基础信息设置')}</Text>
            </View>

            {/* 性别 */}
            <View style={styles.row}>
              <View style={[styles.buttonContainer, { flex: 1 }]}>
                <Text style={styles.label}>{t('性别')}</Text>
              </View>
              <View style={[styles.row, { flex: 2, justifyContent: 'center' }]}>
                <Text style={styles.text}>{t('男')}</Text>
                <Switch value={sex} onValueChange={setSex} />
                <Text style={styles.text}>{t('女')}</Text>
              </View>
            </View>

            {/* 输入框行 */}
            <View style={styles.inputRow}>
              {[
                { label: t('年龄'), value: age, setter: setAge, refKey: 'age' },
                { label: t('身高'), value: height, setter: setHeight, refKey: 'height' },
                { label: t('体重'), value: weight, setter: setWeight, refKey: 'weight' },
                { label: t('步长'), value: stride, setter: setStride, refKey: 'stride' },
              ].map((field) => (
                <View key={field.refKey} style={styles.inputCol}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={field.setter}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                </View>
              ))}
            </View>

            {/* 底部按钮 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button
                  title={t('设置个人信息')}
                  onPress={() => handleSetPersonalInfo(writeData)}
                  disabled={!connected}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  title={t('获取个人信息')}
                  onPress={() => handleGetPersonalInfo(writeData)}
                  disabled={!connected}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BaseBleComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // 浅灰色背景，提升视觉层次
  },
  scrollContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  titleContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  // 可选：为 Switch 添加样式（仅 iOS 有效）
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
});

// const styles = require('./BasicInformationPageStyles'); // 或直接内联样式

export default BasicInformationPage;