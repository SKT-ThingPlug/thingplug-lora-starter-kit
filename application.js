'use strict';
var colors = require('colors');
var async = require('async');

var config = require('./config_1');

var cmt = process.argv[2];
var cmd = process.argv[3];

var httpReq = require('./promise-http').request;

if(cmt != null && cmd != null){
	reqMgmtCmd(cmt, "{\"cmd\":\""+cmd+"\"}", config.nodeRI, function(err, data){
	  console.log("{\"cmd\":\""+cmd+"\"}");
	  console.log("{\"cmt\":\""+cmt+"\"}");
	  console.log(colors.green("======================"));
	  });
}

setInterval( function(){
	getLatestContainer(function(err, data){
		console.log('content : ' + data.cin.con);
		console.log('resouceId : ' + data.cin.ri);
		console.log('생성일 : '+ data.cin.ct);
	});
  },1000);

//////////////

//=============================================================================================================================//



//--------------------------------------------Request ID를 생성하기 위한 RandomInt Function------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//


//-------------------------------- 1. Container에 저장된 최신 값 조회(Retrieve)----------------------------------------//
function getLatestContainer(cb){
httpReq({ 
  options: {
    host : config.TPhost,
    port : config.TPport,
    path : '/'+config.AppEUI+'/'+config.version+'/remoteCSE-'+ config.nodeID+ '/container-'+config.containerName+'/latest',
    method: 'GET',
    headers : {
      Accept: 'application/json',
      locale: 'ko',
      uKey : config.uKey,
      'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),
      'X-M2M-Origin': config.nodeID
    }
  }
}).then(function(result){
  if(result.data){
		var data = JSON.parse(result.data);
		return cb(null, data);
  }
});
}

//=============================================================================================================================//

//---------------------------------------------------- 2. mgmCmd 요청----------------------------------------------------------//

function reqMgmtCmd(mgmtCmdPrefix, cmd, nodeRI, cb){
// 2. mgmCmd 요청
httpReq({ 
    options: {
      host : config.TPhost,
      port : config.TPport,
      path : '/'+config.AppEUI+'/'+config.version+'/mgmtCmd-'+config.nodeID + '_' + mgmtCmdPrefix,
      method: 'PUT',
      headers : {
        Accept: 'application/json',
        uKey : config.uKey,
        'X-M2M-Origin': config.nodeID,
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),
		'Content-Type': 'application/json;ty=8'
	  }
      },
		body : {mgc:{
    exra : cmd,			//제어 요청(일반적으로 원격 장치를 RPC호출)을 위한 Argument 정의 (exra == execReqArgs)
    exe : true,						//제어 요청 Trigger 속성으로 해당 속성은 (True/False로 표현) (exe == execEnabler)
	cmt : mgmtCmdPrefix,
	ext : nodeRI
  }}
}).then(function(result){
  console.log(colors.green('mgmtCmd 제어 요청'));
  if(result.data){
		var data = JSON.parse(result.data);
		return cb(null, data);
  }
  
});
}
//=============================================================================================================================//
