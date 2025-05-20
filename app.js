// app.js 全局状态管理
App({
    globalData: {
      connectedDevice: null,    // 当前连接的设备
      deviceList: [],       // 已连接设备列表
      deviceStatus: {
        battery: '90',          // 设备电量
        weight:'0',            // 药品重量
        isConnected: false,      // 连接状态
        serviceId: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',      // 记录服务UUID
        characteristicUUID_TX: '6E400003-B5A3-F393-E0A9-E50E24DCCA9E',
        characteristicUUID_RX: '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
      }
    },
    saveDeviceList() {
        wx.setStorageSync('deviceList', this.globalData.deviceList)
      }
  })