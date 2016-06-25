'use strict';

var colors = require('colors');
var parseString = require('xml2js').parseString;
var httpReq = require('./promise-http').request;

var config = require('./config_2');

console.log(colors.green('### ThingPlug Device###'));
if(typeof config == 'undefined') {
  console.log(colors.red('먼저 config.js를 열어 config를 설정하세요. README.md에 Starterkit 실행 방법이 설명되어 있습니다.'));
  return;
}

// Request ID를 생성하기 위한 RandomInt Function
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}


// 1. node 생성
httpReq({ 
  options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0',
    method: 'POST',
    headers : {
      'X-M2M-Origin': config.nodeID,				//해당 요청 메시지 송신자의 식별자
      'X-M2M-RI': randomInt(100000, 999999),		//해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
      'X-M2M-NM': config.nodeID,           //해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
      'Accept': 'application/json',
      'Content-Type': 'application/json;ty=14', //ty는 생성하고자 하는 Resource Type의 식별자 (ty == 14은 node를 의미함)
    }
  },
  body : {nod : 
  {ni : config.nodeID,
   mga : 'MQTT|'+config.nodeID
  }}
}).then(function(result){
  console.log(colors.green('1. node 생성 결과'));
  if(result.statusCode == 409){
    console.log('이미 생성된 node resource ID 입니다.');
  }
  config.nodeRI = JSON.parse(result.data).nod.ri;
  console.log(colors.yellow('생성 node Resource ID : ') + config.nodeRI);
    
  // 2. remoteCSE생성 요청(기기등록)
  return httpReq({ 
    options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0',													//rty는 생성하고자 하는 Resource Type의 식별자 (rty == 16은 remoteCSE를 의미함)
      method: 'POST',
      headers : {	
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),									//해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': config.nodeID,											//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'passCode': config.passCode,
        'Accept': 'application/json',
        'Content-Type': 'application/json;ty=16'
      }
    },
    body : {csr : {
	cb : 'ThingPlug',
    cst : 3, //등록하는 CSE의 타입 (IN-CSE = 1, MN-CSE = 2, ASN-CSE = 3) (cseType == cst)
    csi : config.nodeID, //등록하는 CSE의 식별자 (CSE-ID == csi)
    //poa : 'MQTT|'+nodeID,//등록하는 CSE의 물리적 접근 식별자 또는 주소 (pointOfAccess == poa)
    rr : true, //등록하는 CSE가 접근하는 한 객체 여부 표기 (requestReachability == rr)
    nl : config.nodeRI
  }}
  });
  
}).then(function(result){
  console.log(colors.green('2. remoteCSE 생성 결과'));
  if(result.statusCode == 409){
    console.log('이미 생성된 remoteCSE 입니다.');
  }
  if(result.headers.dkey){
    console.log('다비이스 키 : '+ result.headers.dkey);
    console.log('content-location: '+ result.headers['content-location']);		//생성된 자원의 URI
    config.dKey= result.headers.dkey;
  }
}).then(function(result){
  // 3. container 생성 요청
  return httpReq({ 
    options: {
	  host: '211.115.15.160',
      port: '9000',												
      path : '/0000000000000001/v1_0/remoteCSE-'+ config.nodeID,				//rty == 3은 생성하고자 하는 container 자원을 의미함
      method: 'POST',
      headers : {
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),									//해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': config.containerName,									//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'dkey' : config.dKey,
        'locale': 'ko',
        'Accept': 'application/json',
        'Content-Type': 'application/json;ty=3'
      }
    },
    body : {cnt:{
    containerType : 'heartbeat',
    heartbeatPeriod : 300
  }}
  });
}).then(function(result){
  console.log(colors.green('3. container 생성 결과'));
  if(result.statusCode == 409){
    console.log('이미 생성된 container 입니다.');
  }
  console.log('content-location: '+ result.headers['content-location']);		//생성된 자원의 URI
  
  
  // 4. 장치 제어를 위한 device mgmtCmd DevReset 리소스 생성
  return httpReq({
    options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0',	
      method: 'POST',
      headers : {
        Accept: 'application/json',
        locale: 'ko',
        dkey : config.dKey,
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),							  //해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': config.nodeID+'_'+config.DevReset,		 							//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'Content-Type': 'application/json;ty=12'
      }
    },
    body: {mgc:{
    cmt : config.cmdType,   //장치 제어 형태 (예, Firmware Update, Memory Check) / (cmt == cmdType)
    exe : true,             //장치 제어를 위한 Trigger Attribute (true/false) / (exe == execEnable))
    ext : config.nodeRI     //제어되는 장치의 식별자로 제어하고자 하는 장치의 node 자원 식별자를 명시함 (ext == exeTarget)
  }}
  });
}).then(function(result){
  console.log(colors.green('4. mgmtCmd 생성 결과'));	
  if(result.statusCode == 409){
    console.log('이미 생성된 mgmtCmd 입니다.');
  }
  console.log('content-location: '+ result.headers['content-location']);		//생성된 자원의 URI
  if(result.headers){
    console.log(colors.green('4. content Instance 주기적 생성 시작'));
  }
  // 4. 장치 제어를 위한 device mgmtCmd RepPerChange 리소스 생성
  return httpReq({
    options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0',	
      method: 'POST',
      headers : {
        Accept: 'application/json',
        locale: 'ko',
        dkey : config.dKey,
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),							  //해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': config.nodeID+'_'+config.RepPerChange,									//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'Content-Type': 'application/json;ty=12'
      }
    },
    body: {mgc:{
    cmt : config.cmdType,   //장치 제어 형태 (예, Firmware Update, Memory Check) / (cmt == cmdType)
    exe : true,             //장치 제어를 위한 Trigger Attribute (true/false) / (exe == execEnable))
    ext : config.nodeRI     //제어되는 장치의 식별자로 제어하고자 하는 장치의 node 자원 식별자를 명시함 (ext == exeTarget)
  }}
  });
}).then(function(result){
  console.log(colors.green('4. mgmtCmd 생성 결과'));	
  if(result.statusCode == 409){
    console.log('이미 생성된 mgmtCmd 입니다.');
  }
  console.log('content-location: '+ result.headers['content-location']);		//생성된 자원의 URI
  if(result.headers){
    console.log(colors.green('4. content Instance 주기적 생성 시작'));
IntervalFunction = setInterval(IntervalProcess, UPDATE_CONTENT_INTERVAL);
  }
  // 4. 장치 제어를 위한 device mgmtCmd RepImmediate 리소스 생성
  return httpReq({
    options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0',	
      method: 'POST',
      headers : {
        Accept: 'application/json',
        locale: 'ko',
        dkey : config.dKey,
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),							  //해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': config.nodeID+'_'+config.RepImmediate,									//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'Content-Type': 'application/json;ty=12'
      }
    },
    body: {mgc:{
    cmt : config.cmdType,   //장치 제어 형태 (예, Firmware Update, Memory Check) / (cmt == cmdType)
    exe : true,             //장치 제어를 위한 Trigger Attribute (true/false) / (exe == execEnable))
    ext : config.nodeRI     //제어되는 장치의 식별자로 제어하고자 하는 장치의 node 자원 식별자를 명시함 (ext == exeTarget)
  }}
<<<<<<< HEAD
  }).then(function(result){
console.log(colors.green('4. mgmtCmd 생성 결과'));	
  if(result.statusCode == 409){
    console.log('이미 생성된 mgmtCmd 입니다.');
  }
  console.log('content-location: '+ result.headers['content-location']);		//생성된 자원의 URI
   console.log(colors.red('#####################################'));
  // 2. create Subscription
  return httpReq({ 
    options: {
	  host: '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0/remoteCSE-'+ config.nodeID + '/container-'+config.containerName,													//rty는 생성하고자 하는 Resource Type의 식별자 (rty == 16은 remoteCSE를 의미함)
      method: 'POST',
      headers : {	
        'X-M2M-Origin': config.nodeID,										//해당 요청 메시지 송신자의 식별자
        'X-M2M-RI': randomInt(100000, 999999),									//해당 요청 메시지에 대한 고유 식별자 (RI == Request ID) / 해당 식별자는 CSE가 자동 생성
        'X-M2M-NM': 'subscription',											//해당 요청으로 생성하게 되는 자원의 이름 (NM == Name)
        'uKey' : config.uKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json;ty=23'
      }
    },
    body : {sub : {
		enc : {
			rss:1,
		},
		nu : 'http://110.8.21.71:8080/push',
		nct : 2
  }}
  });
  
})
=======
  });
