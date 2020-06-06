/**
     * 必须使用https
     */ 
    var AppServerUrl = "https://api.xfunction.net/meeting/login";
    var channelId;
    var userName = Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 5);
    var publisherList = [];
    var aliWebrtc;
    aliWebrtc = new AliRtcEngine();
    /**
     * AliWebRTC isSupport检测
     */ 
    aliWebrtc.isSupport().then(function(re) {
        console.log(re);
        init();
    }).catch(function(error) {
        alert(error.message);
    })

    function init() {
        /**
         * remote用户加入房间 onJoin
         * 更新在线用户列表
         */ 
        aliWebrtc.on("onJoin", function(publisher) {
            if(publisher.userId){
                updateUserList();
            }
            //重置订阅状态
            //默认订阅远端音频和视频大流，但需要调用subscribe才能生效
            //这里取消默认订阅，根据需求进行订阅
            aliWebrtc.configRemoteAudio(publisher.userId, false);
            aliWebrtc.configRemoteCameraTrack(publisher.userId, false, false);
            // showAlert(publisher.displayName + "加入房间","success");
            console.log(publisher.displayName + "加入房间");
        });
        /**
         * remote流发布事件 onPublish
         * 将该用户新增到推流列表
         * 若该用户已存在推流列表，则进行状态更新
         */
        aliWebrtc.on("onPublisher", function(publisher) {
            console.log("onPublisher", publisher);
            var index = publisherList.getIndexByProprety(publisher.userId, "userId");
            if (index === -1) {
                //新增
                publisherList.push(publisher);
            } else {
                //流状态更新
                updatePublisherStream(publisher, index);
            }
        });

        /**
         * remote流结束发布事件 onUnPublisher
         * 推流列表删除该用户
         * 移除用户视图
         * 初始化订阅状态
         */ 
        aliWebrtc.on("onUnPublisher", function(publisher) {
            console.log("onUnPublisher",publisher);
            detelePublisher(publisher.userId);
            removeDom(publisher.userId);
            initialization(publisher.userId);
        });

        /**
         * 被服务器踢出或者频道关闭时回调 onBye
         */
        aliWebrtc.on("onBye",function(message){
            //1:被服务器踢出
            //2:频道关闭
            //3:同一个ID在其他端登录,被服务器踢出
            var msg;
            switch (message.code) {
                case 1: msg = "被服务器踢出";
                    break;
                case 2: msg = "频道关闭";
                    break;
                case 3: msg = "同一个ID在其他端登录,被服务器踢出";
                    break;
                default: msg = "onBye";
            }
            showAlert(msg,"danger");
        });
        
        /**
         *  错误信息
         */ 
        aliWebrtc.on("onError", function(error) {
            console.log(error)
            var msg = error && error.message ? error.message : error;
            if (msg && msg.indexOf("no session") > -1) {
                msg = "请重新登录：" + msg;
            }
            if (error.errorCode === 10011 || error.errorCode === 10012) {
                msg = error.errorCode === 10011 ? "屏幕共享被禁止" : "屏幕共享已取消";
                setTimeout(function() {
                    $("#screenPublish").removeAttr("checked");
                    getPublishState("danger");
                }, 2000);
            }

            if(error.code == 15) {
                msg = "没有开启H5兼容";
            }
            if(error.type === "publish") {
                console.log("推流断开 需要停止推流,然后重新推流");
                $(".push-stream").click();
                //先记录当前推流状态
                var pubAudio = aliWebrtc.configLocalAudioPublish;
                var pubCamera = aliWebrtc.configLocalCameraPublish;
                var pubScreen = aliWebrtc.configLocalScreenPublish;
                aliWebrtc.publish().then(function(){
                    console.log("推流断开取消推流成功");
                    aliWebrtc.configLocalAudioPublish = pubAudio;
                    aliWebrtc.configLocalCameraPublish = pubCamera;
                    aliWebrtc.configLocalScreenPublish = pubScreen;
                    aliWebrtc.publish().then(function(){
                        console.log("推流断开重新推流成功");
                    }).catch(function(err) {
                        console.log("推流断开重新推流失败");
                    })
                }).catch(function(err) {
                    console.log("推流断开取消推流失败");
                })
            }
            if(error.type === "subscribe") {
                console.log("订阅断开 取消订阅该userId的所有订阅并移除所有该userId的dom");
                //先记录当前用户的订阅状态
                var subInfo = getSubscribeInfo(error.userId);
                //取消订阅状态
                initialization(error.userId);
                aliWebrtc.subscribe(error.userId).then(function(re) {
                    console.log("订阅断开 取消订阅成功");
                    aliWebrtc.configRemoteAudio(error.userId,subInfo.isSubAudio);
                    aliWebrtc.configRemoteCameraTrack(error.userId,subInfo.isSubLarge,subInfo.isSubCamera);
                    aliWebrtc.configRemoteScreenTrack(error.userId,subInfo.isSubScreen);
                    aliWebrtc.subscribe(error.userId).then(function(re) {
                        console.log("订阅断开 重新订阅成功")
                        if($("#" + error.userId + "_camera")){
                            aliWebrtc.setDisplayRemoteVideo(error.userId,$("#" + error.userId + "_camera video")[0], 1)
                        }
                        if($("#" + error.userId + "_screen")){
                            aliWebrtc.setDisplayRemoteVideo(error.userId,$("#" + error.userId + "_screen video")[0], 2)
                        }
                    }).catch(function(err){
                        console.log("订阅断开 重新订阅失败");
                        detelePublisher(error.userId);
                        removeDom(error.userId);
                    })
                }).catch(function(err) {
                    console.log("订阅断开 取消订阅失败", err)
                    detelePublisher(error.userId);
                    removeDom(error.userId);
                });
            }
            showAlert(msg,"danger")
        });

        /**
         * 检测到用户离开频道 
         * 更新用户列表 
         * 移除用户视图
         */ 
        aliWebrtc.on("onLeave", function(publisher) {
            initialization(publisher.userId);
            updateUserList();
            removeDom(publisher.userId);
            showAlert(publisher.displayName + "离开房间","success");
        })
    }

    /**
     * 加入房间
     * 触发：输入房间号、单击加入房间按钮
     * 更新页面信息
     * 默认开启预览
     * 获取鉴权信息
     * 加入房间
     * 本地默认自动推视频流（视频流 + 音频流）
     * 发布本地流
     */ 
    function joinroom() {
        $(".local-display-name .username b").text(userName);
        $(".local-display-name .channelid b").text(channelId);
        $(".local-display-name .streamstate b").text("当前未推流");
        //1.预览
       aliWebrtc.currentCamera = {
           facingMode : "user"
        }
        var localVideo = $(".local-video video");
        aliWebrtc.startPreview(localVideo[0]).then(function(obj) {
            }).catch(function(error) { 
            showAlert("[开启预览失败]" + error.message,"danger");
        });
        //2. 获取频道鉴权令牌参数 -->
        getRTCAuthInfo().then(function(authInfo)  {
            //3. 加入房间 默认推音频视频流
            aliWebrtc.joinChannel(authInfo, userName).then(function() {
                showAlert( "加入房间成功", "success");
                // 4. 发布本地流
                aliWebrtc.configLocalAudioPublish = true;
                aliWebrtc.configLocalCameraPublish = true;
                aliWebrtc.setVideoProfile({ //设置屏幕分享
                    width: 1920,
                    height: 1080
                }, 2);
                aliWebrtc.publish().then(function(res) {
                    setTimeout(function() {
                        console.log("发布流成功");
                        $(".push-stream").text("停止推流");
                        $(".streamType").show();
                        $(".local-display-name .streamstate b").text("视频流");
                    },2000)
                }, function(error) {
                    $(".streamType").show();
                    showAlert("[推流失败]" + error.message, "danger");
                });
            }).catch(function(error) {
                showAlert("[加入房间失败]" + error.message, "danger");
            })
        }).catch(function(error) {
            showAlert( error.message, "danger");
        });
    }

    /**
     * 更新在线用户列表
     */ 
    var updateUserList = function() {
        $(".user-ul").empty();
        var userList = aliWebrtc.getUserList();
        var frg = document.createDocumentFragment();
        userList.map(function(user) {
            var html = $("<li class='user-ul-li'>" + user.displayName + "<ul class='menu'></ul></li>");
            $(html).bind("mouseover",user.userId,showUserMenu).bind("mouseleave",hideUserMenu);
            frg.append(html[0]);
        })
        $(".user-ul").append($(frg));
    }

    

    /**
     * 获取频道鉴权令牌参数这个方法需要客户重新实现，调用RTC服务的Open API获取
     */ 
    var getRTCAuthInfo = function() {
        return new Promise(function (resolve, reject) {
            $.post(AppServerUrl + "?channelId=" + channelId + "&userName=" + userName + "&channelCode=111111", {}, function(re) {
                console.log(re);
                re.data.channel = channelId;
                resolve(re.data);
            }).error(function(error){
                if(error.status == 404){
                    error.message = "获取鉴权信息失败,可能是AppServer地址错误";
                } else if(error.status == 0){
                    error.message = "获取鉴权信息失败,可能是https证书错误";
                }
                reject(error);
            });
        });
    }

    /**
     * 获取当前remote用户的流菜单
     */ 
    var showUserMenu = function(evt) {
        var userId = evt.data;
        if(!$(event.target).eq(0).hasClass("user-ul-li")){
            return
        }
        $(".menu").hide();
        $(event.target).find(".menu").empty().show();
        var userInfo = aliWebrtc.getUserInfo(userId);
        var streamTypeList = userInfo.streamConfigs.filter(function(item) {
            return item.state === "active";
        });
        var html = "";
        if(streamTypeList.length == 0){
            html = $("<li>该用户未推流</li>");
            $(event.target).find(".menu").append(html[0]);
        }else{
            var frg = document.createDocumentFragment()
            streamTypeList.map(function(item) {
                item.userId = userId;
                var labelName = "";
                if(item.type === "video"){
                    switch (item.label) {
                        case "sophon_video_camera_large":
                            labelName = "视频流";
                            break;
                        case "sophon_video_screen_share":
                            labelName = "共享流";
                            break;
                        case "sophon_audio":
                            labelName = "";
                            break;
                        default:
                            labelName = "";
                    }
                } else {
                    labelName = "";
                }
                //将音频流或小流的标签不显示
                if(labelName !== ""){
                    var subState = item.subscribed === true ? "取消订阅" : "订阅";
                    html = $("<li>"+ labelName +"&nbsp;<span>"+ subState +"</span></li>");
                    $(html).find("span").off("click").on("click", item, unSub);
                    frg.append(html[0]);
                }
            })
            $(event.target).find(".menu").append($(frg));
        }
    }

    /**
     * 隐藏当前remote用户的流菜单
     */ 
    var hideUserMenu = function() {
        $(event.currentTarget).find(".menu").hide();
    }

    /**
     * 订阅&取消订阅
     */ 
    var unSub = function(evt) {
        var v = evt.data;
        if(v.subscribed){
            setConfigRemote(v.userId, v.label).then(function(re) {
                removeDom(v.userId, v.label);
                console.log("取消订阅");
            });
        }else {
            receivePublishManual(v).then(function(re) {
                creatDomAndshowRemoteVideo(v);
                console.log("订阅成功");
            });
        }
        $(".menu").hide();
    }


    /**
     * 获取dom标签 设置video
     */ 
    var creatDomAndshowRemoteVideo = function(v)  {
        var dom = getDisplayRemoteVideo(v.userId, v.label);
        if (v.label != "sophon_video_screen_share") {
            aliWebrtc.setDisplayRemoteVideo(v.userId, dom, 1);
        } else {
            aliWebrtc.setDisplayRemoteVideo(v.userId, dom, 2);
        }
    }

    /**
     * 创建获取订阅的remote的video标签
     */ 
    var getDisplayRemoteVideo = function (userId, label) {
        var label = label === "sophon_video_camera_large" ? "camera" : "screen";
        var id = userId + "_" + label;
        var videoWrapper = $("#" + id);
        if (videoWrapper.length == 0) {
            var userInfo = aliWebrtc.getUserList().filter(function(item) {
                return item.userId === userId;
            })
            var displayName = userInfo[0].displayName;
            videoWrapper = $("<div class='remote-subscriber' id=" + id + "> <video autoplay playsinline controls></video><div class='display-name'></div></div>");
            $(".video-container").append(videoWrapper);
        }
        videoWrapper.find(".display-name").text(displayName + "—" + label);
        return videoWrapper.find("video")[0];
    }

    /**
     * 移除dom
     */ 
    var removeDom = function(userId, label)  {
        if(label === "sophon_audio") return
        if(userId) {
            if(!label){
                $("#" + userId + "_camera").remove();
                $("#" + userId + "_screen").remove();
            }else {
                label = label === "sophon_video_camera_large" ? "camera" : "screen";
                $("#" + userId + "_" + label).remove();
            }
        }
    }

    /**
     * 取消订阅设置
     */ 
    var setConfigRemote = function(userId, label)  {
        return new Promise(function(resolve, reject)  {
            //demo中只订阅大流
            if (label === "sophon_video_camera_large") {
                aliWebrtc.configRemoteCameraTrack(userId, false, false);
                aliWebrtc.configRemoteAudio(userId,false);
            } else if (label === "sophon_video_screen_share") {
                aliWebrtc.configRemoteScreenTrack(userId, false);
            }
            aliWebrtc.subscribe(userId).then(function(re) {
                resolve();
            }).catch(function(error) {console.log("取消订阅失败", error)})
        });
    }

    

    /**
     * 订阅设置
     */
    var receivePublishManual = function(v)  {
        console.log("receivePublishManual订阅", v);
        return new Promise(function(resolve, reject)  {
            if (v.label === "sophon_video_camera_large") {
                console.log("订阅固定视频流");
                aliWebrtc.configRemoteCameraTrack(v.userId, true, true);
                aliWebrtc.configRemoteAudio(v.userId, true);
            } else if (v.label === "sophon_video_screen_share") {
                console.log("订阅屏幕共享流");
                aliWebrtc.configRemoteScreenTrack(v.userId, true);
            }
            aliWebrtc.subscribe(v.userId).then(function(re) {
                resolve();
            }).catch(function(error) {
                reject(error);
                showAlert("[subscribe失败]" + error.message, "danger");
            });
        })
    }

    /**
     * 更新推流状态
     * 当远端流发生变化时，通过onPublisher回调接收到信息
     * 远端流不可用时其state值为inactive
     * 通过对比本地维护的publisherList来进行dom的删除
     * 并且更新本地维护的publisherList
     */
    var updatePublisherStream = function(publisher,index) {
        var oldStreamConfigs = JSON.parse(JSON.stringify(publisherList[index].streamConfigs));
        var newStreamConfigs = publisher.streamConfigs;
        var subscribeInfo = getSubscribeInfo(publisher.userId);
        oldStreamConfigs.forEach(function(v, i, a)  {
          var newStream = newStreamConfigs.getObjByProprety(v.label, "label");
          // 判断流状态改变了 但不确定我们是否订阅了该流
          if (v.state != newStream.state) {
            console.log("流的状态变了" + v.label, v, v.type, ">"+ v.state + ">>" + newStream.state + ">", newStream, subscribeInfo);
            //并且要取消订阅某个流，不然就不能再次订阅了
            subscribeInfo.subscribeInfoArr.forEach(function(sv)  {
              if (v.label === sv.label) {
                console.log("setConfigRemote取消订阅调用[api]:subscribe", publisher.userId, sv.type, sv.label);
                setConfigRemote(publisher.userId, sv.type, sv.label).then(function(re) {
                  // 移除dom
                  removeDom(publisher.userId, v.label);
                }).catch(function(error) {
                    console.error("流的状态变了重新订阅出问题", error);
                });
              }
            });
          }
        });
        publisherList.splice(index, 1, publisher);
    }

    /**
     * 用户停止推流时 删除用户列表中该用户
     */ 
    var detelePublisher = function(userId)  {
        var index = publisherList.getIndexByProprety(userId, "userId");
        if (index != -1) {
          publisherList.splice(index, 1);
          this.detelePublisher(userId);
        } else {
          console.log("未找到之前的推流数据"); //删除推流用户
        }
    }

    /**
     * 正在推流时,热切换进行republish操作 
     */
    var rePublish = function() {
        if($(".publisher .push-stream").text() === "停止推流"){
            $(".publisher .push-stream").text("处理中...");
            $(".streamType").hide();
            aliWebrtc.publish().then(function(re) {
                setTimeout(function() {
                    getPublishState("success");
                },2000);
            }).catch(function(error) {
                setTimeout(function() {
                    getPublishState("danger");
                }, 2000);
            });
        }
    }

    /**
     * 根据推流状态设置当前推流UI
     */
    var getPublishState = function(type)  {
        var streamstate = $(".streamstate b").text()
        if(aliWebrtc.configLocalAudioPublish || aliWebrtc.configLocalCameraPublish || aliWebrtc.configLocalScreenPublish){
            $(".publisher .push-stream").text("停止推流");
            if(aliWebrtc.configLocalScreenPublish && aliWebrtc.configLocalCameraPublish){
                streamstate = "视频流 + 共享流";
            } else {
                if(aliWebrtc.configLocalScreenPublish) {
                    streamstate = "共享流";
                } else if(aliWebrtc.configLocalCameraPublish) {
                    streamstate = "视频流";
                }
            }
        } else {
            $(".publisher .push-stream").text("开始推流");
            streamstate = "当前未推流";
        }
        showAlert("推流状态：" + streamstate, type);
        $(".streamstate b").text(streamstate);
        $(".streamType").show();
    }

    /**
     * 进入房间
     */ 
    $(".main-button button").click(function() {
        var value = $(".main-input input").val();
        if(!value){
            showAlert("请输入房间号","danger");
            return
        }
        if(!aliWebrtc){
            showAlert("isSupport失败,未能初始化aliWebrtc","danger");
            return
        }
        channelId = value;
        joinroom();
        $(".login").hide();
        $(".main-web").show();
    })

    /**
     * 控制预览
     */
    $(".publisher .select-preview").click(function(e) {
        var localVideo = $(".local-video video");
        if($(this).text() === "开启预览"){
            $(this).text("处理中...");
            aliWebrtc.startPreview(localVideo[0]).then(function(obj) {
                setTimeout(function() {
                    $(this).text("关闭预览");
                },2500);
            }).catch(function(error) { 
                setTimeout(function() {
                    $(this).text("开启预览");
                },2500);
                showAlert("[关闭预览失败]" + error.message, "danger"); 
            });
        }else if($(this).text() === "关闭预览") {
            $(this).text("处理中...");
            aliWebrtc.stopPreview().then(function(re) {
                setTimeout(function() {
                    $(this).text("开启预览");
                },2500);
            }).catch(function(error) { 
                setTimeout(function() {
                    $(this).text("关闭预览");
                },2500);
                showAlert("[开启预览失败]" + error.message, "danger"); 
            });
        }else {
            return
        }
    })

    /**
     * 控制推流选项
     */
    $(".publisher .streamType input").click(function(e) {
        var config = $(this).val();
        var isChecked = $(this).prop("checked");
        if(config === "cameraPublisher"){
            if(isChecked){
                aliWebrtc.configLocalAudioPublish = true;
                aliWebrtc.configLocalCameraPublish = true;
            } else {
                aliWebrtc.configLocalAudioPublish = false;
                aliWebrtc.configLocalCameraPublish = false;
            }
        }else {
            if(isChecked){
                aliWebrtc.configLocalScreenPublish = true;
            } else {
                aliWebrtc.configLocalScreenPublish = false;
            }
        }
        //正在推流时可以热切换
        rePublish();
    })

    /**
     * 处理推流
     */ 
    $(".publisher .push-stream").click(function(e) {
        if($(this).text() === "开始推流") {
            $(this).text("处理中...")
            $(".streamType").hide()
            aliWebrtc
                .publish()
                .then(function(re) {
                    setTimeout(function() {
                        getPublishState("success");
                    },2000);
                })
                .catch(function(error) {
                    $(this).text("开始推流");
                    $(".streamType").show();
                    showAlert( "[开始推流失败]" + error.message, "danger");
                });
        }else if($(this).text() === "停止推流") {
            $(this).text("处理中...");
            $(".streamType").hide();
            aliWebrtc.configLocalAudioPublish = false;
            aliWebrtc.configLocalCameraPublish = false;
            aliWebrtc.configLocalScreenPublish = false;
            aliWebrtc.publish().then(function(re){
                setTimeout(function() {
                    $("input[type='checkbox']").removeAttr("checked");
                    $(".streamType").show();
                    $(this).text("开始推流");
                    $(".local-display-name .streamstate b").text("当前未推流");
                },2000);
            } ,function(error){
                $(".streamType").show();
                showAlert( "[停止推流失败]" +  error.message, "danger");
            });
        }else {
            return
        }
    });

    /**
     * 页面刷新时调用离会
     */ 
    window.onbeforeunload = function (e) {
        if(!aliWebrtc){
            showAlert("isSupport失败,未能初始化aliWebrtc","danger");
            return
        }
        aliWebrtc.leaveChannel();
        aliWebrtc.dispose();
    };