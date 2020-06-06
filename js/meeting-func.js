
"use strict";

var userSize = 0;

var mainVideoDomList = [];
var mainAudioDomList = [];
var currentShareScreen;
var lastLayoutMessage;

var displayNameList = []; // 用于保存被管理员修改后的用户名。

var secretChannel ;

var leftControlBarWidthFinal = 250;
var leftControlBarWidth = leftControlBarWidthFinal;
var layout = '0';// 布局，默认 0分屏]



// video box 移动顺序
var videoDragging = false;
var draggingFrom, draggingTo;

// 用户列表移动顺序
var listFrom, listTo;

var menuUserId;

//////由他人onJOin 和 自己登录时调用
function addUserToList(item) {
    var html = '<li onmouseup="userListUp(\'{user-id}\')" onmousedown="userListDown(\'{user-id}\')" id="userList-{user-id}">'
        + ' <i class="fa {mic-icon} {mic-class} mic-class" title="麦克风" aria-hidden="true" onclick="micClick(\'{user-id}\')"></i>  '
        + ' <i class="fa fa-tty {mic-class} secret-class" title="私聊" aria-hidden="true" onclick="secretControl(\'{user-id}\')"></i>  '
        + ' <i class="fa fa-desktop {mic-class} desktop-class" title="屏幕分享" aria-hidden="true" onclick="openScreenControl(\'{user-id}\')"></i>  '
        + ' &nbsp;<i onclick="showMenu(\'{user-id}\',event)" class="fa fa-angle-double-down" title="More"  aria-hidden="true"></i> '
        + (item.userId == user.userId ? '<i class="fa fa-user-circle" aria-hidden="true"></i>' : '')
        +' <span ondblclick="modifyNameControl(\'{user-id}\')" >{user-name}</span>'
        + ' <i onclick="toggleShow(\'{user-id}\',\'CLICK\')" class="fa fa-camera {to} show-class" title="摄像头" aria-hidden="true"></i> '
        + '</li>';

    var displayName = item.displayName;
    displayNameList.forEach(function(one){
        if(item.userId == one.userId) displayName = one.displayName;
    });

    html = html.replace(/{mic-icon}/g, "fa-microphone-slash");  
    html = html.replace(/{mic-class}/g, "mic-gray");  
    html = html.replace(/{user-name}/g, displayName.substr(0, 7));

    if ($("#showVideo-1-" + item.userId + " video")[0]) {
        
        html = html.replace(/{to}/g, "mic-green"); 
        $("#showVideo-1-" + item.userId + " .show-video-title").html(displayName.substr(0, 7));
    } else {
        html = html.replace(/{to}/g, "mic-gray");   
        
    }
    html = html.replace(/{user-id}/g, item.userId); 

    $(".left-control-bar .user-list").append(html);

    changeAudioUi(item.userId);
}

///////由远程全员MIC指令、全员布局指令调用////////
function changeFromAudio(userId,status,sqId){

    var index =  mainAudioDomList.indexOf(userId) ;

    if(index > -1 && status == false){
        mainAudioDomList.splice(index,1);
        if($("#audio-" + userId)) $("#audio-" + userId).remove();
    }else if(index > -1 && status == true){

    }else if(index < 0 && status == false){

    }else{  // index < 0 && status == true
        mainAudioDomList.push(userId);
        if(mainVideoDomList.indexOf(userId) < 0 && userId != user.userId) {
            var dom = $('<video id ="audio-' + userId + '" autoplay playsinline ></video>');
            $(".audio-box").append(dom);
        }
    }

    changeAudioUi(userId);

    // 来自布局的不需要调用subRemoteUser，由布局代码统一调用。
    if(sqId.indexOf('AUDIO-COMMAND')>-1 && userId != user.userId) subRemoteUser(userId, sqId);

}

