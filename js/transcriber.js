var ws = null; //实现WebSocket 
var record = null; //多媒体对象，用来处理音频

var socketUrl = "wss://api.xfunction.cn/transcriberSocket/";
//var socketUrl = "ws://127.0.0.1:8090/transcriberSocket/";

//此部分代码存在jquery 与原生 混写的情况，有意为之

/// 开始  测试声音功能
var audioPlay = document.querySelector('audio#audioPlay');
var btnRecord = document.querySelector('button#btnRecord');
var btnPlay = document.querySelector('button#btnPlay');
 
btnRecord.onclick = function() {    
    
    navigator.mediaDevices.getUserMedia({ audio: true })   // 录制屏幕的声音 默认是48000 采样率 采样数位 16位
            .then(function(stream ) {
                initTransfer(new Recorder(stream));
                console.log('开始声音测试');
                record.startTest();                    
            });

    btnRecord.textContent = '保持说话：10s';
    btnRecord.disabled = true;
    btnPlay.disabled = true;
    readSecond();    
};

btnPlay.onclick = function(){
    btnPlay.textContent = '正在播放..'; 
    btnRecord.disabled = true;       
    btnPlay.disabled = true;

    audioPlay.play();

    audioPlay.onended = function() {
        btnPlay.textContent = '点击播放';
        btnRecord.textContent = '点击录制';
        btnRecord.disabled = false;
        btnPlay.disabled = false;
        $(".login-info button").attr("disabled", false);        
    }
}

var readTime = 6;
function readSecond(){
    if(readTime > 0){
        readTime -- ;
        btnRecord.textContent = '保持说话：'+ readTime+'s';
        setTimeout(function() {
            readSecond();
        }, 1000);
    }else{
        readTime = 6;
        //获取资源
        audioPlay.src = window.URL.createObjectURL(record.stopTest());
        //开始播放
        audioPlay.load();
        
        btnRecord.textContent = '点击录制';
        btnRecord.disabled = false;
        btnPlay.disabled = false;
        if(userSystem.system != "iphone" && userSystem.system != "ipad") {      
            btnPlay.click();
        }
    }
}
/// 结束 测试声音功能


function openTransfer(userId,lang,click){
    closeTransfer();
    if(userId == user.userId){
        navigator.mediaDevices.getUserMedia({ audio: true })   // 录制屏幕的声音 默认是48000 采样率 采样数位 16位
            .then(function(stream) {
                initTransfer(new Recorder(stream));
                console.log('开始Socket发送语音');
                useWebSocket();                       
            });
    }else if(click){
        sendMqttMessage(userId,JSON.stringify({type:"13",lang:lang}));
    }
    
}


function closeTransfer() {
    if (ws) {
        ws.close();
        record.stop();
        console.log('关闭Socket发送语音');
    }    
}



function initTransfer(rec) {
    record = rec;
}