>>>>>>> c61f6c2f4c1098df19cc1f8f7e14c199e4c0a993
}).catch(function(err){
  console.log(err);
});


///////////////



  // HTTP Connect
var httpres = require('http');
<<<<<<< HEAD
=======
console.log('aaa');
>>>>>>> c61f6c2f4c1098df19cc1f8f7e14c199e4c0a993
httpres.createServer(function (req, res) {
	  res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resolve({
          data: chunk
        });
<<<<<<< HEAD
			console.log(colors.green('#####################################'));
=======
			console.log('ccc');
>>>>>>> c61f6c2f4c1098df19cc1f8f7e14c199e4c0a993
      });


}).on('connection', function(socket) {
  socket.setTimeout(100000);
}).listen(8080);
// httpres.createServer(function (req, res) {
// console.log('bbb');
	  // res.setEncoding('utf8');
      // res.on('data', function (chunk) {
        // resolve({
          // data: chunk
        // });
			// console.log('ccc');
      // });
	// console.log('ddd');
	// var msgs = message.toString().split(',');
      // console.log(colors.red('#####################################'));
      // console.log(colors.red('HTTP 수신'));
      // xml2js.parseString( msgs[0], function(err, xmlObj){
        // if(!err){
          // console.log(xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0]);//EI000000000000000
		  // console.log(xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0]);//Type
          // console.log(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);//CMD : 
          // try{
            // var req = JSON.parse(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
			// var cmt = xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0];
          // }
          // catch(e){
            // console.error(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
            // console.error(e);
          // }
          // processCMD(req, cmt);
          // var ei = xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0];
          // updateExecInstance(ei);//TBD. cmd에 맞는 명령 보내기
        // }
      // });
      // console.log(colors.red('#####################################'));

