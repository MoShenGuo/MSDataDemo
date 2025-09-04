import React, { useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// 引入蓝牙组件
import { BleSDK, ResolveUtil } from "@moshenguo/ms-data-sdk";
import * as FileSystem from 'expo-file-system';
import { useTranslation } from "react-i18next";
import BaseBleComponent from '../BaseBleComponent'; // 确保路径正确


const CmdSendPage = () => {
       const { t } = useTranslation(); 
    // ===== 状态 =====
    const [selectedValue, setSelectedValue] = useState<number>(1); // 1=CRC, 2=Not CRC
    const [selectValue, setSelectValue] = useState<string>('16'); // 指令长度
    const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);
    const [cmdList, setCmdList] = useState<string[]>(Array(199).fill('')); // 最大支持199
    const [historyList, setHistoryList] = useState<string[]>([]);
    const inputRefs = useRef<(TextInput | null)[]>(Array(199).fill(null));
    const writeDataRef = useRef<((data: number[]) => void) | null>(null);

    const len = parseInt(selectValue);
    // 生成下拉选项（16 ~ 199）
    const getMenuList = () => {
        const list = [];
        for (let i = 16; i < 200; i++) {
            list.push(i.toString());
        }
        return list;
    };

    // 更新指令长度
    const handleLengthChange = (value: string) => {
        const newLen = parseInt(value, 10);
        setSelectValue(value);

        setCmdList((prev) => {
            const newList = [...prev];
            if (newLen > newList.length) {
                // 补全：新增的填 '00'
                return [...newList, ...Array(newLen - newList.length).fill('')];
            } else {
                // 截断
                return newList.slice(0, newLen);
            }
        });

        setDropdownVisible(false);
    };
    // ✅ 新增：监听原始数据
    const handleRawDataReceived = (bytes: number[]) => {
        const hexString = ResolveUtil.intList2String(bytes);
        setHistoryList((prev) => [`[接收] ${hexString}`, ...prev]);

    };
    // ===== 更新 writeData =====
    const updateWriteData = (writeFn: (data: number[]) => void) => {
        writeDataRef.current = writeFn;
    };

    // ===== 输入框变化 =====
    const handleInputChange = (index: number, text: string) => {
        const cleaned = text.replace(/[^a-fA-F0-9x]/g, '').slice(0, 4);
        const hexMatch = cleaned.match(/(?:0x)?([a-fA-F0-9]{0,2})$/);
        const hexPart = hexMatch ? hexMatch[1] : '';

        setCmdList((prev) => {
            const newList = [...prev];
            newList[index] = hexPart;
            return newList;
        });

        if (hexPart.length === 2 && index < len - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // ===== 发送指令 =====
    const sendText = () => {
        if (!writeDataRef.current) {
            Alert.alert('错误', '蓝牙未连接');
            return;
        }
        try {
            const bytes: number[] = [];
            for (let i = 0; i < len; i++) {
                const hex = cmdList[i] || '';
                const num = parseInt(hex, 16);
                bytes.push(isNaN(num) ? 0x00 : num);
            }
            const value = BleSDK.sendHex(bytes, selectedValue == 1);
            writeDataRef.current(value);

            const hexString = value
                .map((b) => `${b.toString(16).toUpperCase().padStart(2, '0')}`)
                .join(' ');
            setHistoryList((prev) => [`[发送] ${hexString}`, ...prev]);
        } catch (error) {
            console.log('发送失败');
        }
        Keyboard.dismiss();
    };

    // ✅ 清除：只清空历史记录
  const cleanList = async () => {
    try {
      const filePath = FileSystem.documentDirectory + 'data.txt';
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      setHistoryList([]);
      Alert.alert('提示', '记录已清除');
    } catch (error) {
      console.error('清除文件失败:', error);
      Alert.alert('错误', '清除失败');
    }
  };

  // ✅ 保存记录：暂存到文件
  const saveFile = async () => {
    if (historyList.length === 0) {
      Alert.alert('提示', '没有可保存的记录');
      return;
    }

    const content = historyList.join('\n');
    const fileName = `data_${Date.now()}.txt`;
    const filePath = FileSystem.documentDirectory + fileName;

    try {
      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      Alert.alert('成功', `文件已保存: ${fileName}`);
    } catch (error) {
      console.error('保存文件失败:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  // ✅ 导出并分享文件
  const exportFile = async () => {
    if (historyList.length === 0) {
      Alert.alert('提示', '没有可导出的记录');
      return;
    }

    const content = historyList.join('\n');
    const fileName = `data_${Date.now()}.txt`;
    const filePath = FileSystem.documentDirectory + fileName;

    // try {
    //   // 写入文件
    //   await FileSystem.writeAsStringAsync(filePath, content, {
    //     encoding: FileSystem.EncodingType.UTF8,
    //   });

    //   // 判断平台是否支持分享
    //   const canShare = await Sharing.isAvailableAsync();
    //   if (!canShare) {
    //     Alert.alert('提示', '当前设备不支持分享功能');
    //     return;
    //   }

    //   // 分享文件
    //   await Sharing.shareAsync(filePath, {
    //     mimeType: 'text/plain',
    //     dialogTitle: '分享指令记录',
    //   });
    // } catch (error: any) {
    //   console.error('导出或分享失败:', error);
    //   Alert.alert('错误', error.message || '导出失败');
    // }
  };
    return (
        <SafeAreaView style={styles.safeArea}>
            <BaseBleComponent
                onRawDataReceived={handleRawDataReceived}
            >
                {({ connected, writeData }) => {
                    updateWriteData(writeData);

                    return (
                        // <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.container}>
                            {/* ===== 上半部分：控制区 ===== */}
                            <View style={styles.controlSection}>
                                {/* 连接状态 */}
                                <View style={styles.statusBar}>
                                    <Text style={connected ? styles.connectedText : styles.disconnectedText}>
                                        {connected ? t('蓝牙已连接') : t('蓝牙未连接')}
                                    </Text>
                                </View>

                                {/* CRC 选择 */}
                                <View style={styles.radioRow}>
                                    <View style={styles.radioItem}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedValue(1)}
                                            style={styles.radioCircle}
                                        >
                                            {selectedValue === 1 && <View style={styles.radioInner} />}
                                        </TouchableOpacity>
                                        <Text style={styles.radioLabel}>CRC</Text>
                                    </View>
                                    <View style={styles.radioItem}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedValue(2)}
                                            style={styles.radioCircle}
                                        >
                                            {selectedValue === 2 && <View style={styles.radioInner} />}
                                        </TouchableOpacity>
                                        <Text style={styles.radioLabel}>Not CRC</Text>
                                    </View>
                                </View>

                                {/* 指令长度选择 */}
                                {/* 指令长度选择 */}
                                <View style={styles.lengthRow}>
                                    <Text>{t('选择指令长度')} (16-199)</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => setDropdownVisible(true)}
                                    >
                                        <Text>{selectValue}</Text>
                                    </TouchableOpacity>

                                    {/* 可滚动的下拉菜单 */}
                                    <Modal
                                        visible={dropdownVisible}
                                        transparent
                                        animationType="fade"
                                        onRequestClose={() => setDropdownVisible(false)}
                                    >
                                        <Pressable
                                            style={styles.modalOverlay}
                                            onPress={() => setDropdownVisible(false)}
                                        >
                                            <View style={styles.dropdownListContainer}>
                                                <FlatList
                                                    data={getMenuList()}
                                                    keyExtractor={(item) => item}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.dropdownItem,
                                                                item === selectValue && styles.dropdownItemSelected,
                                                            ]}
                                                            onPress={() => handleLengthChange(item)}
                                                        >
                                                            <Text
                                                                style={item === selectValue && { color: '#007AFF', fontWeight: 'bold' }}
                                                            >
                                                                {item}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    showsVerticalScrollIndicator
                                                    initialScrollIndex={parseInt(selectValue) - 16}
                                                    getItemLayout={(data, index) => ({
                                                        length: 50,
                                                        offset: 50 * index,
                                                        index,
                                                    })}
                                                />
                                            </View>
                                        </Pressable>
                                    </Modal>
                                </View>

                                {/* 动态输入框网格 */}
                                <View style={styles.gridContainer}>
                                    {cmdList.slice(0, len).map((value, index) => (
                                        <TextInput
                                            key={index}
                                            ref={(ref) => (inputRefs.current[index] = ref)}
                                            style={styles.inputCell}
                                            value={value}
                                            onChangeText={(text) => handleInputChange(index, text)}
                                            maxLength={4}
                                            keyboardType="ascii-capable"
                                            textAlign="center"
                                            autoCapitalize="characters"
                                            placeholder="00"
                                            placeholderTextColor="#999"
                                        />
                                    ))}
                                </View>

                                {/* 操作按钮 */}
                                <View style={styles.actionGrid}>
                                    {[t('保存记录'), t('导出记录'), t('发送'), t('清除')].map((label, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.actionButton,
                                                !connected && index === 2 && styles.actionButtonDisabled,
                                            ]}
                                            onPress={() => {
                                                switch (index) {
                                                    case 0:
                                                        saveFile();
                                                        break;
                                                    case 1:
                                                        exportFile();
                                                        break;
                                                    case 2:
                                                        sendText();
                                                        break;
                                                    case 3:
                                                        cleanList(); // ✅ 只清历史
                                                        break;
                                                }
                                            }}
                                            disabled={!connected && index === 2}
                                        >
                                            <Text style={styles.actionButtonText}>{label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* ===== 下半部分：历史记录（独立滚动）===== */}
                            <View style={styles.historySection}>
                                {historyList.length === 0 ? (
                                    <Text style={styles.historyEmpty}>暂无历史记录</Text>
                                ) : (
                                    <ScrollView style={styles.historyScrollView}>
                                        {historyList.map((item, index) => (
                                            <Text key={index} style={styles.historyItem}>
                                                {item}
                                            </Text>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </View>
                    );
                }}
            </BaseBleComponent>
        </SafeAreaView>
    );
};

// ================== 样式 ==================
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: 16,
    },
    controlSection: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    historySection: {
        flex: 1,                   // 占据剩余空间
        minHeight: 200,            // 最小高度，避免看不见
        maxHeight: 300,            // 最大高度限制
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        marginTop: 12,
    },

    historyScrollView: {
        flex: 1,                   // 内容可滚动
    },

    historyItem: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
        fontFamily: 'Courier New',
        lineHeight: 18,
    },

    historyEmpty: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginVertical: 40,
        fontSize: 16,
    },
    statusBar: {
        marginBottom: 12,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        alignItems: 'center',
    },
    connectedText: {
        color: 'green',
        fontWeight: 'bold',
    },
    disconnectedText: {
        color: 'red',
    },
    radioRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 16,
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    radioInner: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
    },
    radioLabel: {
        fontSize: 16,
    },
    container: {
        flex: 1,           // 占满整个屏幕
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownList: {
        backgroundColor: '#fff',
        borderRadius: 8,
        maxHeight: 300,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginVertical: 16,
        gap: 6,
    },
    inputCell: {
        width: '13%',
        minWidth: 50,
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        textAlign: 'center',
        fontSize: 16,
        backgroundColor: '#fff',
        fontFamily: 'Courier New',
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonDisabled: {
        backgroundColor: '#ccc',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // 在 styles 中添加
    dropdownListContainer: {
        width: 150,
        maxHeight: 300,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    dropdownItem: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },

    dropdownItemSelected: {
        backgroundColor: '#f5f9ff',
    },
    lengthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 12,
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 60,
        alignItems: 'center',
    },
});

export default CmdSendPage;