/////调整MIC的展示状态/////
function changeAudioUi(userId) {

    var status =  (mainAudioDomList.indexOf(userId)) > -1 ? true :false;

    if (status) { //显示开着的
        $("#userList-" + userId + " .mic-class").removeClass("mic-gray");
        $("#userList-" + userId + " .mic-class").removeClass("fa-microphone-slash");
        $("#userList-" + userId + " .mic-class").addClass("mic-green");
        $("#userList-" + userId + " .mic-class").addClass("fa-microphone");
        $("#showVideo-1-" + userId + " .mic-class").removeClass("fa-microphone-slash");
        $("#showVideo-1-" + userId + " .mic-class").addClass("fa-microphone");

        

    } else { // 显示关着的
        $("#userList-" + userId + " .mic-class").removeClass("mic-green");
        $("#userList-" + userId + " .mic-class").removeClass("fa-microphone");
        $("#userList-" + userId + " .mic-class").addClass("mic-gray");
        $("#userList-" + userId + " .mic-class").addClass("fa-microphone-slash");
        $("#showVideo-1-" + userId + " .mic-class").removeClass("fa-microphone");
        $("#showVideo-1-" + userId + " .mic-class").addClass("fa-microphone-slash");

        $("#userList-" + userId + " .secret-class").addClass("mic-gray");
        $("#userList-" + userId + " .secret-class").addClass("fa-tty");
        $("#userList-" + userId + " .secret-class").removeClass("mic-green");
        $("#userList-" + userId + " .secret-class").removeClass("fa-volume-control-phone"); 
    }


    if(secretChannel && (userId == secretChannel.one || userId == secretChannel.another)){           
        $("#userList-" + userId + " .secret-class").removeClass("mic-gray");
        $("#userList-" + userId + " .secret-class").removeClass("fa-tty");
        $("#userList-" + userId + " .secret-class").addClass("mic-green");
        $("#userList-" + userId + " .secret-class").addClass("fa-volume-control-phone");            
    }else{
        $("#userList-" + userId + " .secret-class").addClass("mic-gray");
        $("#userList-" + userId + " .secret-class").addClass("fa-tty");
        $("#userList-" + userId + " .secret-class").removeClass("mic-green");
        $("#userList-" + userId + " .secret-class").removeClass("fa-volume-control-phone"); 
    }

}







//////用户上的诸多小动作///////////////////
function showMenu(userId, e) {
    menuUserId = userId;
    $(".left-control-bar .list-mask").show();
    $(".left-control-bar .list-menu").show();
    $(".left-control-bar .list-menu").css("left", e.clientX+10);
    $(".left-control-bar .list-menu").css("top", e.clientY-10);
}
$(".left-control-bar .list-mask").click(function(e){
    menuUserId = null;
    $(".left-control-bar .list-mask").hide();
    $(".left-control-bar .list-menu").hide();
});

function transferStartControl(lang) {
    var userId = menuUserId;
    openTransfer(userId, lang, true);
    $(".left-control-bar .list-mask").click();
}

function singleFreshControl(){
    var userId = menuUserId;
    if (lastLayoutMessage) {
        sendMqttMessage(userId, lastLayoutMessage.payloadString);
    }
    $(".left-control-bar .list-mask").click();
}

function openScreenControl(userId) {

    if( layout == '0') {
        showMessage("先切换屏幕分享布局",'warn',2500);
        return;
    }
    sendMqttMessage(userId, JSON.stringify({ type: "12", data: { screen: true } }));
    shareScreen(userId,'open screen CLICK');
    
    //camera存在的话放到第一个来
    if(mainVideoDomList.indexOf(userId) > -1 ){
        draggingFrom = userId;
        videoShowUp(mainVideoDomList[0]);
    }
    
}

