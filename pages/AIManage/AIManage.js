Page({
    renderSpeed: 100, // 渲染单文本速度
    data: {
      inputText: '',
      history: [], // 历史记录数组，包含 {role: 'user'/'assistant', content: ''}
      renderQueue: [], // 渲染缓冲队列：存储从服务端接收的字符
      audioContent: '', // 用于累积语音内容
      isStreaming: false,
      requestTask: null,
      scrollTop: 0, // 滚动位置控制
      audioPath: '', // 临时音频文件路径
      voiceSetting: '', // 音色设置
      voiceOptions: [],  // 存储完整的选项对象
      timer: null // 定时器ID存储
    },
    onLoad(){
    // 初始化 voiceOptions
    const voiceOptions = [
        { name: '台湾女声', value: 'zh-TW-HsiaoChenNeural' },
        { name: '香港女声', value: 'zh-HK-HiuMaanNeural' },
        { name: '播音男声', value: 'zh-CN-YunjianNeural' },
        { name: '年轻女声', value: 'zh-CN-XiaoxiaoNeural' },
        { name: '可爱女声', value: 'zh-CN-XiaoyiNeural' }
      ];
  
      // 设置 voiceSetting 和 voiceOptions
      this.setData({
        voiceSetting: voiceOptions[0].value, // 默认选择第一个音色
        voiceOptions: voiceOptions
      })
    },
    
    // 兼容转换方法
    arrayBufferToStr(buffer) {
      const uint8Array = new Uint8Array(buffer);
      let str = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        str += String.fromCharCode(uint8Array[i]);
      }
      return decodeURIComponent(escape(str)); // 处理 UTF-8 编码
    },
  
    onInput(e) {
      this.setData({ inputText: e.detail.value });
    },
  
    sendRequest() {
      const that = this;
      const userInput = this.data.inputText.trim();
      if (!userInput) return;
  
      // 清空输入框
      this.setData({ 
          inputText: '' ,
          audioContent: ''
        });
  
      // 添加用户问题到历史记录
      const newHistory = [
        ...this.data.history,
        { role: 'user', content: userInput }
      ];
  
      this.setData({
        history: newHistory,
        isStreaming: true
      }, () => {
        this.autoScroll(); // 添加完成后自动滚动
      });
    // 新增状态标记是否已添加助手消息
    let hasAddedAssistant = false;
      // 初始化请求任务
      const requestTask = wx.request({
        url: 'http://192.168.108.17:5000/chat',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'test123'
        },
        data: {
          "model": "Qwen/QwQ-32B",
          "messages": [
            {
              "role": "system",
              "content": "你是一名精通各种药品的小精灵,你的名字永远叫药灵,你可以正确解答用户药品的说明,并给出建议"
            },
            {
              "role": "user",
              "content": userInput
            }
          ],
            "stream": true,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.7, 
            "top_k": 50, 
            "frequency_penalty": 0.5
        },
        enableChunked: true, // 启用微信原生分块传输支持
        timeout: 120000,
        success(res) {
          if (res.statusCode !== 200) {
            that.handleError(`请求失败: ${res.data.error || res.statusCode}`);
          }
        },
        complete:()=> {
          // 在流结束时生成语音
          if (that.data.audioContent) {
            that.generateSpeech(that.data.audioContent);
          }
          // 无论是否生成语音都停止加载状态
        this.setData({ isStreaming: false });
        },
        fail(err) {
          that.handleError('网络连接失败');
        }
      });
  
      // 监听分块数据接收
      requestTask.onChunkReceived((res) => {
        const arrayBuffer = res.data;
        const text = this.arrayBufferToStr(arrayBuffer); // 解码为文本
  
        text.split('\n').forEach(line => { // 按 NDJSON 规范分割数据包
          if (line.trim() === '') return;
          try {
            const data = JSON.parse(line);
            if (data.content) {
                // 首次收到内容时添加助手消息
                if (!hasAddedAssistant) {
                    hasAddedAssistant = true;
                    this.setData({
                    history: [...this.data.history, { role: 'assistant', content: '' }]
                    });
                }
              this.data.audioContent += data.content;
              this.data.renderQueue.push(data.content); // 入队缓冲
              this.setData({ 
                  renderQueue: this.data.renderQueue,
                  audioContent: this.data.audioContent
            }); // 渲染队列更新
            this.startRenderTimer(); // 每次收到内容时触发渲染
            }
          } catch (e) {
            console.error('JSON解析失败:', line);
          }
        });
      });
  
      this.setData({ requestTask });
    },
  
    // 定时渲染器
    startRenderTimer() {
      // 如果定时器已存在则不再创建
      if (this.data.timer) return;
      const timer = setInterval(() => {
        if (this.data.renderQueue.length > 0) {
          const char = this.data.renderQueue.shift();
          this.updateLastResponse(char);
          this.setData({ renderQueue: this.data.renderQueue });
        }else{
             // 队列空时清除定时器
             clearInterval(this.data.timer);
             this.setData({ timer: null });
        }
      }, this.renderSpeed); // 调整间隔控制渲染速度
      this.setData({ timer }); // 存储定时器ID
    },
  
    updateLastResponse(content) {
      const newHistory = this.data.history.map((item, index) => {
        if (index === this.data.history.length - 1) { // 仅修改最后一条记录
          return { ...item, content: item.content + content }; // 字符串拼接
        }
        return item;
      });
  
      this.setData({
        history: newHistory
      }, () => {
        this.autoScroll();
      });
    },
  
    autoScroll() {
      // 滚动到底部
      this.setData({
        scrollTop: 999999 // 设置足够大的值确保滚动到底部
      });
    },
  
    handleError(msg) {
      const newHistory = this.data.history.map((item, index) => {
        if (index === this.data.history.length - 1) {
          return { ...item, content: msg };
        }
        return item;
      });
  
      this.setData({
        history: newHistory,
        isStreaming: false
      });
    },
  
    onUnload() {
      if (this.data.requestTask) {
        this.data.requestTask.abort();
        this.setData({ isStreaming: false });
      }
      // 清理音频资源
      if (this.data.audioPath) {
        const fs = wx.getFileSystemManager();
        fs.unlink({ filePath: this.data.audioPath });
      }
    },
  
    // 语音生成方法
    generateSpeech(text) {
      const that = this;
      wx.request({
        url: 'http://192.168.108.17:5050/v1/audio/speech ',
        method: 'POST',
        header: {
          'Authorization': 'Bearer pjl_is_big_handsome_guy',
          'Content-Type': 'application/json'
        },
        data: {
          input: text,
          voice: this.data.voiceSetting // 使用当前选择的音色
        },
        responseType: 'arraybuffer', // 返回音频二进制
        success(res) {
          if (res.statusCode === 200) {
            that.playAudio(res.data);
          } else {
            wx.showToast({
              title: '文本过长,语音生成失败',
              icon: 'none'
            });
          }
        },
        fail() {
          wx.showToast({
            title: '服务器错误,语音生成失败',
            icon: 'none'
          });
          that.setData({ isStreaming: false });
        }
      });
    },
  
    // 音频播放方法
    playAudio(arrayBuffer) {
        const fs = wx.getFileSystemManager();
        // 使用唯一文件名避免冲突
        const tempFilePath = wx.env.USER_DATA_PATH + '/temp_audio_' + Date.now() + '.mp3';
        const that=this
      // 将二进制数据保存为临时文件
      fs.writeFile({
        filePath: tempFilePath,
        data: arrayBuffer,
        encoding: 'binary',
        success() {
          const innerAudioContext = wx.createInnerAudioContext();
          innerAudioContext.src = tempFilePath;
          that.setData({isStreaming: false})
          innerAudioContext.play();
          // 播放结束清理
          innerAudioContext.onEnded(() => {
            fs.unlink({ filePath: tempFilePath });
          });
        },
        fail(){
                // 文件写入失败时直接显示文字
                that.setData({ isStreaming: false });
        }
      });
    },
    //显示音色选择
    showVoicePicker() {
        const that = this;
        const voiceOptions = this.data.voiceOptions;
        const currentVoiceValue = this.data.voiceSetting; // 当前选中的音色的 value
    
        // 动态生成显示名称数组
        const names = voiceOptions.map(item => {
            if (item.value === currentVoiceValue) {
                return `${item.name} ✓`; // 在选中项后加上“✓”
            }
            return item.name;
        });
    
        wx.showActionSheet({
            itemList: names,
            success(res) {
                // 通过索引获取完整对象
                const selected = voiceOptions[res.tapIndex];
                that.setData({ 
                    voiceSetting: selected.value // 更新选中的音色
                });
                wx.showToast({
                    title: `已选择：${selected.name}`,
                    icon: 'none'
                });
            },
            fail() {
                // 用户取消选择
            }
        });
    },
  });