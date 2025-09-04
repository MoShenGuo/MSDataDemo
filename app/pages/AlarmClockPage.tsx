import { BleConst, BleSDK, DeviceKey } from "@moshenguo/ms-data-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BaseBleComponent from "../BaseBleComponent";
const STORAGE_KEY = "arrayClock";


const AlarmClockPage: React.FC = () => {
     const { t } = useTranslation(); 
   const router = useRouter();
  const [alarmClocks, setAlarmClocks] = useState<any[]>([]);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  // === 本地存储数据 ===
  const loadData = async () => {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue) {
      setAlarmClocks(JSON.parse(jsonValue));
    } else {
      setAlarmClocks([]);
    }
  };

  // week 既可以是数字 (bit 位) 也可以是数组 [1,0,1,0,1,0,1]
  const getAlarmClockWeek = (week: number | number[]): string => {
     const weekNames = [
    t("周日"),
    t("周一"),
    t("周二"),
    t("周三"),
    t("周四"),
    t("周五"),
    t("周六"),
  ];
    if (Array.isArray(week)) {
      // 数组形式 [1,0,1,0,1,0,1]
      return week
        .map((v, i) => (v === 1 ? weekNames[i] : ""))
        .filter((s) => s !== "")
        .join(" ");
    } else {
      // 数字形式 bit 位
      return weekNames
        .map((name, index) => ((week & (1 << index)) !== 0 ? name : ""))
        .filter((s) => s !== "")
        .join(" ");
    }
  };

  const saveData = async (arr: any[]) => {
    setAlarmClocks(arr);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  const addOrEditAlarm = (index: number) => {
     router.push({
      pathname: "/pages/AlarmClockDetailPage",
      params: {
         numberClock: index,
      alarmClocks,
      },
    });
  };

  // === 处理设备返回的数据 ===
  const handleDataReceived = (data: any) => {
    console.log("解析后的数据:", data);

    if (!data || typeof data !== "object") return;

    const dataType = data[DeviceKey.DataType];
    const finish = Boolean(data[DeviceKey.End]);

    if (dataType === BleConst.GetAlarmClock && Array.isArray(data[DeviceKey.Data])) {
      // 从 SDK 的解析结果取数据
      const clocks = data[DeviceKey.Data].map((c: any) => ({
        clockTime: `${c[DeviceKey.ClockTime]}:${c[DeviceKey.KAlarmMinter]}`,
        clockType: parseInt(c[DeviceKey.ClockType]),
        openOrClose: parseInt(c[DeviceKey.OpenOrClose]),
        week: parseInt(c[DeviceKey.Week]),
        text: c[DeviceKey.KAlarmContent],
      }));

      saveData(clocks);
    }

    if (dataType === BleConst.GetAlarmClock && finish) {
      console.log("✅ 收到设备返回的所有闹钟数据");
    }
  };

  return (
    <BaseBleComponent
      onDataReceived={handleDataReceived}
      onRawDataReceived={(raw) => console.log("raw:", raw)}
    >
      {({ connected, connect, disconnect, writeData }) => {
        useEffect(() => {
          if (connected) {
            console.log("进入页面，发送读取闹钟指令");
            const cmd = BleSDK.getAlarmClock();
            writeData(cmd);
          }
        }, [connected]);

        return (
          <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              {connected ? `✅ ${t("已连接设备")}` : `❌ ${t("未连接设备")}`}
            </Text>
            {/* 添加闹钟 + 删除按钮 */}
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <Button
                title={`➕ ${t("添加闹钟")}`}
                onPress={() => addOrEditAlarm(alarmClocks.length)}
              />
              <View style={{ width: 12 }} />
              <Button
                title={`🗑 ${t("删除全部")}`}
                color="#FF3B30"
                onPress={() => {
                  if (alarmClocks.length === 0) return;
                  const data = BleSDK.deleteAllAlarmClock();
                  writeData(data);
                  // 不立即清空，等设备返回确认后在 handleDataReceived 里清空
                }}
              />
            </View>

            {alarmClocks.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 50,
                }}
              >
                <Image
                  source={require("../../assets/images/favicon.png")}
                  style={{ width: 80, height: 80, marginBottom: 10 }}
                />
                <Text style={{ color: "#999" }}>暂无智能闹钟</Text>
              </View>
            ) : (
              <FlatList
                data={alarmClocks}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity onPress={() => addOrEditAlarm(index)}>
                    <View
                      style={{
                        padding: 12,
                        marginVertical: 6,
                        borderRadius: 10,
                        backgroundColor: "#f5f5f5",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                   <View>
  <Text style={{ fontSize: 18, fontWeight: "600" }}>
    {t("闹钟")} {index + 1} - {item.clockTime}
  </Text>
  <Text>
    {t("类型")}: {t(["普通", "吃药", "喝水", "吃饭"][item.clockType - 1] || "普通")}
  </Text>
  <Text>
    {t("重复")}: {getAlarmClockWeek(item.week)}
  </Text>
  <Text>
    {t("备注")}: {item.text}
  </Text>
</View>

                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        );
      }}
    </BaseBleComponent>
  );
};

export default AlarmClockPage;
