import { BleSDK } from "@moshenguo/ms-data-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BaseBleComponent from "../BaseBleComponent";
const STORAGE_KEY = "arrayClock";

// week 位转布尔数组 [日~六]
const weekToBoolArray = (week: number): boolean[] =>
  Array.from({ length: 7 }, (_, i) => ((week >> i) & 1) === 1);

// 布尔数组转回 week 位
const boolArrayToWeek = (arr: boolean[]): number =>
  arr.reduce((acc, val, i) => (val ? acc | (1 << i) : acc), 0);

const AlarmClockDetailPage: React.FC = () => {
     const { t } = useTranslation(); 
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { numberClock } = route.params;

  const [alarmClock, setAlarmClock] = useState<any>({
    openOrClose: 1,
    clockType: 1,
    clockTime: "08:00",
    week: 0,
    text: "",
  });

  const [weekSelection, setWeekSelection] = useState<boolean[]>(
    weekToBoolArray(0)
  );

  // 控制 DateTimePicker 显示
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue) {
      const arr = JSON.parse(jsonValue);
      if (arr[numberClock]) {
        const loaded = arr[numberClock];
        setAlarmClock(loaded);
        setWeekSelection(weekToBoolArray(loaded.week || 0));
      }
    }
  };

  const handleDataReceived = useCallback((arg: any) => {
    console.log("DetailPage data:", arg);
  }, []);

  const sendAlarmsSequentially = async (
    writeData: (data: number[]) => void,
    alarmArray: any[]
  ) => {
    const commands = BleSDK.setAlarmClock(alarmArray);
    for (const cmd of commands) {
      writeData(cmd);
      await new Promise((res) => setTimeout(res, 80));
    }
  };

  const renderWeekButtons = () => {
    const weekNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
        {weekNames.map((name, i) => {
          const selected = weekSelection[i];
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                const newSel = [...weekSelection];
                newSel[i] = !newSel[i];
                setWeekSelection(newSel);
              }}
              style={{
                padding: 8,
                margin: 4,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: selected ? "blue" : "#ccc",
                backgroundColor: selected ? "#cce5ff" : "white",
              }}
            >
              <Text style={{ color: selected ? "blue" : "#333" }}>{t(name)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <BaseBleComponent
      onDataReceived={handleDataReceived}
      onRawDataReceived={(b) => console.log("raw:", b)}
    >
      {({ writeData }) => (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            {t('编辑闹钟')}
          </Text>

          {/* 闹钟类型 */}
          <Text style={{ marginTop: 10, fontWeight: "600" }}>{t('闹钟类型')}：</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {[
              { id: 1, label: t("普通") },
              { id: 2, label: t("吃药") },
              { id: 3, label: t("喝水") },
              { id: 4, label: t("吃饭") },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() =>
                  setAlarmClock({ ...alarmClock, clockType: t.id })
                }
                style={{
                  padding: 10,
                  marginRight: 8,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: alarmClock.clockType === t.id ? "blue" : "#ccc",
                  backgroundColor:
                    alarmClock.clockType === t.id ? "#cce5ff" : "white",
                }}
              >
                <Text
                  style={{
                    color: alarmClock.clockType === t.id ? "blue" : "#333",
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 时间 */}
          <Text style={{ marginTop: 16, fontWeight: "600" }}>{t('时间')}：</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{
              padding: 10,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 4,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>{alarmClock.clockTime}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              mode="time"
              value={new Date(`1970-01-01T${alarmClock.clockTime}:00`)}
              onChange={(_, date) => {
                setShowPicker(false); // 选完就关闭
                if (date) {
                  const hh = date.getHours().toString().padStart(2, "0");
                  const mm = date.getMinutes().toString().padStart(2, "0");
                  setAlarmClock({ ...alarmClock, clockTime: `${hh}:${mm}` });
                }
              }}
            />
          )}

          {/* 重复 */}
          <Text style={{ marginTop: 16, fontWeight: "600" }}>{t('重复')}：</Text>
          {renderWeekButtons()}

          {/* 备注 */}
          <Text style={{ marginTop: 16, fontWeight: "600" }}>{t('备注')}：</Text>
          <TextInput
            placeholder={t("输入备注")}
            value={alarmClock.text}
            onChangeText={(text) => setAlarmClock({ ...alarmClock, text })}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 8,
              marginTop: 8,
              borderRadius: 4,
            }}
          />

          {/* 保存按钮 */}
          <View style={{ marginTop: 30 }}>
            <Button
              title={t("保存")}
              onPress={async () => {
                const newClock = {
                  ...alarmClock,
                  week: boolArrayToWeek(weekSelection),
                };

                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                let arr: any[] = [];
                if (jsonValue) arr = JSON.parse(jsonValue);

                arr[numberClock] = newClock;
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

                await sendAlarmsSequentially(writeData, arr);

                navigation.goBack();
                route.params?.onUpdate && route.params.onUpdate(arr);
              }}
            />
          </View>
        </View>
      )}
    </BaseBleComponent>
  );
};

export default AlarmClockDetailPage;
