function getUserStatusInfo(userId) {
    var userInfo = aliWebrtc.getUserInfo(userId);
    var isSubAudio = false, isSubLarge = false, isSubSmall = false, isSubCamera = false, isSubScreen = false, isSubVideo = false;
    var activeAudio = false, activeLargeVideo = false, activeSmallVideo = false, activeVideo = false,activeCamera=false, activeScreen = false;
    if (userInfo) {
        userInfo.streamConfigs.forEach(function(v ) {
        if (v.subscribed) {
            v.type == "audio" ? isSubAudio = true : "";
            v.type == "video" ? isSubVideo = true : "";
            v.label == "sophon_video_camera_large" ? isSubLarge = true : "";
            v.label == "sophon_video_camera_small" ? isSubSmall = true : "";
            v.label == "sophon_video_screen_share" ? isSubScreen = true : "";
            if (isSubLarge || isSubSmall) {
                isSubCamera = true;
            }
        }
        if(v.state == 'active'){
            v.type == "audio" ? activeAudio = true : "";
            v.type == "video" ? activeVideo = true : "";
            v.label == "sophon_video_camera_large" ? activeLargeVideo = true : "";
            v.label == "sophon_video_camera_small" ? activeSmallVideo = true : "";
            v.label == "sophon_video_screen_share" ? activeScreen = true : "";
            if (activeLargeVideo || activeSmallVideo) {
                activeCamera = true;
            }
        }
        });
    }
    return {
        isSubLarge: isSubLarge, isSubSmall: isSubSmall, isSubCamera: isSubCamera, isSubAudio: isSubAudio, isSubScreen: isSubScreen, isSubVideo: isSubVideo ,
        activeAudio: activeAudio, activeLargeVideo : activeLargeVideo, activeSmallVideo : activeSmallVideo, activeVideo : activeVideo,activeCamera:activeCamera, activeScreen : activeScreen
    };
}


function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i += 1) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function initialization(userId) {
    if (aliWebrtc) {
        aliWebrtc.configRemoteAudio(userId, false);
        aliWebrtc.configRemoteCameraTrack(userId, false, false);
        aliWebrtc.configRemoteScreenTrack(userId, false);
    }
}

/**
 * 显示提示信息
 * @param {String} text 要显示的信息
 * @param {String} type 信息类型(默认成功)   log warn error
 * @param {Number} delay 延迟时间(默认2.5s)
 * 
 * console.log('hello');
 * console.error('错误');
 * console.warn('警告');
 */
function showMessage(text,type,delay) {
    if(!text) return;
    var _type = type ?  "alert-" + type : "alert-log"
    var _delay = delay || 2500
    $(".alert").html(text).addClass(_type).show().delay(_delay).fadeOut("normal", type==="error"?function(){  location.reload() } :function()  {$(".alert").removeClass(_type)});
}



// 判断是否是全屏
function isFullscreen(){
    if (document.body.clientHeight === window.screen.height) {
        return true;
    } else {
        return false;
    }
}

function fullScreen() {
    var element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    }
}










/**
 * 
 * 以下为demo使用的
 * 
 */






function getQueryString(name) {
    var vars = [],
        hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars[name];
}


function getSubscribeInfo(userId) {
    var userInfo = aliWebrtc.getUserInfo(userId);
    var subscribeInfo = [], subscribeInfoArr = [], isSubAudio = false, isSubLarge = false, isSubSmall = false, isSubCamera = false, isSubScreen = false, isSubVideo = false;
    if (userInfo) {
        userInfo.streamConfigs.forEach(function(v)  {
        if (v.subscribed) {
            subscribeInfo.push(v.label);
            subscribeInfoArr.push(v);
            v.type == "audio" ? isSubAudio = true : "";
            v.type == "video" ? isSubVideo = true : "";
            v.label == "sophon_video_camera_large" ? isSubLarge = true : "";
            v.label == "sophon_video_camera_small" ? isSubSmall = true : "";
            v.label == "sophon_video_screen_share" ? isSubScreen = true : "";
            if (isSubLarge || isSubSmall) {
                isSubCamera = true;
            }
        }
        });
    }
    return { subscribeInfo: subscribeInfo, subscribeInfoArr: subscribeInfoArr, isSubLarge: isSubLarge, isSubSmall: isSubSmall, isSubCamera: isSubCamera, isSubAudio: isSubAudio, isSubScreen: isSubScreen, isSubVideo: isSubVideo };
}

/**
 * 取消订阅设置
 * @param {String} userId 
 * @param {String} type 
 * @param {String} label 
 */
function setConfigRemote(userId, type, label){
    return new Promise(function (resolve, reject)  {
        if (type == "audio") {
            aliWebrtc.configRemoteAudio(userId, false);
        } else {
            if (label === "sophon_video_camera_large") {
                aliWebrtc.configRemoteCameraTrack(userId, false, false);
                console.warn("取消相机流");
            } else if (label === "sophon_video_screen_share") {
                console.warn("取消共享流");
                aliWebrtc.configRemoteScreenTrack(userId, false);
            }
        }
    aliWebrtc.subscribe(userId).then(function(re) {
        resolve();
        }).catch(function(err) { console.error("重新订阅失败", err); alert(err.message); })
    });
}

/**
 * 显示提示信息，并打印
 * @param {String} text 要显示的信息
 * @param {String} type 信息类型(默认成功)
 * @param {Number} delay 延迟时间(默认2.5s)
 */
function showAlert(text,type,delay) {
    if(!text) return;
    var _type = type ?  "alert-" + type : "alert-success"
    var _delay = delay || 2500
    $(".alert").html(text).addClass(_type).show().delay(_delay).fadeOut("normal",function ()  {$(".alert").removeClass(_type)});
    if(_type === "warning"){
        console.warn(text)
    }else if(_type === "danger"){
        console.error(text)
    }else {
        console.log(text)
    }
}

/**
 * 根据属性值获取在数组中的index
 */
Array.prototype.getIndexByProprety = function (val, proprety) {
    var arr = this;
    var index = -1;
    arr.forEach(function(v, i, a) {
        if (v[proprety] == val) {
            index = i;
        }
    });
    return index;
}

/**
 * 根据属性值获取数组中的某项
 */
Array.prototype.getObjByProprety = function (val, proprety) {
    var arr = this;
    var obj = {};
    arr.forEach(function(v, i, a) {
        if (v[proprety] === val) {
            obj = v;
        }
    });
    return obj;
}