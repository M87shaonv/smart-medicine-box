Page({
    data: {
      devices: [] // 存储发现的蓝牙设备列表
    },
    onLoad() {
        // 初始化蓝牙适配器
        wx.openBluetoothAdapter({
          success: () => {
            console.log('蓝牙适配器已初始化');
          },
          fail: (err) => {
            console.error('蓝牙适配器初始化失败', err);
          }
        });
      },
  // 连接成功回调
  onConnectSuccess(device) {
    const app = getApp()
    
    // 更新全局状态
    app.globalData.connectedDevice = device
    app.globalData.deviceStatus.isConnected = true
    
    // 启动状态监听
    this._startStatusMonitoring(device.deviceId)
    
    // 返回上级页面
    wx.navigateBack()
  },
   // 启动状态监控
   _startStatusMonitoring(deviceId) {
    // 监听连接状态变化
    wx.onBLEConnectionStateChange(res => {
      const isConnected = res.connected
      getApp().globalData.deviceStatus.isConnected = isConnected
      
      if (!isConnected) {
        wx.showToast({ title: '连接已断开', icon: 'none' })
      }
    })
  },
    // 点击搜索设备按钮
    startDiscovery() {
      const that = this
      // 检查蓝牙适配器状态
      wx.openBluetoothAdapter({
        success() {
          // 蓝牙初始化成功，开始搜索
          that._startSearch()
        },
        fail(error) {
          console.error('蓝牙初始化失败:', error)
          // 提示用户开启蓝牙
          wx.showModal({
            title: '提示',
            content: '请开启蓝牙功能',
            confirmText: '去开启',
            success(res) {
              if (res.confirm) {
                wx.openBluetoothAdapter() // 再次尝试开启
              }
            }
          })
        }
      })
    },
  
    // 开始搜索设备
    _startSearch() {
        this.setData({ devices: [] })
        const app = getApp()
        // 新增：清除遗留定时器
        clearTimeout(this._searchTimer)
        
        // 停止之前的搜索并移除监听
        wx.stopBluetoothDevicesDiscovery()
        wx.offBluetoothDeviceFound()
      
        // 开始新的搜索
        wx.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: true,
          success: () => {
            const handleFound = (res) => {
              const seenDevices = new Set(this.data.devices.map(d => d.deviceId))
              
              // 使用filter实现去重
              const newDevices = res.devices.filter(device => {
                // 去重条件：设备名称存在且未被发现过
                const isNewDevice = device.name && !seenDevices.has(device.deviceId);
                // 过滤条件：设备包含特定的 serviceId
                // const hasTargetService = device.advertisServiceUUIDs && device.advertisServiceUUIDs.includes(app.globalData.serviceId);
                // 合并条件：只有同时满足去重和过滤条件的设备才会被保留
               // return isNewDevice && hasTargetService;
                  return isNewDevice;
              });
      
              if (newDevices.length > 0) {
                this.setData({
                  devices: [...this.data.devices, ...newDevices]
                })
              }
            }
      
            wx.onBluetoothDeviceFound(handleFound)
      
            // 设置搜索超时（修复定时器覆盖问题）
            this._searchTimer = setTimeout(() => {
              wx.stopBluetoothDevicesDiscovery()
              wx.showToast({
                title: '搜索完成',
                icon: 'success'
              })
            }, 10000)
          },
          fail(error) {
            wx.showToast({ 
              title: `搜索失败:${error.errCode}`,
              icon: 'none' 
            })
          }
        })
      },
  
    // 处理发现的设备
    _handleFoundDevice(res) {
      const devices = res.devices.filter(device => 
        device.name || // 显示有名称的设备
        device.localName || // 包含广播名称
        device.advertisServiceUUIDs // 包含服务UUID
      )
      if (devices.length > 0) {
        this.setData({
          devices: this.data.devices.concat(devices)
        })
      }
    },
  
    // 点击设备连接
    connectToDevice(e) {
      const device = e.currentTarget.dataset.device
      const deviceId = device.deviceId
      
      wx.showLoading({
        title: '连接中...',
        mask: true
      })
  
      // 停止设备搜索
      wx.stopBluetoothDevicesDiscovery()
  
      // 建立连接
      wx.createBLEConnection({
        deviceId,
        success: () => {
          wx.hideLoading()
          // 保存设备信息到全局
          const app = getApp()
          app.globalData.connectedDevice = device
          // 更新全局设备列表
      const index = app.globalData.deviceList.findIndex(d => d.deviceId === deviceId)
      if (index === -1) {
        app.globalData.deviceList.push({
          ...device,
          status: '已连接'
        })
      } else {
        app.globalData.deviceList[index].status = '已连接'
      }
      this.getServicesAndCharacteristics(deviceId);
      app.saveDeviceList()
          wx.showToast({
            title: '连接成功',
            icon: 'success'
          })
        },
        fail:(error)=> {
          wx.hideLoading()
          wx.showToast({
            title: '连接失败',
            icon: 'none'
          })
          // 自动重新开始搜索
          this.startDiscovery()
        }
      })
    },
    getServicesAndCharacteristics(deviceId) {
        wx.getBLEDeviceServices({
          deviceId: deviceId,
          success: (res) => {
            res.services.forEach(service => {
              wx.getBLEDeviceCharacteristics({
                deviceId: deviceId,
                serviceId: service.uuid,
                success: (res2) => {
                  res2.characteristics.forEach(characteristic => {
                    if (characteristic.properties.notify) {
                      wx.notifyBLECharacteristicValueChange({
                        deviceId: deviceId,
                        serviceId: service.uuid,
                        characteristicId: characteristic.uuid,
                        state: true,
                        success: () => {
                          console.log('通知功能已启用');
                          wx.onBLECharacteristicValueChange((res) => {
                            const dataString = this.ab2utf8(res.value);
                            console.log('接收到蓝牙数据:',dataString);

                            const weightMatch = dataString.match(/WEIGHT:(\d+\.\d+)/);
  
                            if (weightMatch && weightMatch[1]) {
                                const weight = parseFloat(weightMatch[1]);
                                console.log('解析到的重量:', weight);
                                const app = getApp();
                                app.globalData.deviceStatus.weight = weight;
                            }
                          });
                        },
                        fail: (err) => {
                          console.error('启用通知失败', err);
                        }
                      });
                    }
                  });
                }
              });
            });
          }
        });
      },
