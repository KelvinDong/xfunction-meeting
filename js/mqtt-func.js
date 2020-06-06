"use strict";
var instanceId = 'post-cn-v641ir7ph1i'; //实例 ID，购买后从控制台获取
var host = 'post-cn-v641ir7ph1i.mqtt.aliyuncs.com'; // 设置当前用户的接入点域名，接入点获取方法请参考接入准备章节文档，先在控制台创建实例
var port = 443; //WebSocket 协议服务端口，如果是走 HTTPS，设置443端口
var topicM = 'ACE'; //需要操作的 Topic,第一级父级 topic 需要在控制台申请
var topic = 'ACE';  // 程序中重新定义  完整的主题
var useTLS = true; //是否走加密 HTTPS，如果走 HTTPS，设置为 true
var accessKey = 'LTAI4Frsu3vDxCMBhv9PeFzn'; //账号的 AccessKey，在阿里云控制台查看
//secretKey = 'e5tdFhngDaPjoqEyqgkaVJP6beOq1R'; //账号的的 SecretKey，在阿里云控制台查看
var cleansession = true; // true 订阅关系是有上限的，对于ACE应用设置true 无需保持订阅关系。
var groupId = 'GID_ACE'; //MQTT GroupID,创建实例后从 MQTT 控制台创建

var mqtt;
var reconnectTimeout = 10000;
//var username = 'Signature|' + accessKey + '|' + instanceId; //username和 Password 签名模式下的设置方法，参考文档 https://help.aliyun.com/document_detail/48271.html?spm=a2c4g.11186623.6.553.217831c3BSFry7
//var password = CryptoJS.HmacSHA1(clientId, secretKey).toString(CryptoJS.enc.Base64);
var username = 'Token|' + accessKey + '|' + instanceId;
var password = '';
var clientId = ''; //GroupId@@@DeviceId，由控制台创建的 Group ID 和自己指定的 Device ID 组合构成   64位



function MQTTconnect() {
    mqtt = new Paho.MQTT.Client(
        host, //MQTT 域名
        port, //WebSocket 端口，如果使用 HTTPS 加密则配置为443,否则配置80
        clientId //客户端 ClientId
    );
    var options = {
        timeout: 3,
        onSuccess: onConnect,
        mqttVersion: 4,
        cleanSession: cleansession,
        onFailure: function (message) {
            showMessage("Sorry! Failed to Login MQTT Server for same user, Pls try again",'error',2500);
        }
    };
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    if (username != null) {
        options.userName = username;
        options.password = password;
        options.useSSL = useTLS; //如果使用 HTTPS 加密则配置为 true
    }
    mqtt.connect(options);
}

function onConnect() {
    console.log("onConnect:MQTT连接成功");
    mqtt.subscribe(topic, {
        qos: 0 // ace应用于置为0合适
    });


}

function sendMqttMessage(to, msg) {
    var message = new Paho.MQTT.Message(msg); //set body        
    if (to) {
        var to = groupId + '@@@' + to;
        message.destinationName = topicM + "/p2p/" + to;
    } else {
        message.destinationName = topic;
    }

    mqtt.send(message);
}


function onConnectionLost(response) {
    console.log("onConnectionLost", response);
    setTimeout(MQTTconnect, reconnectTimeout);
};