function shareScreen(userId,sqId){ 
    currentShareScreen = userId;
    if (userId == user.userId)//自己,不要增加video，因为自己是看不到的
    {
        $(".container-box .share-screen").empty();
        $(".container-box .share-screen").append("<p>我正在分享屏幕....</p>");
        
    } else if(userId) { // 其它人，就增加dom，等待发布
        var video = $('<video id="screen-' + userId + '"autoplay playsinline></video>');
        $(".container-box .share-screen").empty();
        $(".container-box .share-screen").append(video);
    }
    


    aliWebrtc.getUserList().forEach(function(item){
        var info = getUserStatusInfo(item.userId);
        $("#userList-" + item.userId + " .desktop-class").removeClass("mic-green");
        $("#userList-" + item.userId + " .desktop-class").removeClass("mic-red");
        $("#userList-" + item.userId + " .desktop-class").removeClass("mic-gray");
        $("#userList-" + item.userId + " .desktop-class").removeClass("mic-yellow");
        if(info.activeScreen){
            if(currentShareScreen == item.userId) $("#userList-" + item.userId + " .desktop-class").addClass("mic-red");
            else $("#userList-" + item.userId + " .desktop-class").addClass("mic-green");            
        }else{
            if(currentShareScreen == item.userId) $("#userList-" + item.userId + " .desktop-class").addClass("mic-yellow");
            else $("#userList-" + item.userId + " .desktop-class").addClass("mic-gray");       
        }
    });


    //自身
    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-green");
    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-red");
    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-gray");
    $("#userList-" + user.userId + " .desktop-class").removeClass("mic-yellow");

    if(aliWebrtc.configLocalScreenPublish){
        if(currentShareScreen == user.userId) $("#userList-" + user.userId + " .desktop-class").addClass("mic-red");
        else $("#userList-" + user.userId + " .desktop-class").addClass("mic-green");            
    }else{
        if(currentShareScreen == user.userId) $("#userList-" + user.userId + " .desktop-class").addClass("mic-yellow");
        else $("#userList-" + user.userId + " .desktop-class").addClass("mic-gray");       
    }

    resetVideoShow();
    
}


function stopScreenControl(){
    var userId = menuUserId;
    $(".left-control-bar .list-mask").click();
    sendMqttMessage(userId, JSON.stringify({ type: "18" }));
}

function secretControl(userId){  //{one:userId,oneaudio:false,another:userId,anotheraudio:true}  保留现场的，以便于恢复
    if(secretChannel){  //只能有一个私密通道,需要先关闭
        
    }else if( userId != user.userId ) {
        sendMqttMessage(null, JSON.stringify({ type: "16" ,data:{one:userId,oneaudio: mainAudioDomList.indexOf(userId)>-1?true:false,another:user.userId,anotheraudio:mainAudioDomList.indexOf(user.userId)>-1?true:false}}));
    }
}

function kickSomeoneControl(){
    var userId = menuUserId;
    $(".left-control-bar .list-mask").click();

    sendMqttMessage(userId, JSON.stringify({ type: "99" }));
}

function modifyNameControl(userId){

    var userName = user.userName;

    if(userId != user.userId){
        var userInfo = aliWebrtc.getUserInfo(userId);
        userName = userInfo.displayName;
    }

    displayNameList.forEach(function(item){
        if(item.userId == userId) userName = item.displayName;
    });
    

    userName = prompt("修改用户显示名称",userName);

    if(userName) sendMqttMessage(null, JSON.stringify({ type: "15" ,data: {userId: userId, displayName:userName}}));

}

function modifyName(item){

    var name = item.displayName.substr(0, 7);

    $("#userList-" + item.userId +" span").html(name);
    $("#showVideo-1-" + item.userId + " .show-video-title").html(name);
    
}

function micClick(userId) {
    var index =  mainAudioDomList.indexOf(userId) ;
    sendMqttMessage(null, JSON.stringify({ type: "11", data: { userId: userId, audio: index> -1? false:true } }));
}

