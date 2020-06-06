"use strict";

var hackMobile = false;

//var currentLocalCamera;  // 选择的当前摄像头
//var currentLocalCameraResolution; //当前摄像头的分辨率  不再使用
//var currentLocalCameraResolutionList;  // 低中高分辨率列表
//var currentAudioInput;  // 选择的MIC

var user; // 服务器返回的全量, 

var userSystem;

var aliWebrtc;
aliWebrtc = new AliRtcEngine("");
/**
 * AliWebRTC isSupport检测
 */
aliWebrtc.isSupport().then(function(support)  {

    userSystem = support;
    ShowSupportMsg(support);

    if (!(support.audioDevice && support.videoDevice && support.isSupported && support.supportH264)) {
        return;
    }

    $(".system-info button").show();
    testSpeed();

    $(".system-info button").bind("click", function() {

        aliWebrtc.getDevices().then(function(devices) {
            console.log(devices);
            if (devices.videoDevices.length > 0) {
                devices.videoDevices.forEach(function(video,index) {
                    if (video.deviceId) { 
                        $(".setting-info .video-device").append("<option value='" + video.deviceId + "'>" + video.label  + "</option>");
                        hackMobile = false;
                    }
                    else {
                        $(".setting-info .video-device").append("<option value='" + video.facingMode + "'>" + video.label + "</option>");
                        hackMobile = true;
                    }
                });
            } else {
                navigator.mediaDevices.enumerateDevices().then(function(devices) {
                    devices.forEach(function(device, index) {
                        console.log(device.kind + ": " + device.label +
                            " id = " + device.deviceId);
                        if (device.kind == 'videoinput') {
                            $(".setting-info .video-device").append("<option value='" + device.deviceId + "'>摄像头" + index + "</option>");
                            hackMobile = false;
                        }
                    });
                })
            }
        });

       

        // 摄像头改变
        $(".setting-info .video-device").change(function(vdChange) {
            console.log(hackMobile, vdChange.target.value);
            //alert(vdChange.target.value + hackMobile);
            // 先停，后启动摄像头
            //currentLocalCamera = vdChange.target.value;
            //aliWebrtc.currentCamera = { deviceId: currentLocalCamera };  
            if (hackMobile) {
                aliWebrtc.currentCamera = { facingMode: vdChange.target.value };
            } else {
                aliWebrtc.currentCamera = { deviceId: vdChange.target.value };
            }
            tryLocalVideo();
        });
        $(".setting-info .video-device").trigger("change");

        $(".system-info").fadeOut("slow",function(){
            $(".group-info").fadeIn("slow");
        });

        /*debug coce will delete 
        $(".login-info button").attr("disabled", false);        
         */
       


    });


}).catch(function(err) {
    ShowSupportMsg(err);
    return;
});


$(".system-info .tip-control").click(function(){
    $(".system-info .content").toggle();
    $(".system-info .tip").toggle();
});

function ShowSupportMsg(support) {

    
    $(".init-loading").fadeOut("fast",function(){
        $(".system-info").fadeIn("fast");
    });
    

    $(".system-info .system-info-master").append("<li> <i class='fa-li fa fa-cog' ></i>操作系统： " + support.system + "</li>");
    $(".system-info .system-info-master").append("<li> <i class='fa-li fa fa-internet-explorer' ></i>浏览器类型: " + support.browser + "</li>");
    $(".system-info .system-info-master").append("<li> <i class='fa-li fa fa-code-fork' ></i>浏览器版本： " + support.browser_version + "</li>");
    if (support.audioDevice)
        $(".system-info .system-info-master").append("<li><i class='fa-li fa fa-check-square'></i>存在语音设备</li>");
    else
        $(".system-info .system-info-master").append("<li class='ban-red'> <i class='fa-li fa fa-square-o'></i>缺少语音设备</li>");

    if (support.videoDevice)
        $(".system-info .system-info-master").append("<li><i class='fa-li fa fa-check-square'></i>存在摄像头设备</li>");
    else
        $(".system-info .system-info-master").append("<li class='ban-red'><i class='fa-li fa fa-square-o'></i>缺少摄像头设备</li>");

    if (support.isSupported)
        $(".system-info .system-info-master").append("<li><i class='fa-li fa fa-check-square'></i>支持WebRTC</li>");
    else
        $(".system-info .system-info-master").append("<li class='ban-red'><i class='fa-li fa fa-square-o'></i>不支持WebRTC</li>");

    if (support.supportH264)
        $(".system-info .system-info-master").append("<li><i class='fa-li fa fa-check-square'></i>支持H264编码</li>");
    else
        $(".system-info .system-info-master").append("<li class='ban-red'><i class='fa-li fa fa-square-o'></i>不支持H264编码</li>");

    if (support.supportScreenShare)
        $(".system-info .system-info-master").append("<li><i class='fa-li fa fa-check-square'></i>支持屏幕分享</li>");
    else
        $(".system-info .system-info-master").append("<li class='ban-yellow'><i class='fa-li fa fa-square-o'></i>不支持屏幕分享</li>");

}

