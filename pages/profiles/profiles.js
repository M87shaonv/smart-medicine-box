const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
Page({
    data: {
    avatarUrl: defaultAvatarUrl, // 默认头像路径
    nickname: 'CSZH20250319', // 默认用户昵称
    devices: [

      ],
    sharedFriends: [
        { name: '朋友A' },
        { name: '朋友B' }
      ],
      soundReminder: false,
      vibrationReminder: false,
      notificationReminder: true,
      history: [
        { drugName: '药品A', time: '2023-05-01 08:00', status: '按时服用' },
        { drugName: '药品B', time: '2023-05-01 12:00', status: '错时服用' }
      ]
    },
    onShow() {
        const app = getApp()
        // 设备列表映射逻辑
        const devices = app.globalData.deviceList.map(device => {
            // 优先使用实时连接状态
            const isConnected = app.globalData.connectedDevice?.deviceId === device.deviceId  
            return {
            ...device,
            // 删除 || 运算符，强制使用实时判断
            weight: isConnected ? app.globalData.deviceStatus.weight : '--',
            battery: isConnected ? app.globalData.deviceStatus.battery : '--'
            }
        })
        // 从全局状态获取设备列表
        this.setData({ devices })
        this._updateDeviceStatus()
        // 启动定时更新
        this._updateInterval = setInterval(() => {
          this._updateDeviceStatus()
        }, 1000)
      },
    
      onHide() {
        clearInterval(this._updateInterval)
      },
     // 新增设备连接状态处理
  connectDevice(e) {
    const device = e.currentTarget.dataset.device
    const app = getApp()
    
    wx.createBLEConnection({
      deviceId: device.deviceId,
      success: () => {
        app.globalData.connectedDevice = device
        app.globalData.deviceStatus.isConnected = true
        this._updateDeviceStatus()
      }
    })
  },
  disconnectDevice(e) {
    const device = e.currentTarget.dataset.device
    const app = getApp()
    
    wx.closeBLEConnection({
      deviceId: device.deviceId,
      success: () => {
        app.globalData.connectedDevice = null
        this._updateDeviceStatus()
      }
    })
  },
      _updateDeviceStatus() {
        const app = getApp()
        const newDevices = this.data.devices.map(device => {
          if (device.deviceId === app.globalData.connectedDevice?.deviceId) {
            return {
              ...device,
              weight: app.globalData.deviceStatus.weight + "g",
              battery: app.globalData.deviceStatus.battery + "%"
            }
          }
          return device
        })
        
        this.setData({ devices: newDevices })
      },
    //选择头像
    onChooseAvatar(e) {
        this.setData({ avatarUrl: e.detail.avatarUrl })
      },
    addFriend() {
      wx.navigateTo({
        url: '/pages/add-friend/add-friend'
      });
    },
    removeFriend(e) {
      const index = e.currentTarget.dataset.index;
      const sharedFriends = this.data.sharedFriends;
      sharedFriends.splice(index, 1);
      this.setData({
        sharedFriends: sharedFriends
      });
    },
    toggleSoundReminder(e) {
      this.setData({
        soundReminder: e.detail.value
      });
    },
    toggleVibrationReminder(e) {
      this.setData({
        vibrationReminder: e.detail.value
      });
    },
    toggleNotificationReminder(e) {
      this.setData({
        notificationReminder: e.detail.value
      });
    },
    getStatusColor(status) {
      return status === '按时服用' ? 'green' : 'red';
    },
    onPullDownRefresh: function() {
        console.log('触发下拉刷新');
        wx.stopPullDownRefresh();
      },

      // 显示编辑弹出层
  showEditPopup() {
    this.setData({
      isEditing: true,
    });
  },
  navigateToDevicePage() {
    wx.navigateTo({
      url: '/pages/MyDevices/MyDevices', // 替换为你的设备页面路径
    });
  },
  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
    });
  },

  // 保存编辑后的用户名
  saveNickname() {
    const newNickname = this.data.nickname; // 获取输入框的值
    this.setData({
      isEditing: false,
    });
    // 可以在这里调用接口将新用户名保存到服务器
    console.log('保存新用户名:', newNickname);
  },

  // 监听输入框的值变化
  onNicknameInput(e) {
    // 获取用户输入的值
    let value = e.detail.value;

    // 移除特殊字符（只允许输入字母、数字、汉字和部分标点符号）
    value = value.replace(/[^\w\u4e00-\u9fa5\s]/g, '');

    // 更新数据绑定的值
    this.setData({
    nickname: value,
    });
  },

    toggleSoundReminder(e) {
        this.setData({
            soundReminder: e.detail.value,
        });
    },
    toggleVibrationReminder(e) {
        this.setData({
            vibrationReminder: e.detail.value,
        });
    },
    toggleNotificationReminder(e) {
        this.setData({
            notificationReminder: e.detail.value,
        });
    },
    unbindDevice(e) {
        const app = getApp()
        const deviceId = e.currentTarget.dataset.deviceid // 需要确保wxml传递了deviceId参数
        const deviceIndex = app.globalData.deviceList.findIndex(d => d.deviceId === deviceId)
      
        if (deviceIndex === -1) return
      
        wx.showLoading({
          title: '解绑中...',
          mask: true
        })
      
        // 先断开设备连接
        wx.closeBLEConnection({
          deviceId,
          success: () => {
            // 从全局设备列表中移除
            app.globalData.deviceList.splice(deviceIndex, 1)
            app.saveDeviceList()
            // 如果解绑的是当前连接设备
            if (app.globalData.connectedDevice?.deviceId === deviceId) {
              app.globalData.connectedDevice = null
              app.globalData.deviceStatus.isConnected = false
            }
      
            // 更新页面数据
            this.setData({
              devices: this.data.devices.filter(d => d.deviceId !== deviceId)
            })
      
            wx.hideLoading()
            wx.showToast({ title: '解绑成功', icon: 'success' })
          },
          fail(error) {
            wx.hideLoading()
            wx.showToast({ 
              title: `解绑失败: ${error.errMsg}`,
              icon: 'none' 
            })
          }
        })
      },
});