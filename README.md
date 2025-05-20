# 部署指南
1. 将项目下载后,使用微信开发者工具导入
2. 修改`others`文件夹下的`API.py`的文件的API密钥和URL,使用除siliconflow外其他供应商,可能需要修改代码
3. 运行`API.py`文件,启动API服务
4. 本项目使用`https://github.com/travisvn/openai-edge-tts`项目来完成文字转语音,可修改为其他服务
    如果使用`openai-edge-tts`,只需进入对应项目页部署到本地或云即可

# 项目简介
1. `home`文件夹为首页,无内容
2. `MyDevices`文件夹为连接设备页
3. `profiles`文件夹为个人信息页
4. `AIManage`文件夹为药灵页


开发须知:

1. 除字体以外,使用 rpx 单位, 适配不同屏幕
2. mp-switch 组件,可实现带字开关,使用 width 和 height 属性控制开关大小,使用 trueText 和 falseText 属性控制开关文字

```html
<mp-switch
	class="reminder-switch"
	checked="{{notificationReminder}}"
	trueText="开"
	falseText="关"
	width="60"
	height="30"
	bindchange="toggleNotificationReminder" />
```
