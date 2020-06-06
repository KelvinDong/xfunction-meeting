"use strict";

var AppServerUrl = "https://api.xfunction.cn/meeting/login"
//var AppServerUrl = "http://localhost:8090/meeting/login"

// 登录相关信息
var channelId;
var channelCode;
var channelAccount;
var channelPassword;
var userName;




/*
:::::
    String appid;
	String userid;
	List<String> gslb;
	String channelId ;
	String token;
	String nonce;
	Long timestamp;
	
	String channelName;
	String userName;
	String currentLayout;
	
	String mqttToken; 

:::::
    isAdmin

*/


$(".login-type1 p").click(function() {
    $(".login-type1").hide();
    $(".login-type2").show();
});

$(".login-type2 p").click(function() {
    $(".login-type2").hide();
    $(".login-type1").show();
});


function fillLogin(){
    var lsChannelId,lsUserName,lsChannelAccount;
    
    lsChannelId = localStorage.getItem("meeting-channel-id");
    lsUserName = localStorage.getItem("meeting-user-name");

    if(lsChannelId && lsUserName){
        $('.login-info .login-type1 .input-channel-id').val(lsChannelId);
        $('.login-info .login-type1 .input-display').val(lsUserName);
    }

    lsChannelAccount = localStorage.getItem("meeting-channel-account");
    
    if(lsChannelId && lsChannelAccount){
       $('.login-info .login-type2 .input-to-id').val(lsChannelId);
       $('.login-info .login-type2 .input-account').val(lsChannelAccount);
    }

}

fillLogin();

/**
 * 进入房间
 */
$('.login-info .login-type1 button').click(function() {
    channelId = $('.login-info .login-type1 .input-channel-id').val();
    channelCode = $('.login-info .login-type1 .input-channel-code').val();
    userName = $('.login-info .login-type1 .input-display').val();
    if (!channelId || !channelCode || !userName) {        
        showMessage("Please Input Information!",'warn',2500);
        channelId = null;
        channelCode = null;
        userName = null;
        return;
    }

    localStorage.setItem("meeting-channel-id",channelId);
    localStorage.setItem("meeting-user-name",userName);

    joinroom()

})

$('.login-info .login-type2 button').click(function() {
    channelId = $('.login-info .login-type2 .input-to-id').val();
    channelAccount = $('.login-info .login-type2 .input-account').val();
    channelPassword = $('.login-info .login-type2 .input-password').val();
    if (!channelId || !channelAccount || !channelPassword) {
        showMessage("Please Input Information!",'warn',2500);
        channelId = null;
        channelAccount = null;
        channelPassword = null;
        return;
    }
    localStorage.setItem("meeting-channel-id",channelId);
    localStorage.setItem("meeting-channel-account",channelAccount);
    
    joinroom()
})


var getRTCAuthInfo = function() {
    return new Promise(function (resolve, reject) {
        var userId = localStorage.getItem("userId");
        var url;
        if (channelAccount) {
            url = AppServerUrl + "?channelId=" + channelId + "&userAccount=" + channelAccount + "&userPassword=" + channelPassword;            
        } else {
            url = AppServerUrl + "?channelId=" + channelId + "&userName=" + userName + "&channelCode=" + channelCode + "&userId=" + userId;            
        }

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(data)  {
                if (data.success) {
                    data.data.channel = data.data.channelId;                    
                    user = data.data;
                    user.userId = user.userid;  // 解决属性名不一致的问题

                    if (user.userId.charAt(0) == 'c') {
                        user.isAdmin = false;
                        localStorage.setItem("userId", user.userId)
                    }
                    else user.isAdmin = true;

                    userName = user.userName;

                    resolve(data.data);                    
                } else {
                    reject(data);
                }
            },
            failed: function(error)  {
                reject(error);
            }
        });
    });
}


