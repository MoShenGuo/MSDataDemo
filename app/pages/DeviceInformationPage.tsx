
// import {
//   Alert,
//   Button,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   View
// } from 'react-native';

// import React, { useCallback } from 'react';

// import { BleConst, BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
// import { useTranslation } from "react-i18next";
// import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
// const DeviceInformationPage = () => {
//      const { t } = useTranslation(); 
//   // 处理从蓝牙收到的数据
//   const handleDataReceived = useCallback((data: Record<string, any>) => {
//     const dataType = data[DeviceKey.DataType];

//     switch (dataType) {
//       case BleConst.GetDeviceBatteryLevel:
//       case BleConst.CMD_MCUReset:
//       case BleConst.GetDeviceMacAddress:
//       case BleConst.GetDeviceVersion:
//       case BleConst.GetDeviceInfo:
//       case BleConst.SetDeviceInfo:
//         // 弹出收到的数据（可用于调试或展示）
//         Alert.alert('收到设备信息', JSON.stringify(data, null, 2));
//         break;
//       default:
//         console.log('未知数据类型:', dataType);
//     }
//   }, []);

//   // 弹出确认对话框（用于“初始化”等危险操作）
//   const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
//     Alert.alert(title, message, [
//       { text: '取消', style: 'cancel' },
//       { text: '确定', onPress: onConfirm },
//     ]);
//   };

//   return (
//     <BaseBleComponent onDataReceived={handleDataReceived}>
//       {({ connected, writeData }) => (
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//           style={styles.container}
//         >
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             {/* 页面标题 */}
//             {/* 第一行：初始化 + 电量 */}
//             <View style={styles.row}>
//               <View style={styles.buttonContainer}>
//                 <Button
//                   title={t("初始化")}
//                   color="#d32f2f"
//                   onPress={() =>
//                     showConfirmDialog(
//                       t('提示'),
//                       t('出厂重置将清除设备中的所有数据，请确认是否要重置？'),
//                       () => writeData(BleSDK.reset())
//                     )
//                   }
//                 />
//               </View>
//               <View style={styles.buttonContainer}>
//                 <Button title={t("电量")} onPress={() => writeData(BleSDK.getDeviceBatteryLevel())} />
//               </View>
//             </View>

//             {/* 第二行：蓝牙Mac地址 + 固件版本 */}
//             <View style={styles.row}>
//               <View style={styles.buttonContainer}>
//                 <Button
//                   title={t("蓝牙Mac地址")}
//                   onPress={() => writeData(BleSDK.getDeviceMacAddress())}
//                 />
//               </View>
//               <View style={styles.buttonContainer}>
//                 <Button
//                   title={t("固件版本")}
//                   onPress={() => writeData(BleSDK.getDeviceVersion())}
//                 />
//               </View>
//             </View>

//             {/* 第三行：MCU重启 + 进入升级模式 */}
//             <View style={styles.row}>
//               <View style={styles.buttonContainer}>
//                 <Button title={t("MCU重启")} onPress={() => writeData(BleSDK.mcuReset())} />
//               </View>
//               <View style={styles.buttonContainer}>
//                 <Button
//                   title={t("进入升级模式")}
//                   onPress={() => writeData(BleSDK.enterOTA())}
//                 />
//               </View>
//             </View>

//             {/* 可在此添加设备信息展示区域 */}
//           </ScrollView>
//         </KeyboardAvoidingView>
//       )}
//     </BaseBleComponent>
//   );
// };

// export default DeviceInformationPage;

