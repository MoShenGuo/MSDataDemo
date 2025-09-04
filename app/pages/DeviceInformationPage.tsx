
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

import React, { useCallback } from 'react';

import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
const DeviceInformationPage = () => {
     const { t } = useTranslation(); 
  // 处理从蓝牙收到的数据
  const handleDataReceived = useCallback((data: Record<string, any>) => {
    const dataType = data[DeviceKey.DataType];

    switch (dataType) {
      case BleConst.GetDeviceBatteryLevel:
      case BleConst.CMD_MCUReset:
      case BleConst.GetDeviceMacAddress:
      case BleConst.GetDeviceVersion:
      case BleConst.GetDeviceInfo:
      case BleConst.SetDeviceInfo:
        // 弹出收到的数据（可用于调试或展示）
        Alert.alert('收到设备信息', JSON.stringify(data, null, 2));
        break;
      default:
        console.log('未知数据类型:', dataType);
    }
  }, []);

  // 弹出确认对话框（用于“初始化”等危险操作）
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: onConfirm },
    ]);
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 页面标题 */}
            {/* 第一行：初始化 + 电量 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button
                  title={t("初始化")}
                  color="#d32f2f"
                  onPress={() =>
                    showConfirmDialog(
                      t('提示'),
                      t('出厂重置将清除设备中的所有数据，请确认是否要重置？'),
                      () => writeData(BleSDK.reset())
                    )
                  }
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button title={t("电量")} onPress={() => writeData(BleSDK.getDeviceBatteryLevel())} />
              </View>
            </View>

            {/* 第二行：蓝牙Mac地址 + 固件版本 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button
                  title={t("蓝牙Mac地址")}
                  onPress={() => writeData(BleSDK.getDeviceMacAddress())}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  title={t("固件版本")}
                  onPress={() => writeData(BleSDK.getDeviceVersion())}
                />
              </View>
            </View>

            {/* 第三行：MCU重启 + 进入升级模式 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button title={t("MCU重启")} onPress={() => writeData(BleSDK.mcuReset())} />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  title={t("进入升级模式")}
                  onPress={() => writeData(BleSDK.enterOTA())}
                />
              </View>
            </View>

            {/* 可在此添加设备信息展示区域 */}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BaseBleComponent>
  );
};

export default DeviceInformationPage;

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
});