基于webrtc开发的WEB版本视频会议系统，需要安全链接访问，为了开发方便在目录ssl下有https://dev.xfunction.cn的服务器证书（有效期至2021-06-04),可以部署在开发环境中。

建议使用vscode中的插件 Live Server.配置如下：
"liveServer.settings.https": {
        "enable": true, //set it true to enable the feature.
        "cert": "C:\\html\\xfunction-meeting\\ssl\\ssl.pem", //full path  
        "key": "C:\\html\\xfunction-meeting\\ssl\\ssl.key", //full path
        "passphrase": "12345"
    },
    "liveServer.settings.host": "dev.xfunction.cn"
    
dev.xfunction.cn 由DNS解析为本机 127.0.0.1,当然你也可在开发及测试机器上修改系统的host文件来代替DNS服务器来解析，方便测试。