
import { bleManager } from '@/sdk/BleManager';
import Constants from '@/sdk/constants';
import React, { useEffect, useState } from 'react';

interface BaseBleProps {
  children?: React.ReactNode | ((props: {
    connected: boolean;
    writeData: (data: number[]) => void;
    connect: (deviceId: string) => void;
    disconnect: () => void;
  }) => React.ReactNode);
  onConnected?: () => void;
  onDisconnected?: () => void;
  /**
   * 接收处理后的蓝牙数据（如解析成 { cmd, payload } 等）
   */
  onDataReceived?: (data: any) => void;
  /**
   * 接收原始字节数据（number[] 或 Uint8Array）
   * 用于抓包、协议分析等场景
   */
  onRawDataReceived?: (bytes: number[]) => void;
}

const BaseBleComponent: React.FC<BaseBleProps> = ({
  children,
  onConnected,
  onDisconnected,
  onDataReceived,
  onRawDataReceived,
}) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnectionStateChange = (isConnected: boolean) => {
      console.log('连接状态变化:', isConnected);
      setConnected(isConnected);
      if (isConnected && onConnected) onConnected();
      if (!isConnected && onDisconnected) onDisconnected();
    };

    const onDataReceivedHandler = (data: any) => {
      console.log('收到处理后的蓝牙数据:', data);
      if (onDataReceived) {
        onDataReceived(data);
      }
    };

    // ✅ 新增：监听原始数据
    const onRawDataReceivedHandler = (bytes: number[]) => {
      console.log('收到原始蓝牙数据:', bytes);
      //console.log('收到原始蓝牙数据:', bytes.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      if (onRawDataReceived) {
        onRawDataReceived(bytes);
      }
    };

    // 绑定事件
    bleManager.on(Constants.BLUE_CONNECTION_STATE, onConnectionStateChange);
    bleManager.on(Constants.BLUE_DATA_RECEIVED, onDataReceivedHandler);
    bleManager.on('dataByteCallBack', onRawDataReceivedHandler); // ← 原始数据事件名

    // ✅ 组件挂载时同步当前连接状态
    const realStatus = bleManager.isConnected();
    setConnected(realStatus);

    return () => {
      bleManager.off(Constants.BLUE_CONNECTION_STATE, onConnectionStateChange);
      bleManager.off(Constants.BLUE_DATA_RECEIVED, onDataReceivedHandler);
      bleManager.off('dataByteCallBack', onRawDataReceivedHandler); // 清理原始数据监听
    };
  }, [onConnected, onDisconnected, onDataReceived, onRawDataReceived]);

  // 封装蓝牙操作方法
  const connect = (deviceId: string) => {
    bleManager.connectDeviceById(deviceId);
  };

  const disconnect = () => {
    bleManager.disconnectDevice();
  };

  const writeData = (data: number[]) => {
    bleManager.writeData(data);
  };

  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({
        connected,
        writeData,
        connect,
        disconnect,
      });
    }
    return children;
  };

  return <React.Fragment>{renderChildren()}</React.Fragment>;
};

export default BaseBleComponent;