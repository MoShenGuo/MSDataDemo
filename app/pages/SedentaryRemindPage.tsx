import { BleConst, BleSDK, DeviceKey, MySedentaryReminderV4 } from "@moshenguo/ms-data-sdk";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BaseBleComponent from "../BaseBleComponent";
const IntervalTimes = Array.from({ length: 24 }, (_, i) => (i + 1) * 5);
const MinSteps = Array.from({ length: 100 }, (_, i) => (i + 1) * 100);
const Weeks = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const SedentaryRemindPage: React.FC = () => {
  const { t } = useTranslation(); 
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [intervalTime, setIntervalTime] = useState(IntervalTimes[0]);
  const [minStep, setMinStep] = useState(MinSteps[0]);
  const [remindList, setRemindList] = useState(
    Weeks.map((week, idx) => ({ id: idx, week, isEnabled: false }))
  );

  // 控制显示哪个 Picker
  const [showPicker, setShowPicker] = useState<"start" | "end" | "interval" | "steps" | null>(null);

  const formatTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  const toggleWeek = (id: number) => {
    setRemindList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEnabled: !item.isEnabled } : item))
    );
  };

  /** ✅ 组装 UI 数据 → MySedentaryReminderV4 */
  const buildReminder = (): MySedentaryReminderV4 => {
    return {
      startTime_Hour: startTime.getHours(),
      startTime_Minutes: startTime.getMinutes(),
      endTime_Hour: endTime.getHours(),
      endTime_Minutes: endTime.getMinutes(),
      intervalTime,
      leastSteps: minStep,
      mode: isOpen ? 1 : 0,
      weeks: {
        sunday: remindList[0].isEnabled,
        monday: remindList[1].isEnabled,
        tuesday: remindList[2].isEnabled,
        wednesday: remindList[3].isEnabled,
        thursday: remindList[4].isEnabled,
        friday: remindList[5].isEnabled,
        saturday: remindList[6].isEnabled,
      },
    };
  };

  // 设置久坐提醒
  const handleSetSedentaryRemind = (writeData: (data: number[]) => void) => {
    const reminder = buildReminder();
    const payload = BleSDK.setSedentaryReminder(reminder);
    console.log("发送设置久坐提醒:", payload);
    writeData(payload);
  };

  // 获取久坐提醒
  const handleGetSedentaryRemind = (writeData: (data: number[]) => void) => {
    console.log("请求获取久坐提醒");
    const payload = BleSDK.getSedentaryReminder();
    writeData(payload);
  };

  // ✅ 收到解析后的数据
  const handleDataReceived = (data: any) => {
    console.log("解析后的数据:", data);
    if (!data || typeof data !== "object") return;

    const dataType = data[DeviceKey.DataType];
    if (dataType == BleConst.GetSedentaryReminder) {
      const d = data[DeviceKey.Data];
      if (!d) return;

      setStartTime(new Date(2025, 0, 1, parseInt(d[DeviceKey.StartTimeHour]), parseInt(d[DeviceKey.StartTimeMin])));
      setEndTime(new Date(2025, 0, 1, parseInt(d[DeviceKey.EndTimeHour]), parseInt(d[DeviceKey.EndTimeMin])));
      setIntervalTime(parseInt(d[DeviceKey.IntervalTime]));
      setMinStep(parseInt(d[DeviceKey.LeastSteps]));
      setIsOpen(d[DeviceKey.OpenOrClose] === "1");

      if (d[DeviceKey.Week]) {
        const weekArr = d[DeviceKey.Week].split("-");
        setRemindList((prev) =>
          prev.map((item, idx) => ({
            ...item,
            isEnabled: weekArr[idx] === "1",
          }))
        );
      }
    }
  };

  return (
    <BaseBleComponent onDataReceived={handleDataReceived}>
      {({ connected, writeData }) => (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>{connected ? t("已连接设备") : t("未连接设备")}</Text>

          {/* 开关 */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('久坐提醒')}: {isOpen ? t("开启") : t("关闭")}</Text>
            <Button title={isOpen ? t("关闭") : t("开启")} onPress={() => setIsOpen((prev) => !prev)} />
          </View>

          {/* 开始时间 */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('开始时间')}: {formatTime(startTime)}</Text>
            <Button title={t("选择开始时间")} onPress={() => setShowPicker("start")} />
          </View>

          {/* 结束时间 */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('结束时间')}: {formatTime(endTime)}</Text>
            <Button title={t("选择结束时间")} onPress={() => setShowPicker("end")} />
          </View>

          {/* 间隔时间 */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('间隔时间')}: {intervalTime} {t('分钟')}</Text>
            <Button title={t("选择间隔时间")} onPress={() => setShowPicker("interval")} />
          </View>

          {/* 最小步数 */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('最小提醒步数')}: {minStep} {t('步')}</Text>
            <Button title={t("选择最小提醒步数")} onPress={() => setShowPicker("steps")} />
          </View>

          {/* 周选择 */}
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>{t('选择提醒日期')}:</Text>
            <View style={styles.weekContainer}>
              {remindList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.weekItem, item.isEnabled && styles.weekItemSelected]}
                  onPress={() => toggleWeek(item.id)}
                >
                  <Text style={{ color: item.isEnabled ? "white" : "black", fontWeight: "bold" }}>
                    {t(item.week)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 底部按钮：设置/获取 */}
          <View style={styles.buttonRow}>
            <Button title={t("设置久坐提醒")} onPress={() => handleSetSedentaryRemind(writeData)} />
            <View style={{ width: 10 }} />
            <Button title={t("获取久坐提醒")} onPress={() => handleGetSedentaryRemind(writeData)} />
          </View>

          {/* 条件渲染的 Picker */}
          {showPicker === "start" && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowPicker(null);
                if (date) setStartTime(date);
              }}
            />
          )}

          {showPicker === "end" && (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowPicker(null);
                if (date) setEndTime(date);
              }}
            />
          )}

          {showPicker === "interval" && (
            <Picker selectedValue={intervalTime} onValueChange={(v) => { setIntervalTime(v); setShowPicker(null); }}>
              {IntervalTimes.map((v) => (
                <Picker.Item key={v} label={`${v} ${t("分钟")}`} value={v} />
              ))}
            </Picker>
          )}

          {showPicker === "steps" && (
            <Picker selectedValue={minStep} onValueChange={(v) => { setMinStep(v); setShowPicker(null); }}>
              {MinSteps.map((v) => (
                <Picker.Item key={v} label={`${v} ${t("步")}`} value={v} />
              ))}
            </Picker>
          )}
        </ScrollView>
      )}
    </BaseBleComponent>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  section: { marginVertical: 8 },
  label: { fontSize: 16, marginBottom: 5 },
  weekContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  weekItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    margin: 4,
  },
  weekItemSelected: { backgroundColor: "blue", borderColor: "blue" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
});

export default SedentaryRemindPage;
