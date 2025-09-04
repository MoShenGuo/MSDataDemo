import { bleManager } from "@/sdk/BleManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Device } from "react-native-ble-plx";

// 设备信息类型
type BlueInfo = {
  id: string;
  name: string | null;
  rssi: number | null;
  mac: string | null;
  device: Device;
};

export default function ScanPage() {
  const router = useRouter();
  const navigation = useNavigation();
   const { t } = useTranslation(); 
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BlueInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // 初始化权限
  useEffect(() => {
    const initBle = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const isBluetoothReady = await bleManager.init();

      if (isBluetoothReady) {
        console.log("蓝牙已就绪，开始扫描");
        startScan();
      } else {
        console.warn("蓝牙未就绪");
      }
    };
    initBle();
  }, []);

  // 配置导航栏
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "1939W测试Demo",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {isScanning ? (
            <ActivityIndicator style={{ marginRight: 12 }} color="#fff" />
          ) : null}

          <TouchableOpacity onPress={isScanning ? stopScan : startScan}>
            <Text style={{ color: "white", marginHorizontal: 8 }}>
              {isScanning ? t("停止") : t("搜索")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Text style={{ color: "white", marginHorizontal: 8 }}>Filter</Text>
          </TouchableOpacity>
        </View>
      ),
      headerStyle: { backgroundColor: "#2196F3" },
      headerTintColor: "white",
    });
  }, [isScanning]);

  // 开始扫描
  const startScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setDevices([]);

    try {
      bleManager.startScan((device) => {
        if (device?.name || device?.localName) {
          handleDeviceDiscovered(device);
        }
      });

      // 10秒后停止扫描
      setTimeout(() => stopScan(), 10000);
    } catch (error) {
      console.error("Scan failed:", error);
      setIsScanning(false);
    }
  };

  // 停止扫描
  const stopScan = () => {
    bleManager.stopScan();
    setIsScanning(false);
  };

  // 处理发现的设备
  const handleDeviceDiscovered = (device: Device) => {
    const deviceName = device.name || device.localName || "Unknown";

    if (filter && !deviceName.toLowerCase().includes(filter.toLowerCase())) {
      return;
    }

    setDevices((prevDevices) => {
      const existingIndex = prevDevices.findIndex((d) => d.id === device.id);

      if (existingIndex >= 0) {
        const updatedDevices = [...prevDevices];
        updatedDevices[existingIndex] = {
          id: device.id,
          name: deviceName,
          rssi: device.rssi,
          mac: device.id,
          device,
        };
        return updatedDevices.sort((a, b) => (b.rssi || 0) - (a.rssi || 0));
      } else {
        const newDevice: BlueInfo = {
          id: device.id,
          name: deviceName,
          rssi: device.rssi,
          mac: device.id,
          device,
        };
        return [...prevDevices, newDevice].sort(
          (a, b) => (b.rssi || 0) - (a.rssi || 0)
        );
      }
    });
  };

  // 连接设备 → 跳转 MainPage
  const connectToDevice = (device: Device) => {
    stopScan();
    router.push({
      pathname: "/MainPage",
      params: {
        mac: device.id,
        name: device.name || device.localName || "Unknown Device",
      },
    });
  };

  // 保存过滤器
  const saveFilter = async (text: string) => {
    setFilter(text);
    await AsyncStorage.setItem("filter", text);
    setShowFilterModal(false);
  };

  // 渲染设备项
  const renderDeviceItem = ({ item }: { item: BlueInfo }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item.device)}
    >
      <View>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceMac}>MAC: {item.mac}</Text>
      </View>
      <Text style={styles.deviceRssi}>RSSI: {item.rssi ?? "N/A"}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 设备列表 */}
      <FlatList
        data={devices}
        renderItem={renderDeviceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isScanning ? t("搜索设备中...") : t("未发现设备")}
            </Text>
          </View>
        }
      />

      {/* 过滤器弹窗 */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter</Text>
            </View>

            <TextInput
              style={styles.filterInput}
              value={filter}
              onChangeText={saveFilter}
              placeholder={t("输入设备名称过滤")}
              autoFocus={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  listContent: { paddingBottom: 16 },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  deviceName: { fontSize: 18, fontWeight: "bold" },
  deviceMac: { fontSize: 14, color: "#666", marginTop: 4 },
  deviceRssi: { fontSize: 16, color: "#333" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: { fontSize: 18, color: "#999" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
  },
  modalHeader: { backgroundColor: "#2196F3", padding: 16, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  filterInput: { height: 50, paddingHorizontal: 16, fontSize: 16 },
});