function joinroom() {

    getRTCAuthInfo().then(function(authInfo)  {
        
        initOn(aliWebrtc);

        
        aliWebrtc.setVideoProfile({     // share screen settings
            frameRate:10,
		    maxBitrate:1500000,
            width: 1920,
            height: 1080
        }, 2);
        
        $(".left-control-bar .user-list").empty();

        if (!user.isAdmin) {                        
            leftControlBarWidth = 0;            
        }else{            
            leftControlBarWidth = leftControlBarWidthFinal;            
        }

        

        if (!user.currentLayout) {
            user.currentLayout = JSON.stringify({ type: "10", data: { layout: "0", cameras: [], audios: [] ,names:[]}, secret: null });  // default layout JSON format
        }
        console.log("成功获得登录信息：",authInfo);
        var message = { destinationName: "", payloadString: user.currentLayout };
        onMessageArrived(message,true);

        resetVideoShow();// 多调用一次

        $(".init-web").hide();
        $(".main-web").show();

        aliWebrtc.joinChannel(authInfo, userName).then(function() {                        
            aliWebrtc.configLocalAudioPublish = true;
            aliWebrtc.configLocalCameraPublish = true;            
            if(currentShareScreen === user.userId) aliWebrtc.configLocalScreenPublish = true;     
            else  aliWebrtc.configLocalScreenPublish = false;    
            addUserToList({ displayName: userName, userId: user.userId });

            if(currentShareScreen === user.userId){
                $("#userList-" + user.userId + " .desktop-class").removeClass("mic-gray");
                $("#userList-" + user.userId + " .desktop-class").addClass("mic-red");
            }else{
                $("#userList-" + user.userId + " .desktop-class").removeClass("mic-green");
                $("#userList-" + user.userId + " .desktop-class").addClass("mic-gray");
                $("#userList-" + user.userId + " .desktop-class").removeClass("mic-red");
            }

            aliWebrtc.publish().then(function() {                
                createMqtt();                
                console.log("进入房间，流发布成功");
            }, function(error)  {
                console.error("进入房间，流发布失败：",error);                  
                showMessage("推流失败，请检查设备和网络，即将退出。",'error',2500);
            });           

        }).catch(function(error) {
            console.error("加入频道失败：",error);   
            $(".main-web").hide(); 
            $(".init-web").show();                                  
            showMessage("加入会议失败，请重试.",'warn',2500);
        })
    }).catch(function(error)  {
        console.error("失败获得登录信息：",error);
        showMessage("登录失败，请检查帐号信息和网络",'warn',2500);
    });
}





/**
 * 初始化回调函数
 */
function initOn(aliWebrtc) {

    aliWebrtc.on('onJoin', function(publisher)  {
        var sqId = new Date().getTime();
        sqId = sqId + ':onJoin:';
        console.log(sqId, publisher);
        if (publisher.userId) {
            addUserToList(publisher);
        }
    });

    aliWebrtc.on('onPublisher', function(publisher)  {
        var sqId = new Date().getTime();
        sqId = sqId + ':onPublisher:';
        console.log(sqId, publisher);
        subRemoteUser(publisher.userId,sqId);
    });


    aliWebrtc.on('onUnPublisher', function(publisher)  {
        console.log('onUnPublisher', publisher);        
    });

    aliWebrtc.on('onError', function(error)  {

        console.error("aliWebrtc onError:",error)

        var msg = error && error.message ? error.message : error;
        if (msg && msg.indexOf("no session") > -1) {
            showMessage("链接断开，退出后尝试重新登录。",'error',2500);
        }

        if (error.errorCode === 10011 || error.errorCode === 10012) {
            showMessage("屏幕分享禁止/结束。",'warn',2500);   
            
            $("#userList-" + user.userId + " .desktop-class").removeClass("mic-green");
            $("#userList-" + user.userId + " .desktop-class").removeClass("mic-red");
            $("#userList-" + user.userId + " .desktop-class").removeClass("mic-gray");
            $("#userList-" + user.userId + " .desktop-class").removeClass("mic-yellow");
            if(currentShareScreen == user.userId) $("#userList-" +  user.userId + " .desktop-class").addClass("mic-yellow");
            else $("#userList-" +  user.userId + " .desktop-class").addClass("mic-gray");
        }

        if (error.code == 15) {
            showMessage("H5 compatibility is not turned on!",'warn',2500); 
        }
        if (error.type === "publish") {
            showMessage("推流断开",'log',1000);
            var pubAudio = aliWebrtc.configLocalAudioPublish;
            var pubCamera = aliWebrtc.configLocalCameraPublish;
            var pubScreen = aliWebrtc.configLocalScreenPublish;
            aliWebrtc.configLocalAudioPublish = false;
            aliWebrtc.configLocalCameraPublish = false;
            aliWebrtc.configLocalScreenPublish = false;
            aliWebrtc.publish().then(function() {                
                aliWebrtc.configLocalAudioPublish = pubAudio;
                aliWebrtc.configLocalCameraPublish = pubCamera;
                aliWebrtc.configLocalScreenPublish = pubScreen;
                aliWebrtc.publish().then(function() {                    
                }).catch(function(err)  {
                    showMessage("网络不稳定，推流失败！退出中...",'error',2500);
                })
            }).catch(function(err) {
                showMessage("网络不稳定，推流失败！退出中...",'error',2500);
            })
        }

        if (error.type === "subscribe") {       
            showMessage("网络不稳定，重新订阅。",'log',1000);     
            subRemoteUser(error.userId,'订阅断开onError:');
        }


    });

    aliWebrtc.on('onLeave', function(publisher)  {
        console.log("onLeave", publisher);
        $("#userList-"+publisher.userId).remove();
    })


    aliWebrtc.on('onUpdateRole', function(data)  {
        console.log("onUpdateRole", data);
    })

    /**
     * //1：被服务器踢出   
       //2：频道关闭 
       //3：同一个ID在其他端登录，被服务器踢出 
    */
    aliWebrtc.on('onBye', function(publisher)  {
        showMessage("帐号重复登录，退出中...",'error',2500);
    })
}