///////分屏////////
function toggleShow(userId, sqId) {

    var index = mainVideoDomList.indexOf(userId);
    if ( index > -1  )  
    {   
        $("#showVideo-1-" + userId).remove();        
        $("#userList-" + userId + " .show-class").removeClass("mic-green");
        $("#userList-" + userId + " .show-class").addClass("mic-gray");
        mainVideoDomList.splice(index, 1);

        

        resetVideoShow();
        changeAudioUi(userId);
        
        if (userId == user.userId) {
            aliWebrtc.stopPreview().then(function() {  
                console.log(sqId,userId,'取消订阅自己成功');
            }).catch(function(error) {
                console.error(error);
            });
        } else  { 
            
            if(mainAudioDomList.indexOf(userId) > -1 ){
                if($("#audio-" + userId).length == 0){
                    var dom = $('<video id ="audio-' + userId + '" autoplay playsinline ></video>');
                    $(".audio-box").append(dom);
                }
            }
            if(sqId == 'CLICK') subRemoteUser(userId, sqId);
        }
       
        return;
    }

    if (mainVideoDomList.length >= 16) {
        alert("最多增加16个");
        return;
    }

    var displayName = user.userName;
    if (userId != user.userId) {
        if (!aliWebrtc.getUserInfo(userId))
            displayName = userId;
        else
            displayName = aliWebrtc.getUserInfo(userId).displayName;
    }

    displayNameList.forEach(function(item){
        if(item.userId == userId) displayName = item.displayName;
    });

    $("#userList-" + userId + " .show-class").removeClass("mic-gray");
    $("#userList-" + userId + " .show-class").addClass("mic-green");

    var dom = $("<div onmouseup='videoShowUp(\""
        + userId + "\",this)' onmousedown='videoShowDown(\""
        + userId + "\")' onmouseover='videoShowOver(\""
        + userId + "\")' onmouseout='videoShowOut(\""
        + userId + "\",this)' ontouchend='videoShowTouch(\"" + userId + "\")' class='show-video' id='showVideo-1-"
        + userId + "'>" + '' + "</div>"); 

    var video = $('<video autoplay playsinline ></video>');
    dom.append(video);
    var label = $("<div class='show-video-title'> " + displayName.substr(0, 7) + "</div>");
    dom.append(label);
    var domMenu = $("<div class='show-video-menu'><button onclick='micClick(\"" + userId + "\")'><i class='fa fa-microphone mic-class' aria-hidden='true'></i></button>"
        + "<button onclick='toggleShow(\"" + userId + "\",\"CLICK\")'><i class='fa fa-arrow-circle-left' aria-hidden='true'></i></button></div>");
    dom.append(domMenu);

    mainVideoDomList.push(userId);

    

    $(".video-box").append(dom);

    resetVideoShow();
    changeAudioUi(userId);
    
    if (userId == user.userId) {
        aliWebrtc.stopPreview().then(function() {
            aliWebrtc.startPreview($('#showVideo-1-' + userId + " video")[0]).then(function() { 
                console.log(sqId,userId,'订阅且显示自己成功');  
            }).catch(function(error) {
                console.error(sqId,userId,'订阅且显示失败',error);
            })
        }).catch(function(error) {
            console.error(sqId,userId,'订阅且显示失败',error);
        });
    } else  { 
        $("#audio-" + userId).remove();
        if(sqId == 'CLICK') subRemoteUser(userId, sqId);
    }

}







/////////以下 用户列表调整顺序 相关////////////

function userListUp(userId) {
    listTo = userId;
    if (listFrom != listTo) {
        var me = $("#userList-" + listFrom);
        var another = $("#userList-" + listTo);
        me.insertAfter(another);

    }
    listFrom = null;
    listTo = null;
}
function userListDown(userId) {
    listFrom = userId;
}



var orderByName = false;
function userListOrderByNameControl(){
    userListOrderByName(orderByName);
    orderByName= !orderByName;
}
function userListOrderByName(sort){    
    var $list =  $(".left-control-bar .user-list li");
    $list.sort(function(a,b){
        var bo = $(a).children("span").text() > $(b).children("span").text();    
        //console.log(sort,bo);           
        if(sort) bo = !bo;
        if(bo) return -1;
        else return 1;
    });
    $list.detach().appendTo(".left-control-bar .user-list");
}


var orderByMic = false;
function userListOrderByMicControl(){
    userListOrderByClass(".mic-class",orderByMic);
    orderByMic= !orderByMic;
}

var orderBySecret = false;
function userListOrderBySecretControl(){
    userListOrderByClass(".secret-class",orderBySecret);
    orderBySecret= !orderBySecret;
}

var orderByDesktop = false;
function userListOrderByDesktopControl(){
    userListOrderByClass(".desktop-class",orderByDesktop);
    orderByDesktop= !orderByDesktop;
}

var orderByCamera = false;
function userListOrderByCameraControl(){
    userListOrderByClass(".show-class",orderByCamera);
    orderByCamera= !orderByCamera;
}