function onMessageArrived(message, fromLogin) {

    new Promise(function(resolve, reject) {  //避免其中的报错影响到mqtt
        var sqId = new Date().getTime();
        console.log(sqId,"Rec Msg: ", message);
        
        var payload = message.payloadString;
        var item = JSON.parse(payload);
    
        switch (item.type) {
            case "12":  // { type: "12", data: { screen: true } }  单点发送  桌面publish指令
                sqId = sqId + ":VIDEO-COMMAND:";
                console.log(sqId, payload);
    
                if (item.data.screen) {
                    aliWebrtc.configLocalScreenPublish = true;

                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-green");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-red");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-gray");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-yellow");
                    if(currentShareScreen == user.userId) $("#userList-" +  user.userId + " .desktop-class").addClass("mic-red");
                    else $("#userList-" +  user.userId + " .desktop-class").addClass("mic-green");

                    aliWebrtc.publish().then(function() {
                        console.log(sqId, "desktop Publish");
                    }, function(error)  {
                        console.log(sqId, error.message);
                    });
                }
                break;
            case "18":  // { type: "18" } 强制关闭分享
                sqId = sqId + ":VIDEO-COMMAND:CLOSE";
                console.log(sqId, payload);
                if (true) {       
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-green");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-red");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-gray");
                    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-yellow");
                    if(currentShareScreen == user.userId) $("#userList-" +  user.userId + " .desktop-class").addClass("mic-yellow");
                    else $("#userList-" +  user.userId + " .desktop-class").addClass("mic-gray");
                    aliWebrtc.configLocalScreenPublish = false;
                    aliWebrtc.publish().then(function() {
                        console.log(sqId, "desktop unPublish");
                    }, function(error)  {
                        console.log(sqId, error.message);
                    });
                }
                break;
            case "11": // { type: "11", data: { userId: userId, audio: true/false } } 单点发送 声音订阅/取消指令    {type: "11"} 广播发送 声音取消订阅指令
                sqId = sqId + ":AUDIO-COMMAND:"; 
                console.log(sqId, payload);
    
                if(item.data){
                    changeFromAudio(item.data.userId,item.data.audio,sqId);
                }else{
                    mainAudioDomList.slice(0).forEach(function(userId) {
                        changeFromAudio(userId,false,sqId)
                    });
                }
      
                break;
            case "10":  // { type: "10", data: { layout: _layout, cameras: mainVideoDomList,audios: mainAudioDomList,names:displayNameList, screen: currentShareScreen ,secret:{}} }   广播发送布局指令
                sqId = sqId + ":LAYOUT-COMMAND:";
                console.log(sqId, payload);
    
                lastLayoutMessage = message;
                layout = item.data.layout;
                displayNameList = item.data.names;
                secretChannel = item.data.secret;
    
                $(".left-control-bar  .select-layout").val(item.data.layout);
                $(".container-box .video-box").empty();
                
                $(".container-box .share-screen").empty();
                $(".container-box .audio-box").empty();
                
                mainVideoDomList = [];
                mainAudioDomList = [];
                
                var freshList = [];
                item.data.cameras.forEach(function(userId)  {
                    var aIndex = item.data.audios.indexOf(userId);
                    if(aIndex > -1) {
                        item.data.audios.splice(aIndex,1);
                        mainAudioDomList.push(userId);
                    }
                    toggleShow(userId, sqId);    /* 内部有 resetVideoShow()*/
                    freshList.push(userId);
                });
    
                item.data.audios.forEach(function(userId) {
                    changeFromAudio(userId,true,sqId);
                    freshList.push(userId);
                });
    
                if(item.data.screen){
                    var tIndex = freshList.indexOf(item.data.screen);
                    if(tIndex < 0 ){
                        freshList.push(item.data.screen);
                    }
                    shareScreen(item.data.screen,sqId);
                }else{
                    shareScreen(null,sqId);
                }
    
                if(secretChannel){
                    if( user.userId == secretChannel.one  || user.userId == secretChannel.another ) //  我是私聊通道的一方，就订阅另一方。  我不是私聊的任一方，就都不订阅。
                    {                
                        changeFromAudio(secretChannel.one,true,sqId);       
                        changeFromAudio(secretChannel.another,true,sqId);         
                    }else{
                        changeFromAudio(secretChannel.one,false,sqId);       
                        changeFromAudio(secretChannel.another,false,sqId);
                    }
                }
                
                // 来自登录的不需要单独调用subRemoteUser，会有回调来发起
                if( !fromLogin ){
                    freshList.forEach(function(userId){
                        if(userId != user.userId) subRemoteUser(userId,sqId);
                    });
                }
                
                break;
            case "13":
                openTransfer(user.userId, item.lang, false);
                break;
            case "14":
                closeTransfer();
                break;
            case "15":  // { type: "15" ,data: {userId: userId, displayName:userName}} 修改某用户显示名称
                displayNameList = displayNameList.filter( function(one){
                    return one.userId != item.data.userId;
                });
    
                // 管理员的名字由数据库中已经设定，或者临时调整，不记录在LS中，记录下来也没有用，反而会在普通用户登录时信息会错开。
                // 修改掉普通用户记录在LS的名字
                if(item.data.userId == user.userId && !user.isAdmin)  localStorage.setItem("meeting-user-name",item.data.displayName);
    
                displayNameList.push(item.data);
                modifyName(item.data);
                break;
    
            case "16":  // 开启私聊通道，仅限一个通道.
                sqId = sqId + ":AUDIO-COMMAND:SECRET OPEN"; 
                console.log(sqId, payload);
                secretChannel = item.data;
                if( user.userId == secretChannel.one  || user.userId == secretChannel.another ) //  我是私聊通道的一方，就订阅另一方。  我不是私聊的任一方，就都不订阅。
                {                
                    changeFromAudio(secretChannel.one,true,sqId);       
                    changeFromAudio(secretChannel.another,true,sqId);         
                }else{
                    changeFromAudio(secretChannel.one,false,sqId);       
                    changeFromAudio(secretChannel.another,false,sqId);
                }
    
                break;
            case "17":  // 关闭私聊通道 ,,恢复之前状态
                sqId = sqId + ":AUDIO-COMMAND:SECRET CLOSE"; 
                console.log(sqId, payload);
                if(secretChannel){ //防止无效指令
                    var temp = secretChannel;
                    secretChannel = null;   
                    changeFromAudio(temp.one,temp.oneaudio,sqId);       
                    changeFromAudio(temp.another,temp.anotheraudio,sqId);                  
                }                   
                break;
            case "20":  // 语音转录得到的结果 
                var dom = $("<p>" + item.message + "</p>");
                $(".container-box .trans-box").prepend(dom);
                break;
            case "99":  // 被请出会议室
                showMessage("你被请出会议室房间!",'error',2500);
                break;
            default:
                break;
        }
    }).then().catch();

    
};

function createMqtt() {
    topic = topic + '/meeting/' + user.channelId;
    clientId = groupId + '@@@' + user.userId; // ace应用的userId
    if (user.isAdmin) password = 'RW|' + user.mqttToken;
    else password = 'R|' + user.mqttToken;

    MQTTconnect();
}