//录音对象
var Recorder = function (stream) {
    var sampleBits = 16; //输出采样数位 8, 16
    var sampleRate = 16000; //输出采样率
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    var audioInput = context.createMediaStreamSource(stream);
    var recorder = context.createScriptProcessor(4096, 1, 1);  // 缓存  输入/出的声道数

    var audioData = {
        size: 0, //录音文件长度
        buffer: [], //录音缓存
        inputSampleRate: 48000, //输入采样率
        inputSampleBits: 16, //输入采样数位 8, 16
        outputSampleRate: sampleRate, //输出采样数位
        oututSampleBits: sampleBits, //输出采样率
        clear: function () {
            this.buffer = [];
            this.size = 0;
        },
        input: function (data) {
            this.buffer.push(new Float32Array(data));  // data回调缓存 进入buffer
            this.size += data.length;  // buffer中的float32值的个数。
        },
        compress: function () { //合并压缩
            //合并
            var data = new Float32Array(this.size);  // [-1,1]
            var offset = 0;
            for (var i = 0; i < this.buffer.length; i++) {
                data.set(this.buffer[i], offset);
                offset += this.buffer[i].length;
            }
            //压缩
            var compression = parseInt(this.inputSampleRate / this.outputSampleRate);  // 48000->16000, 缩小3倍
            var length = data.length / compression;
            var result = new Float32Array(length);
            var index = 0,
                j = 0;
            while (index < length) {
                result[index] = data[j];
                j += compression;
                index++;
            }
            //console.log("after compress: ", result.length);  1365
            return result;
        },
        encodePCM: function () { 
            var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits); //只能缩小，不能放大
            var bytes = this.compress();  // 仍返回的是float32数组
            var dataLength = bytes.length * (sampleBits / 8); // 8采样数位只要一个字节，16位需要两个字节

            
            var buffer = new ArrayBuffer(dataLength);
            var data = new DataView(buffer);

            var offset = 0;
            if (sampleBits === 8) {
                for (var i = 0; i < bytes.length; i++, offset++) {                   
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    //负数*128，正数*127，然后整体向上平移128(+128)，即可得到[0,255]范围的数据。
                    var val = s < 0 ? s * 128 : s * 127;
                    val = parseInt(val + 128);
                    data.setInt8(offset, val, true);
                }
            }else { // 16位                     
                for (var i = 0; i < bytes.length; i++, offset += 2) {
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            }

            return new Blob([data]);
        },
        writeString: function(view, offset, string) {
            for (var i = 0; i < string.length; i += 1) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
        },
        encodeWave: function () { 
            var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits); //只能缩小，不能放大
            var bytes = this.compress();  // 仍返回的是float32数组
            var dataLength = bytes.length * (sampleBits / 8); // 8采样数位只要一个字节，16位需要两个字节
            
            var buffer = new ArrayBuffer(44 + dataLength);
            var data = new DataView(buffer);
            var offset = 0;

            this.writeString(data, offset, 'RIFF'); offset += 4; //ChunkID, 4 bytes,  资源交换文件标识符            
            data.setUint32(offset, 36 + dataLength, true); offset += 4; //ChunkSize, 4 bytes, 下个地址开始到文件尾总字节数,即文件大小-8            
            this.writeString(data, offset, 'WAVE'); offset += 4; //Format, 4 bytes, WAV文件标志            
            this.writeString(data, offset, 'fmt '); offset += 4; //Subchunk1 ID, 4 bytes, 波形格式标志            
            data.setUint32(offset, 16, true); offset += 4; //Subchunk1 Size, 4 bytes, 过滤字节,一般为 0x10 = 16            
            data.setUint16(offset, 1, true); offset += 2; //Audio Format, 2 bytes, 格式类别 (PCM形式采样数据)            
            data.setUint16(offset, 1, true); offset += 2; //Num Channels, 2 bytes,  通道数            
            data.setUint32(offset, this.outputSampleRate, true); offset += 4; //SampleRate, 4 bytes, 采样率,每秒样本数,表示每个通道的播放速度            
            data.setUint32(offset, this.outputSampleRate * 1 * (sampleBits / 8), true); offset += 4; //ByteRate, 4 bytes, 波形数据传输率 (每秒平均字节数) 通道数×每秒数据位数×每样本数据位/8            
            data.setUint16(offset, 1 * (sampleBits / 8), true); offset += 2; //BlockAlign, 2 bytes, 快数据调整数 采样一次占用字节数 通道数×每样本的数据位数/8            
            data.setUint16(offset, sampleBits, true); offset += 2; //BitsPerSample, 2 bytes, 每样本数据位数             
            this.writeString(data, offset, 'data'); offset += 4; //Subchunk2 ID, 4 bytes, 数据标识符            
            data.setUint32(offset, dataLength, true); offset += 4;  //Subchunk2 Size, 4 bytes, 采样数据总数,即数据总大小-44

            if (sampleBits === 8) {
                for (var i = 0; i < bytes.length; i++, offset++) {                   
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    //负数*128，正数*127，然后整体向上平移128(+128)，即可得到[0,255]范围的数据。
                    var val = s < 0 ? s * 128 : s * 127;
                    val = parseInt(val + 128);
                    data.setInt8(offset, val, true);
                }
            }else { // 16位                     
                for (var i = 0; i < bytes.length; i++, offset += 2) {
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            }

            return new Blob([data], { type: 'audio/wav' });
        }
    };

    var sendData = function () { //对以获取的数据进行处理(分包)  // 2730
        var reader = new FileReader();
        reader.onload = function(e) {
            var outbuffer = e.target.result;
            var arr = new Int8Array(outbuffer);
            if (arr.length > 0) {
                var tmparr = new Int8Array(1024);
                var j = 0;
                for (var i = 0; i < arr.byteLength; i++) {
                    tmparr[j++] = arr[i];
                    if (((i + 1) % 1024) == 0) {  // 凑够了一页
                        ws.send(tmparr);
                        if (arr.byteLength - i - 1 >= 1024) { //还余下一页多
                            tmparr = new Int8Array(1024);
                        } else {                               // 还余不到一页
                            tmparr = new Int8Array(arr.byteLength - i - 1);
                        }
                        j = 0;
                    }
                    if ((i + 1 == arr.byteLength) && ((i + 1) % 1024) != 0) {  // 已经到最后了
                        ws.send(tmparr);
                    }                    
                }
            //console.log("PCM data to server:",arr.length);   2730
            }
        };
        reader.readAsArrayBuffer(audioData.encodePCM());
        audioData.clear();//每次发送完成则清理掉旧数据
    };

    

    this.stop = function () {

        recorder.disconnect();            
        
    }

    this.stopTest = function () {

        recorder.disconnect();            
        
        return audioData.encodeWave();
       
    }


    this.setProcess = function (test) {
        if(test){
            recorder.onaudioprocess = function (e) {        
                var inputBuffer = e.inputBuffer.getChannelData(0);  // 第0个声道
                audioData.input(inputBuffer);                
            }
        }else{
            recorder.onaudioprocess = function (e) {        
                var inputBuffer = e.inputBuffer.getChannelData(0);  // 第0个声道
                audioData.input(inputBuffer);                
                sendData();
            }
        }
    }

    this.start = function () {
        this.setProcess(false);
        audioInput.connect(recorder);
        recorder.connect(context.destination);
    }

    this.startTest = function () {
        this.setProcess(true);
        audioData.clear();   
        audioInput.connect(recorder);
        recorder.connect(context.destination);
    }
}


/*
* WebSocket ，，未考虑重连
*/
function useWebSocket() {
    ws = new WebSocket(socketUrl + user.channelId);
    ws.binaryType = 'arraybuffer'; //传输的是 ArrayBuffer 类型的数据
    ws.onopen = function () {
        console.log('握手成功');
        if (ws.readyState == 1) { //ws进入连接状态，则每隔500毫秒发送一包数据
            record.start();
        }
    };

    ws.onmessage = function (msg) {
        console.info(msg)
    }

    ws.onerror = function (err) {
        console.info(err)
    }
    ws.onclose = function () {
        record.stop();
        console.info("socket onclose");
    }
}