function userListOrderByClass(typeClass,sort){    
    var $list =  $(".left-control-bar .user-list li");
    $list.sort(function(a,b){
        var a1 = $(a).children(typeClass).hasClass("mic-gray")?1:0;
        var b1 = $(b).children(typeClass).hasClass("mic-gray")?1:0;
        var bo = a1>b1;
        console.log(a1,b1,bo);           
        if(sort) bo = !bo;
        if(bo) return -1;
        else return 1;
    });
    $list.detach().appendTo(".left-control-bar .user-list");
}



/////////底部按钮功能//////////
function layoutControl(value) {    
    $(".layout-mask").hide();
    $(".layout-menu").hide();
    layout = value;
    resetVideoShow();
}
    

function transferStopControl() {
    sendMqttMessage(null, JSON.stringify({ type: "14" }));
}

function secretStopControl(){
    sendMqttMessage(null, JSON.stringify({ type: "17" }));
}

function muteControl() {
    sendMqttMessage(null, JSON.stringify({ type: "11" }));
}

function syncControl() {

    if(layout === '0')
        sendMqttMessage(null, JSON.stringify({ type: "10", data: { layout: layout, cameras: mainVideoDomList,audios: mainAudioDomList,names:displayNameList,secret:secretChannel} }));
    else
        sendMqttMessage(null, JSON.stringify({ type: "10", data: { layout: layout, cameras: mainVideoDomList,audios: mainAudioDomList,names:displayNameList,secret:secretChannel, screen: currentShareScreen } }));

}

function restoreControl() {
    if (lastLayoutMessage) {
        onMessageArrived(lastLayoutMessage);
    }

}


function layoutMenu(e) {
    $(".layout-mask").show();
    $(".layout-menu").show();
    $(".layout-menu").css("left", e.clientX - 10);
    $(".layout-menu").css("bottom", $(window).height() -e.clientY + 20);
}
$(".layout-mask").click(function(e){
    $(".layout-mask").hide();
    $(".layout-menu").hide();
});


function logout(){
    showMessage("退出房间",'error',2500);
}




///////////分屏内的控制函数//////////////////////////

function videoShowDown(userId) {
    videoDragging = true;
    draggingFrom = userId;
}

function videoShowUp(userId) {
    videoDragging = false;
    draggingTo = userId;
    if (draggingFrom != draggingTo) {
        // 数组中交换位置
        var fromIndex = mainVideoDomList.indexOf(draggingFrom);
        var toIndex = mainVideoDomList.indexOf(draggingTo);
        mainVideoDomList[toIndex] = mainVideoDomList.splice(fromIndex, 1, mainVideoDomList[toIndex])[0];
        //console.log(mainVideoDomList);

        var me = $("#showVideo-1-" + draggingFrom);
        var another = $("#showVideo-1-" + draggingTo);
        var cloneMe = me.clone();
        var temp = $('<div/>');
        another.before(temp);
        me.replaceWith(another);
        temp.replaceWith(cloneMe);

        // 重新进行刷新 视频
        if (draggingFrom == user.userId || draggingTo == user.userId) {
            aliWebrtc.startPreview($('#showVideo-1-' + user.userId + " video")[0]).then(function() { }).catch(function(error) {
                console.error(error);
            })
        }
        if(draggingFrom != user.userId)   subRemoteUser(draggingFrom,":Drag:");
        if(draggingTo != user.userId)   subRemoteUser(draggingTo,":Drag:");
       

    }
    draggingFrom = null;
    draggingTo = null;
}

function videoShowOver(userId) {
    if (videoDragging == false && user.isAdmin) $("#showVideo-1-" + userId + " .show-video-menu").show();
}

function videoShowOut(userId) {
    $("#showVideo-1-" + userId + " .show-video-menu").hide();
}

function videoShowTouch(userId) {
    console.log($("#showVideo-1-" + userId + " .show-video-menu")[0].style.display);
    if (user.isAdmin && $("#showVideo-1-" + userId + " .show-video-menu")[0].style.display == "none")
        $("#showVideo-1-" + userId + " .show-video-menu").show();
    else {
        $("#showVideo-1-" + userId + " .show-video-menu").hide();
    }
}