function subRemoteUser(userId,sqId){

    new Promise(function(resolve,reject){
        initialization(userId);
        aliWebrtc.subscribe(userId).then(function(re) {
            resolve();
        }).catch(function(err) {
            console.log(sqId,"先取消订阅失败：", err)
            resolve();
        });
    }).then(function(){
        var nowInfo = getUserStatusInfo(userId);
        if (mainAudioDomList.indexOf(userId)> -1 && nowInfo.activeAudio) aliWebrtc.configRemoteAudio(userId, true);
        if (mainVideoDomList.indexOf(userId)> -1 && nowInfo.activeCamera) aliWebrtc.configRemoteCameraTrack(userId, true, true);
        if ( currentShareScreen == userId && nowInfo.activeScreen) aliWebrtc.configRemoteScreenTrack(userId, true);

        $("#userList-" + userId + " .desktop-class").removeClass("mic-green");
        $("#userList-" + userId + " .desktop-class").removeClass("mic-red");
        $("#userList-" + userId + " .desktop-class").removeClass("mic-gray");
        $("#userList-" + userId + " .desktop-class").removeClass("mic-yellow");
        if(nowInfo.activeScreen){
            if(currentShareScreen == userId) $("#userList-" + userId + " .desktop-class").addClass("mic-red");
            else $("#userList-" + userId + " .desktop-class").addClass("mic-green");            
        }else{
            if(currentShareScreen == userId) $("#userList-" + userId + " .desktop-class").addClass("mic-yellow");
            else $("#userList-" + userId + " .desktop-class").addClass("mic-gray");       
        }

        aliWebrtc.subscribe(userId).then(function(re) {
            console.log(sqId," 重新订阅成功",aliWebrtc.getUserInfo(userId))
            //if ($("#showVideo-1-" + userId + " video")) {
            if( mainVideoDomList.indexOf(userId)> -1){
                aliWebrtc.setDisplayRemoteVideo(userId, $("#showVideo-1-" + userId + " video")[0], 1);
            }
            // if ($("#audio-" + userId)) {
            if( mainAudioDomList.indexOf(userId)> -1){
                aliWebrtc.setDisplayRemoteVideo(userId, $("#audio-" + userId)[0], 1);
            }
            //if ($("#screen-" + error.userId)) { 
            if(currentShareScreen == userId){
                aliWebrtc.setDisplayRemoteVideo(userId, $("#screen-" + userId)[0], 2);
            }


            
        }).catch(function(err)  {
            console.log(sqId,"重新订阅失败",err);                    
        })
     });
}


