import BaseBleComponent from '@/app/BaseBleComponent';
import { screenConfig } from '@/sdk/screens';
import { BleConst, BleSDK, DeviceKey } from "@yhmedical/ms-data-sdk";
import { useIsFocused } from '@react-navigation/native'; // expo-router 内部兼容
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// import { screenConfig } from "@/screens";
import { useTranslation } from "react-i18next";
import { bleManager } from '@/sdk/BleManager';

// X6 (2301 戒指) 不支持的功能页面路由, 连接 X6 时从菜单隐藏
const X6_HIDDEN_PAGES = [
  '/pages/AlarmClockPage',
  '/pages/SedentaryRemindPage',
  '/pages/RemiderBlePage',
  '/pages/WeatherBlePage',
  '/pages/TakePhotoBlePage',
  '/pages/PPGScreen',
];
const MainPage = () => {
   const { t } = useTranslation(); 
  const router = useRouter();
// const navigation = useNavigation();
  const { mac, name } = useLocalSearchParams<{ mac?: string; name?: string }>();
const listData = Object.entries(screenConfig).map(([page, title]) => {
  const translatedTitle = t(title).trim();
  console.log('Page:', page, 'Title:', translatedTitle);
  return {
    id: page,
    page,
    title: translatedTitle,
  };
});

  const [isStartReal, setIsStartReal] = useState(false);
  const [step, setStep] = useState('0');
  const [calories, setCalories] = useState('0');
  const [distance, setDistance] = useState('0');
  const [time, setTime] = useState('0');
  const [activityTime, setActivityTime] = useState('0');
  const [heart, setHeart] = useState('0');
  const [temp, setTemp] = useState('0');
  const isFocused = useIsFocused(); // 当前页面是否在前台
  const isFocusedRef = useRef(isFocused); // ref 保存最新状态
  useEffect(() => {
    isFocusedRef.current = isFocused;
    console.log("📊 isFocused =", isFocused);
  }, [isFocused]);

   // ✅ 回调函数（用 ref 判断前后台状态）
  const handleDataCallBack = useCallback((dataMap: any) => {
    if (!isFocusedRef.current) {
      console.log(
        "[MainPage] 页面不在前台，忽略数据:",
        dataMap?.[DeviceKey.DataType]
      );
      return;
    }

    const dataType = dataMap?.[DeviceKey.DataType];
    if (!dataType) {
      console.warn("[MainPage] 收到数据但缺少 dataType 字段:", dataMap);
      return;
    }

    console.log("[MainPage] 处理数据类型:", dataType);

    switch (dataType) {
      case BleConst.EnterQrCode:
      case BleConst.QrCodeBandBack:
      case BleConst.ExitQrCode:
      case BleConst.GetEcgPpgStatus:
      case BleConst.EnterPhotoMode:
      case BleConst.DeviceSendDataToAPP:
      case BleConst.GetOffCheckStatus:
        Alert.alert('收到数据', JSON.stringify(dataMap));
        break;
      case BleConst.RealTimeStep: {
        const data = dataMap[DeviceKey.Data];
        if (data) {
           setStep(data[DeviceKey.Step] || '0');
          setCalories(data[DeviceKey.Calories] || '0');
          setDistance(data[DeviceKey.Distance] || '0');

          const exerciseMinutes = parseFloat(data[DeviceKey.ExerciseMinutes]);
          setTime(isNaN(exerciseMinutes) ? '0' : exerciseMinutes.toFixed(2));

          const activeMinutes = parseFloat(data[DeviceKey.ActiveMinutes]);
          setActivityTime(isNaN(activeMinutes) ? '0' : activeMinutes.toFixed(2));

          setHeart(data[DeviceKey.HeartRate] || '0');

          const tempData = parseFloat(data[DeviceKey.TempData]);
          setTemp(isNaN(tempData) ? '0' : (tempData / 10).toFixed(1));
        } else {
          console.warn("[MainPage] RealTimeStep 数据缺失 data 字段:", dataMap);
        }
        break;
      }

      default: {
        break;
      }
    }
  }, []);

  return (
    <BaseBleComponent onDataReceived={handleDataCallBack}>
      {({ connected, writeData, connect, disconnect }) => {
        const toggleActivityMode = () => {
          const newMode = !isStartReal;
          setIsStartReal(newMode);
          writeData(BleSDK.realTimeStep(newMode, false));
        };

        return (
          <View style={styles.container}>
            {/* 控制按钮 */}
            <View style={styles.controlRow}>
              <Button
                title={connected ? t('已连接') : t('连接设备')}
                onPress={() => connect(mac)}
                disabled={connected}
              />
              {connected && <Button title = {t('断开')} onPress={disconnect} />}
            </View>

            {/* 实时运动数据 */}
            <View style={styles.activityContainer}>
              <View style={styles.activityButton}>
                <Button
                  title={isStartReal ? t('停止') : t('开始运动')}
                  onPress={toggleActivityMode}
                  disabled={!connected}
                />
              </View>
              <View style={styles.dataDisplay}>
                <Text>{t('步数')}: {step}</Text>
                <Text>{t('卡路里')}: {calories}</Text>
                <Text>{t('距离')}: {distance}</Text>
                <Text>{t('时间')}: {time}</Text>
                <Text>{t('活动时间')}: {activityTime}</Text>
                <Text>{t('心率')}: {heart}</Text>
                <Text>{t('温度')}: {temp} ℃</Text>
              </View>
            </View>

            {/* 功能菜单 */}
            
<FlatList
      data={bleManager.deviceType === 'X6'
        ? listData.filter((it) => !X6_HIDDEN_PAGES.includes(it.id))
        : listData}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.menuContainer}
      renderItem={({ item }) => (
        <View style={styles.menuItem}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              if (item.page == "/pages/PPGScreen") {
                router.push({
                  pathname: item.page,
                  params: { mac },
                });
              }else{
                router.push(item.page)
              }
            }}
          >
            <Text style={styles.menuButtonText}>{item.title}</Text>
          </TouchableOpacity>
        </View>
      )}
    />
          </View>
        );
      }}
    </BaseBleComponent>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f5f5f5' },
  controlRow: { marginVertical: 10, flexDirection: 'row', justifyContent: 'space-around' },
  activityContainer: {
    flexDirection: 'row',
    height: 150,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  activityButton: { width: 120, justifyContent: 'center' },
  dataDisplay: { flex: 1, marginLeft: 10, justifyContent: 'space-around' },
  menuContainer: {
    padding: 10,
  },
  menuItem: {
    flex: 1,
    margin: 5,
    minWidth: "45%",
    aspectRatio: 2.5,
  },
  menuButton: {
    flex: 1,
    backgroundColor: "#6200ee",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  menuButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    textTransform: "none", // 保持原样，不会大写
  },
});

export default MainPage;