// // 样式定义
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   scrollContent: {
//     padding: 16,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginVertical: 16,
//     color: '#333',
//   },
//   row: {
//     flexDirection: 'row',
//     marginBottom: 12,
//   },
//   buttonContainer: {
//     flex: 1,
//     marginHorizontal: 5,
//   },
// });



import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { BleConst, BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确
import { bleManager } from '@/sdk/BleManager';
const DeviceInformationPage = () => {
   const { t } = useTranslation(); 
  const isX6 = bleManager.deviceType === 'X6';
  // 其它设备(V5) 开关状态
  const [sport, setSport] = useState(false);
  const [heart, setHeart] = useState(false);
  const [heartDay, setHeartDay] = useState(false);
  // X6 戒指基本参数
  const [handRight, setHandRight] = useState(true);
  const [autoSport, setAutoSport] = useState(false);
  const [hrvSDNN, setHrvSDNN] = useState(false);
  // 信息展示区
  const [info, setInfo] = useState<string>('');

  // 蓝牙数据回调
  const handleDataReceived = useCallback((data: Record<string, any>) => {
    const dataType = data[DeviceKey.DataType];
    const d = data[DeviceKey.Data] || {};

    switch (dataType) {
      case BleConst.GetDeviceBatteryLevel: {
        let str = `电量: ${d[DeviceKey.BatteryLevel] ?? '-'}%`;
        if (d[DeviceKey.ChargeState] !== undefined) {
          str += `   充电中: ${d[DeviceKey.ChargeState] === '1' ? '是' : '否'}   电压: ${d[DeviceKey.Voltage] ?? '-'} mV`;
        }
        setInfo(str);
        break;
      }
      case BleConst.GetDeviceMacAddress:
        setInfo(`MAC: ${JSON.stringify(d)}`);
        break;
      case BleConst.GetDeviceVersion:
        setInfo(`固件版本: ${JSON.stringify(d)}`);
        break;
      case BleConst.GetRingBaseParams: // X6 戒指基本参数
        setHrvSDNN(d[DeviceKey.HrvMode] === '1');
        setHandRight(d[DeviceKey.HandFlag] === '1');
        setAutoSport(d[DeviceKey.AutoSportDetect] === '1');
        setInfo(`戒指参数: ${JSON.stringify(d)}`);
        break;
      case BleConst.OffHandDetection: // X6 脱手检测
        setInfo(`脱手检测: 状态=${d[DeviceKey.OffHandState] === '1' ? '正常佩戴' : '脱手'}  类型=${d[DeviceKey.OffHandType]}  传感器=${d[DeviceKey.HeartSensorStatus]}`);
        break;
      case BleConst.GetDeviceInfo: // 其它设备(V5)
        setSport(d.SportEnable !== '0');
        setHeart(d.HeartEnable !== '0');
        setHeartDay(d.HeartDayEnable !== '0');
        setInfo(`设备信息: ${JSON.stringify(d)}`);
        break;
      case BleConst.SetDeviceInfo:
      case BleConst.SetRingBaseParams:
        setInfo(`设置成功: ${dataType}`);
        break;
      case BleConst.GetSn:
      case BleConst.SetSn:
        setInfo(`SN${d[DeviceKey.SnIndex] ?? ''}: ${d[DeviceKey.Sn] ?? ''}`);
        break;
      case BleConst.Clear_Bracelet_data:
        setInfo('清除数据: 成功');
        break;
      case BleConst.RawPpgSwitch:
      case BleConst.AccRawSwitch:
      case BleConst.Temp200Switch:
      case BleConst.SleepDebug:
        setInfo(`${dataType}: 开关=${d[DeviceKey.SwitchState] ?? '-'}`);
        break;
      case BleConst.GetRaw50Hz:
      case BleConst.GetRawPpg200:
      case BleConst.GetAccRaw:
      case BleConst.GetTemp200:
        setInfo(`原始数据流 ${dataType} (流水号=${d[DeviceKey.SerialId] ?? '-'})`);
        break;
      default:
        console.log('未知数据类型:', dataType);
    }
  }, []);

  // 确认弹窗
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
            {/* 第一行：初始化 + 电量 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button
                  title= {t("初始化")}
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
                <Button title={t("蓝牙Mac地址")} onPress={() => writeData(BleSDK.getDeviceMacAddress())} />
              </View>
              <View style={styles.buttonContainer}>
                <Button title={t("固件版本")} onPress={() => writeData(BleSDK.getDeviceVersion())} />
              </View>
            </View>

            {/* 第三行：MCU重启 + 进入升级模式 */}
            <View style={styles.row}>
              <View style={styles.buttonContainer}>
                <Button title={t("MCU重启")} onPress={() => writeData(BleSDK.mcuReset())} />
              </View>
              <View style={styles.buttonContainer}>
                <Button title={t("进入升级模式")} onPress={() => writeData(BleSDK.enterOTA())} />
              </View>
            </View>

            {isX6 ? (
              <>
                {/* X6 戒指基本参数 */}
                <View style={styles.row}>
                  <Text style={styles.switchLabel}>左手</Text>
                  <Switch value={handRight} onValueChange={setHandRight} />
                  <Text style={styles.switchLabel}>右手</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.switchLabel}>自动检测运动</Text>
                  <Switch value={autoSport} onValueChange={setAutoSport} />
                </View>
                <View style={styles.row}>
                  <Text style={styles.switchLabel}>HRV: RMSSD</Text>
                  <Switch value={hrvSDNN} onValueChange={setHrvSDNN} />
                  <Text style={styles.switchLabel}>SDNN</Text>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}>
                    <Button
                      title="设置戒指参数"
                      onPress={() => writeData(BleSDK.setRingBaseParams({ rightHand: handRight, autoSportDetect: autoSport, hrvMode: hrvSDNN ? 1 : 0 }))}
                    />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button title="获取戒指参数" onPress={() => writeData(BleSDK.getRingBaseParams())} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}>
                    <Button title="脱手检测" onPress={() => writeData(BleSDK.getOffHandDetection())} />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button title="读取SN" onPress={() => writeData(BleSDK.readSn(1))} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}>
                    <Button title="写入SN" onPress={() => writeData(BleSDK.setSn(1, 'SN12345678'))} />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button
                      title="清除全部数据"
                      color="#d32f2f"
                      onPress={() => showConfirmDialog(t('提示'), '将清除戒指全部历史数据(不休眠), 确认?', () => writeData(BleSDK.clearBraceletData()))}
                    />
                  </View>
                </View>

                <Text style={styles.groupLabel}>原始数据/调试 (仅特定型号)</Text>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}><Button title="50HZ原始开" onPress={() => writeData(BleSDK.setRaw50HzData(true))} /></View>
                  <View style={styles.buttonContainer}><Button title="50HZ原始关" onPress={() => writeData(BleSDK.setRaw50HzData(false))} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}><Button title="PPG原始开(0x95)" onPress={() => writeData(BleSDK.setRawPpgData(true))} /></View>
                  <View style={styles.buttonContainer}><Button title="PPG原始关" onPress={() => writeData(BleSDK.setRawPpgData(false))} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}><Button title="ACC原始开(0x33)" onPress={() => writeData(BleSDK.setAccRawData(true))} /></View>
                  <View style={styles.buttonContainer}><Button title="ACC原始关" onPress={() => writeData(BleSDK.setAccRawData(false))} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}><Button title="200HZ温度开(0x35)" onPress={() => writeData(BleSDK.setTemp200Detection(true))} /></View>
                  <View style={styles.buttonContainer}><Button title="200HZ温度关" onPress={() => writeData(BleSDK.setTemp200Detection(false))} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.buttonContainer}><Button title="睡眠调试开(0x81)" onPress={() => writeData(BleSDK.setSleepDebug(true))} /></View>
                  <View style={styles.buttonContainer}><Button title="睡眠调试关" onPress={() => writeData(BleSDK.setSleepDebug(false))} /></View>
                </View>
              </>
            ) : (
              <>
                {/* 开关控制 */}
                <View style={styles.row}>
                  <Text style={styles.switchLabel}>{t("运动模式")}</Text>
                  <Switch value={sport} onValueChange={setSport} />
                  <Text style={styles.switchLabel}>{t("心率")}</Text>
                  <Switch value={heart} onValueChange={setHeart} />
                  <Text style={styles.switchLabel}>{t("全天心率")}</Text>
                  <Switch value={heartDay} onValueChange={setHeartDay} />
                </View>

                {/* 设置/获取设备信息按钮 */}
                <View style={styles.row}>
                  <View style={styles.buttonContainer}>
                    <Button
                      title={t("设置设备信息")}
                      onPress={() => writeData(BleSDK.setDeviceInfoV5(heart, sport, heartDay))}
                    />
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button title={t("获取设备信息")} onPress={() => writeData(BleSDK.getDeviceInfo())} />
                  </View>
                </View>
              </>
            )}

            {info ? <Text style={styles.infoText}>{info}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BaseBleComponent>
  );
};

export default DeviceInformationPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonContainer: { flex: 1, marginHorizontal: 5 },
  switchLabel: { marginHorizontal: 5 },
  infoText: { marginTop: 10, fontSize: 13, color: '#333', backgroundColor: '#fff', padding: 10, borderRadius: 6 },
  groupLabel: { marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '600', color: '#666' },
});