// }).listen();


///////////////
var IntervalFunction;
var UPDATE_CONTENT_INTERVAL = 1000;
var BASE_TEMP = 40;
var BASE_HUMID = 70;
var BASE_LUX = 90;



 function IntervalProcess(){
      var value_TEMP = Math.floor(Math.random() * 5) + BASE_TEMP;
	  var value_HUMID = Math.floor(Math.random() * 5) + BASE_HUMID;
	  var value_LUX = Math.floor(Math.random() * 5) + BASE_LUX;

    var value = value_TEMP.toString()+","+value_HUMID.toString()+","+value_LUX.toString()
    httpReq({ 
      options : {
		host: '211.115.15.160',
        port: '9000',
        path : '/0000000000000001/v1_0/remoteCSE-'+ config.nodeID+ '/container-'+config.containerName,		//rty == 4는 생성하고자 하는 contentInstance 자원을 의미함
        method: 'POST',
        headers : {
          Accept: 'application/json',
          locale: 'ko',
          'X-M2M-Origin': config.nodeID,
          'X-M2M-RI': randomInt(100000, 999999),
          'Content-Type': 'application/json;ty=4',
		   dKey : config.dKey
        }
      },
      body : {cin:{
    cnf : 'text', //업로드 하는 데이터 타입의 정보 (cnf = contentInfo)
    con : value   //업로드 하는 데이터 (con == content)
  }}
    }).then(function(result){
<<<<<<< HEAD
		
      var data = JSON.parse(result.data);
      console.log('content : ' + data.cin.con + ', resourceID : '+data.cin.ri);
    }).catch(function(err){
		console.log(colors.green('#####################################'));
=======
      var data = JSON.parse(result.data);
      console.log('content : ' + data.cin.con + ', resourceID : '+data.cin.ri);
    }).catch(function(err){
>>>>>>> c61f6c2f4c1098df19cc1f8f7e14c199e4c0a993
      console.log(err);
    });
      
    }
//IntervalFunction = setInterval(IntervalProcess, UPDATE_CONTENT_INTERVAL);

function updateExecInstance(ei){
  httpReq({ // ### execInstance Update(PUT) - execStatus 변경됨
    options: {
		host: '211.115.15.160',
        port: '9000',
      path : '/0000000000000001/v1_0/mgmtCmd-'+config.mgmtCmdprefix+'/execInstance-'+ei,
      method: 'PUT',
      headers : {
        Accept: 'application/json',
        dKey : config.dKey,
        'X-M2M-Origin': config.nodeID,
        'X-M2M-RI': randomInt(100000, 999999),
        'Content-Type': 'application/json',
        locale: 'ko'
      }
    },
    body : {}
  }).then(function(result){
    // console.log(colors.red('#####################################'));
    var data = JSON.parse(result.data);
    console.log('처리한 resouceId : ' + data.ri);
    console.log('처리한 결과 execStatus : ' + data.exs);
    console.log(colors.red('#####################################'));
  }).catch(function(err){
    console.log(err);
  });
}