function resolutionSort(a, b) {
    return a.width - b.width;
} 


function clock(){
    setTimeout(function()  {
        var d = new Date();
        var time = d.toTimeString();//d.getHours() + ":" + ("0"+d.getMinutes()).ri + ":" + d.getSeconds();
        $(".logo-title .time").text(time.substr(0,8));
        clock();
    }, 1000);
}
clock();

function tryLocalVideo() {

    aliWebrtc.stopPreview().then(function() {
        aliWebrtc.startPreview($('.local-video video')[0]).then(function() {
            // 获取当前视频的分辨率 列表
            /*aliWebrtc.getAvailableResolutions(currentLocalCamera).then((resolutions) => {
                console.log("getAvailableResolutions:", resolutions);
                $(".setting-info .video-resolution").empty();
                currentLocalCameraResolution = resolutions[0];
                resolutions.sort(resolutionSort);

                currentLocalCameraResolutionList = [];
                currentLocalCameraResolutionList.push(resolutions[0]); // 低分辨率
                currentLocalCameraResolutionList.push(resolutions[parseInt((resolutions.length - 1) / 2)]); // 中分辨率
                currentLocalCameraResolutionList.push(resolutions[resolutions.length - 1]); // 中分辨率

                currentLocalCameraResolutionList.forEach(resolution => {
                    $(".setting-info .video-resolution").append("<option value='" + JSON.stringify(resolution) + "'>" + JSON.stringify(resolution) + "</option>");
                });
            }).catch((error) => {
                console.log(error.message)
            });
            */
        }).catch(function(error)  {
            alert(error.message);
        });
    }).catch(function(error)  {
        alert(error.message);
    });

}


var st;

var speedTesting = false;

function testSpeed() {
    $(".group-info .testSpeed").append("测试网络中...");
    var Rand = Math.random();
    var RandNum = 1 + Math.round(Rand * 99);
    var szsrc = "http://www.onegreen.net/maps/m/a/china-3.jpg?id=" + RandNum;
    st = new Date();
    $(".group-info .testSpeed").append($(" <IMG height=0 alt=测试图片 src='" + szsrc + "'  width=0 onload='showspeed()' >"));
    speedTesting = true;
    $(".group-info .testSpeed").css("color",'red')
}




function showspeed() {
    speedTesting = false;
    var fs = 2674109;  // 文件字节大小
    var l = 2;    //小数点的位数
    var et = new Date();
    var alltime = fs * 1000 / (et - st)/1024/1024
    var Lnum = Math.pow(10, l)
    var calcspeedByte = Math.round(alltime * Lnum) / Lnum;
    var calcspeedBit = Math.round(alltime * Lnum*8) / Lnum;
    //$(".setting-info .testSpeed").empty();
    if(calcspeedByte < 1) $(".group-info .testSpeed").css("color",'red');
    $(".group-info .testSpeed").text( "网速：" + calcspeedByte + " (MB/s)  " + calcspeedBit + "(Mb/s)");

    if(calcspeedBit < 10) $(".group-info .testSpeed").css("color",'red');
    else if(calcspeedBit >= 10 && calcspeedBit < 30) $(".group-info .testSpeed").css("color",'yellow');
    else{
        $(".group-info .testSpeed").css("color",'white');
    }    
}




