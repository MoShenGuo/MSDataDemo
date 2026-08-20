# MSDataDemo

> Official integration demo for **[@yhmedical/ms-data-sdk](https://www.npmjs.com/package/@yhmedical/ms-data-sdk)** — a BLE data SDK for JCRing smart-band & ring wearables (including the **X6 / 2301 ring**). Built with React Native + Expo.
>
> **[@yhmedical/ms-data-sdk](https://www.npmjs.com/package/@yhmedical/ms-data-sdk)** 的官方集成示例 —— 用于 JCRing 智能手环与戒指（含 **X6 / 2301 戒指**）的蓝牙数据 SDK。基于 React Native + Expo。

## Links / 链接

- 📦 SDK on npm / npm 上的 SDK: https://www.npmjs.com/package/@yhmedical/ms-data-sdk
- 🌐 Online API reference (TypeDoc) / 在线 API 文档: https://moshenguo.github.io/ms-data-sdk-docs/
- 🐛 Questions & issues / 提问与反馈: https://github.com/MoShenGuo/MSDataDemo/issues

---

## What this demo shows / 示例演示内容

This app connects to a device over Bluetooth and demonstrates, on separate screens, how to **build a command**, **send it**, and **parse the response** for every SDK feature: device info, time/personal info, goals, health measurement, activity/sport, sleep, heart rate, SpO2, HRV/PPI, temperature, blood sugar, alarms, and all **X6 ring–specific** commands.

本 App 通过蓝牙连接设备，在各个页面分别演示如何**生成指令**、**下发指令**、**解析返回数据**，覆盖 SDK 全部功能：设备信息、时间/个人信息、目标、健康测量、运动、睡眠、心率、血氧、HRV/PPI、温度、血糖、闹钟，以及全部 **X6 戒指专用**指令。

---

## Requirements / 环境要求

- Node.js ≥ 18
- Expo SDK 53 (already pinned in `package.json`)
- **A physical iOS/Android device** — BLE does not work on simulators/emulators. / **真机调试**——蓝牙无法在模拟器上运行。

## Getting started / 快速开始

```bash
# 1. Install dependencies / 安装依赖
npm install

# 2. Generate native projects (config plugins for BLE) / 生成原生工程
npx expo prebuild

# 3. Run on a real device / 真机运行
npx expo run:ios      # iOS
npx expo run:android  # Android
```

> The app requests Bluetooth (and Location on Android) permissions on first launch. Please allow them.
> 首次启动会申请蓝牙（Android 还需定位）权限，请允许。

---

## Project structure / 项目结构

```
app/
  MainPage.tsx            # Scan/connect + live data + feature menu / 扫描连接 + 实时数据 + 功能菜单
  BaseBleComponent.tsx    # Shared wrapper: exposes { connected, writeData, connect, disconnect } / 通用容器
  pages/                  # One screen per feature / 每个功能一个页面
    BasicInformationPage.tsx
    DeviceInformationPage.tsx
    HealthMeasurementPage.tsx
    MotionDataPage.tsx
    TempHistoryPage.tsx
    HrvDataPage.tsx
    ...
sdk/
  BleManager.ts           # Singleton wrapping react-native-ble-plx / 封装 ble-plx 的单例
  screens/index.ts        # Feature menu config / 功能菜单配置
```

---

## How integration works / 集成原理

The SDK itself only **builds and parses byte arrays**; the actual BLE I/O is done by [`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx), wrapped in `sdk/BleManager.ts`.

SDK 本身只负责**生成/解析字节数组**；真正的蓝牙读写由 [`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx) 完成，封装在 `sdk/BleManager.ts` 里。

### 1. Set the device model / 设置设备型号

Parsing depends on the connected model. Set it once on the manager:

解析依赖设备型号，在管理器上设置一次即可：

```ts
// sdk/BleManager.ts
public deviceType: any = 'X6'; // '2208' | '2208A' | 'V4' | 'V5' | '2025' | 'V8' | 'X6'
```

### 2. Build a command and send it / 生成指令并下发

```ts
import { BleSDK } from '@yhmedical/ms-data-sdk';

// inside a page you get writeData from <BaseBleComponent>
const cmd = BleSDK.getDeviceBatteryLevel(); // number[]
writeData(cmd);
```

### 3. Parse every notification / 解析每一条通知

`BleManager` feeds incoming bytes to the SDK parser and emits the result; pages receive it via `onDataReceived`:

`BleManager` 把收到的字节交给 SDK 解析并广播，页面通过 `onDataReceived` 接收：

```ts
import { BleSDK, BleConst, DeviceKey } from '@yhmedical/ms-data-sdk';

const result = BleSDK.dataParsingWithData(rawBytes, bleManager.deviceType);

switch (result[DeviceKey.DataType]) {
  case BleConst.GetDeviceBatteryLevel:
    console.log('battery', result[DeviceKey.Data]);
    break;
  case BleConst.RealTimeStep:
    console.log('steps', result[DeviceKey.Data][DeviceKey.Step]);
    break;
}
```

Every parsed object contains `DeviceKey.DataType` (compare with `BleConst.*`), `DeviceKey.Data` (payload), and `DeviceKey.End` (history-complete flag).

每个解析结果都含 `DeviceKey.DataType`（与 `BleConst.*` 比较）、`DeviceKey.Data`（数据）、`DeviceKey.End`（历史是否读完）。

### Switching device type / 切换设备型号

Change `deviceType` in `sdk/BleManager.ts`. Pages read `bleManager.deviceType === 'X6'` to show/hide ring-specific features and the X6 menu automatically hides functions the ring does not support (alarms, sedentary reminder, weather, reminders, take-photo, ECG waveform).

修改 `sdk/BleManager.ts` 里的 `deviceType` 即可。页面用 `bleManager.deviceType === 'X6'` 判断显隐；X6 菜单会自动隐藏戒指不支持的功能（闹钟、久坐提醒、天气、提醒、拍照、ECG 波形）。

---

## Support / 技术支持

Found a bug or have an integration question? Please open an issue (English or 中文 both welcome):

发现问题或有集成疑问？请提交 issue（中英文皆可）：

**👉 https://github.com/MoShenGuo/MSDataDemo/issues**

Please include: SDK version, device model (`deviceType`), phone OS/version, the command you sent, and the raw bytes / parsed result.

请附上：SDK 版本、设备型号（`deviceType`）、手机系统及版本、下发的指令、原始字节 / 解析结果。