// 将二进制数据解析为 UTF-8 字符串
ab2utf8(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    let i = 0;

    while (i < bytes.length) {
      const byte = bytes[i];
      if (byte < 0x80) {
        str += String.fromCharCode(byte);
        i += 1;
      } else if (byte < 0xE0) {
        const nextByte = bytes[i + 1];
        str += String.fromCharCode(((byte & 0x1F) << 6) | (nextByte & 0x3F));
        i += 2;
      } else if (byte < 0xF0) {
        const nextByte1 = bytes[i + 1];
        const nextByte2 = bytes[i + 2];
        str += String.fromCharCode(
          ((byte & 0x0F) << 12) | ((nextByte1 & 0x3F) << 6) | (nextByte2 & 0x3F)
        );
        i += 3;
      } else {
        const nextByte1 = bytes[i + 1];
        const nextByte2 = bytes[i + 2];
        const nextByte3 = bytes[i + 3];
        const codePoint = ((byte & 0x07) << 18) |
                          ((nextByte1 & 0x3F) << 12) |
                          ((nextByte2 & 0x3F) << 6) |
                          (nextByte3 & 0x3F);

        if (codePoint > 0xFFFF) {
          codePoint -= 0x10000;
          str += String.fromCharCode(
            (codePoint >> 10) + 0xD800,
            (codePoint & 0x3FF) + 0xDC00
          );
        } else {
          str += String.fromCharCode(codePoint);
        }
        i += 4;
      }
    }
    return str;
  },
    navigateBack() {
        wx.navigateBack()
      },
    // 页面卸载时清理
    onUnload() {
        wx.stopBluetoothDevicesDiscovery()
        wx.offBluetoothDeviceFound()
        clearTimeout(this._searchTimer)
      }
  })