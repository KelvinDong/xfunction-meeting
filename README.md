
> 视频会议，随着2020年上半年疫情的原因被越来越多的人开始使用，尤其随着5G的推广，同时出于企业/组织降本提效的目的，相信“视频会议”会成为一种重要的工作方式。

> 视频会议在国内的选择还是比较多的，有钉钉，腾讯会议，ZOOM等等。


   
# 基于商业的需要，本项目主要特点包括：
1. 基于WebRTC开发的视频会议系统，支持常用浏览器。
   1. OS Safari's Version above 11.1.2
   2. iOS weChat not Support, pls replace with IOS Safari or Chrome
   3. Android Chrome's Version above 63
   4. Android weChat
   5. Mac Chrome's Version above 60
   6. Mac Safari's Version above 11
   7. Windows Chrome's Version above 60
   8. Windows QQ Browser's Version above 10 (Speed mode)
   9. ~~Windows Sogou Browser's Version above 8.6~~
   10. Windows 360 Browser's Version above 12 (Speed mode)
   11. Windows Edge Browser's Version above 81
2. 入会前硬件和网络资源检测，条件具备允许加入会议。
3. 屏幕分享目前仅限于：PC Chrome, 360, edge。
4. 基于阿里云资源，无需搭建视频服务器，利于快速开发和部署。
5. 支持会议号和管理员登录。
   1. 会议号登录者，无任何交互动作。
   2. 管理员登录，拥有完整的集中控制权限。
6. 支持会议中任双方私聊，有利于会议进程中提及沟通准备。
7. 支持语音转录文字。

![](https://acebridge2019.oss-cn-shanghai.aliyuncs.com/201910/x/%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_20200606222306.png)
![](https://acebridge2019.oss-cn-shanghai.aliyuncs.com/201910/x/%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_20200606222353.png)
![](https://acebridge2019.oss-cn-shanghai.aliyuncs.com/201910/x/%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_20200606222437.png)

![](https://acebridge2019.oss-cn-shanghai.aliyuncs.com/201910/x/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20200606222523.jpg)![](https://acebridge2019.oss-cn-shanghai.aliyuncs.com/201910/x/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20200606222529.jpg)


# 本系统的架构体系
系统架构中，包括：
1. Web应用，即本项目。)
2. ~~PC应用，APP应用，暂未启动开发。~~
3. [API应用服务(另项目 xfunction-api )](https://github.com/KelvinDong/xfunction-api),主要完成登录验证，阿里云服务授权等。
4. 阿里云资源
   1. [音视频通信 RTC（Real-Time Communication）](https://www.aliyun.com/product/rtc),提供完整的音视频网络资源。
   2. [微消息队列 MQTT 版](https://www.aliyun.com/product/mq4iot)，协助实现视频会议中控制指令通信。
   3. [消息队列 RocketMQ 版](https://www.aliyun.com/product/rocketmq)，配合MQTT与实现保存主要控制指令，用于同步给新入会人员。
   4. [实时语音识别](https://ai.aliyun.com/nls/trans),用于记录/显示会议语音转为文字。

# Web应用（本项目）：
基于webrtc开发的WEB版本视频会议系统，需要安全链接访问，为了开发方便在目录ssl下有https://dev.xfunction.cn的服务器证书（有效期至2021-06-04),可以部署在开发环境中。

建议使用vscode中的插件 Live Server.配置如下：

```
"liveServer.settings.https": {
        "enable": true, 
        "cert": "C:\\html\\xfunction-meeting\\ssl\\ssl.pem", 
        "key": "C:\\html\\xfunction-meeting\\ssl\\ssl.key", 
        "passphrase": "12345"
    },
    "liveServer.settings.host": "dev.xfunction.cn"
```
    
dev.xfunction.cn 由DNS解析为本机 127.0.0.1,当然你也可在开发及测试机器上修改系统的host文件来代替DNS服务器来解析，方便测试。


# [API应用服务(另项目 xfunction-api )](https://github.com/KelvinDong/xfunction-api)对应代码：

1. \src\main\java\net\xfunction\java\WebSocketServer.java,用于接收语音，再提交阿里资源实时语音识后，最后将识别文字通过RocketMq+MQTT送至与会者客户端。
2. \src\main\java\net\xfunction\java\api\config\RocketMqConfig.java, WebSocketConfig.java 
3. \src\main\java\net\xfunction\java\api\modules\meeting\*应用核心。

# Demo
本Demo,入会时长最多不超过10分钟，仅演示使用。
* 网址：https://www.xfunction.cn/meeting/index.html 
* 管理员：
  * 会议号：111111
  * 管理帐号/密码：admin01/admin01
* 普通与会者：
  * 会议号：111111
  * 会议密码：111111