/////左/右上角按钮/////////////////////

$(".logo-title").click(function() {

    if( !user || !user.isAdmin) return;
    var w = $(".left-control-bar")[0].offsetWidth
    if (w == 0) {
        leftControlBarWidth = leftControlBarWidthFinal;        
    }
    else {
        leftControlBarWidth = 0;        
    }
    resetVideoShow();
})

var rotated = false;
$(".container-box .rotate-control").click(function() {
    rotated = !rotated;
    resetVideoShow();
})

window.onresize = function() {
    resetVideoShow();
};



//////转录文字框的点击效果///////////////// 
$(".container-box .trans-box").click(function() {
    var hei = $(".container-box .trans-box")[0].offsetHeight;
    if(hei === 80){
        hei = 10;
    }else 
    {
        hei = 80;
    }
    $(".container-box .trans-box").css("height",hei+"px");
    
});




/////重新刷新视频尺寸///////////////
function resetVideoShow() {

    if( !user ) return;

    var shareWidth;
    var shareHeight;

    var paddingBlue;

    //console.log('resetVideoShow()');

    if (isFullscreen() || !user.isAdmin) {   //手机端 isFullscreen判断都是全屏！
        $(".logo-title").hide();
        $(".bottom-bar").hide();
        $(".container-box").css("margin",0);
        $(".left-control-bar").hide();
        paddingBlue = 0;
    }else{        // 非全屏且管理员
                
        $(".logo-title")[0].style.left = leftControlBarWidth + 0 + "px";
        $(".bottom-bar")[0].style.left = leftControlBarWidth + 0 + "px";
        $(".left-control-bar")[0].style.width = leftControlBarWidth + "px";

        if(leftControlBarWidth == leftControlBarWidthFinal){
            $(".left-control-bar").show();
        }else{
            $(".left-control-bar").hide();
        }
        $(".logo-title").show();
        $(".bottom-bar").show();
        $(".container-box").css("margin",60);        
        
        paddingBlue=120;
    }

    if(($(window).width()< $(window).height()) && !user.isAdmin ){  // 竖屏 普通用户
        $(".container-box .rotate-control").show();
        if(rotated){            
            shareWidth =   $(window).height();
            shareHeight  =   $(window).width();
            $(".main-body").css("width",shareWidth + "px"); //hack
            $(".container-box").css("width",shareWidth +"px");
            $(".container-box").css("height",shareHeight + "px");
            $(".container-box").css({"transform":"rotate(90deg)","transform-origin": shareHeight/2+"px " + shareHeight/2 + "px" ,"-webkit-transform":"rotate(90deg)","-webkit-transform-origin": shareHeight/2+"px " + shareHeight/2 + "px"  });
        }else{
            $(".main-body").css("width","100%");
            shareWidth = $(window).width();
            shareHeight =  $(window).height();
            $(".container-box").css("width","auto");
            $(".container-box").css("height","auto");
            $(".container-box").css({"transform":"rotate(0deg)","transform-origin": "0 0" ,"-webkit-transform":"rotate(0deg)","-webkit-transform-origin": "0 0"  });
        }
    }else{
        $(".main-body").css("width","100%");
        $(".container-box .rotate-control").hide();
        shareWidth = $(window).width() - leftControlBarWidth -paddingBlue;  // 上下padding
        shareHeight =  $(window).height() -paddingBlue;     //左右padding
        $(".container-box").css("width","auto");
        $(".container-box").css("height","auto");
        $(".container-box").css({"transform":"rotate(0deg)","transform-origin": "0 0" ,"-webkit-transform":"rotate(0deg)","-webkit-transform-origin": "0 0"  });
    }
    

    var boxWidth = shareWidth;
    var boxHeight = shareHeight;


    if (layout == '0') {

        var wI=1;
        var hI=1;

        switch (mainVideoDomList.length) {
            case 1:
                break;
            case 2:
                wI=2;
                hI=1;
                break;
            case 3:
            case 4:
                wI=2;
                hI=2;
                break;
            case 5:
            case 6:
                wI=3;
                hI=2;
                break;
            case 7:
            case 8:
            case 9:
                wI=3;
                hI=3;
                break;
            case 10:
            case 11:
            case 12:
                wI=4;
                hI=3;
                break;
            default:
                wI=4;
                hI=4;
                break;
        }

        boxWidth = shareWidth / wI;
        boxHeight = boxWidth *3/4;
        var  tempHight = shareHeight/hI ;
        if(boxHeight > tempHight){
            boxHeight = tempHight;
            boxWidth = shareWidth / wI;
        }

        boxWidth=boxWidth-2;
        boxHeight = boxHeight -2;

        $(".container-box .video-box").css("flex-direction", "row");
        $(".container-box .video-box").css("top", 0);
        $(".container-box .video-box").css("left", 0);
        $(".container-box .video-box").css("bottom", 0);
        $(".container-box .video-box").css("right", 0);
        $(".container-box .video-box").css("flex-wrap", "wrap");
        $(".container-box .video-box").css("justify-content", "center");
        $(".container-box .video-box").css("align-content", "center");


    } else {
        switch (layout) {
            case "2":
                $(".container-box .video-box").css("flex-direction", "row");
                $(".container-box .video-box").css("bottom", "auto");
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap");
                $(".container-box .video-box").css("justify-content", "center");
                

                break;
            case "3":
                $(".container-box .video-box").css("flex-direction", "row-reverse");
                $(".container-box .video-box").css("bottom", "auto");
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "4":
                $(".container-box .video-box").css("flex-direction", "column");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", "auto");
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap-reverse");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "5":
                $(".container-box .video-box").css("flex-direction", "column-reverse");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", "auto");
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap-reverse");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "6":
                $(".container-box .video-box").css("flex-direction", "row-reverse");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", "auto");
                $(".container-box .video-box").css("flex-wrap", "wrap-reverse");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "7":
                $(".container-box .video-box").css("flex-direction", "row");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", "auto");
                $(".container-box .video-box").css("flex-wrap", "wrap-reverse");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "8":
                $(".container-box .video-box").css("flex-direction", "column-reverse");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", "auto");
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "9":
                $(".container-box .video-box").css("flex-direction", "column");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", "auto");
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            case "10":
                $(".container-box .video-box").css("flex-direction", "row");
                $(".container-box .video-box").css("bottom", "auto");
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", 0);
                $(".container-box .video-box").css("flex-wrap", "wrap");
                $(".container-box .video-box").css("justify-content", "flex-start");
                

                break;
            default:   // "1"
                $(".container-box .video-box").css("flex-direction", "row");
                $(".container-box .video-box").css("bottom", 0);
                $(".container-box .video-box").css("left", 0);
                $(".container-box .video-box").css("right", 0);
                $(".container-box .video-box").css("top", "auto");
                $(".container-box .video-box").css("flex-wrap", "wrap-reverse");
                $(".container-box .video-box").css("justify-content", "center");
                

                break;
        }
        $(".container-box .video-box").css("align-content", "stretch");

        boxWidth = boxWidth / 8;
        boxHeight = boxWidth * 3 / 4;
    }

    //console.log(boxWidth,boxHeight,shareWidth,shareHeight);

    $(".video-box .show-video video").each(function(i, dom) {
        dom.style.width = boxWidth + 'px';
        dom.style.height = boxHeight + 'px';
    });

    $(".container-box .share-screen video").each(function(i, dom) {
        dom.style.width = (shareWidth -3)  + 'px';
        dom.style.height = (shareHeight-3)  + 'px';
    });

    $(".container-box .video-box p").remove();
    if(mainVideoDomList.length == 0 && layout == '0'){
        $(".container-box .video-box").append("<p>暂无摄像头和桌面分享.</p>");
    }

    if(currentShareScreen) {        
    }else{
        $(".container-box .share-screen p").remove(); 
        $(".container-box .share-screen").append("<p>暂无桌面分享.</p>");
    }

}




/**
 * 页面刷新时调用离会
 */
window.onbeforeunload = function (e) {
    aliWebrtc.leaveChannel();
    aliWebrtc.dispose();
};

