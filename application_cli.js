'use strict';
var colors = require('colors');
var async = require('async');

var config = require('./config_1');

var cmt = process.argv[2];
var cmd = process.argv[3];

var httpReq = require('./promise-http').request;


//-----------------------------------------------Get cmt & cmd Argument from CLI----------------------------------------------//
if(cmt != null && cmd != null){
	reqMgmtCmd(cmt, "{\"cmd\":\""+cmd+"\"}", function(err, data){
	  console.log("{\"cmd\":\""+cmd+"\"}");
	  console.log("{\"cmt\":\""+cmt+"\"}");
	  console.log(colors.green("======================"));
	  });
}
//=============================================================================================================================//
//-----------------------------------------------Get latest Contents----------------------------------------------//
setInterval( function(){
	getLatestContainer(function(err, data){
		console.log('content : ' + data.cin.con);
		console.log('resouceId : ' + data.cin.ri);
		console.log('Creation Time : '+ data.cin.ct);
	});
  },1000);

//=============================================================================================================================//


//-----------------------------------------------randomInt Function for Create Request ID--------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//

//-------------------------------- 1. GET latest Contents (Retrieve)----------------------------------------//
function getLatestContainer(cb){
httpReq({ 
  options: {
    host : config.TPhost,
    port : config.TPport,
    path : '/'+config.AppEUI+'/'+config.version+'/remoteCSE-'+ config.nodeID+ '/container-'+config.containerName+'/latest',
    method: 'GET',
    headers : {
      Accept: 'application/json',												// Originator may use the Accept header to indicate which content-type is supported. 
      uKey : config.uKey,											// user Token Key from ThingPlug Portal
      'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),		// X-M2M-RI header shall be mapped to the Request Identifier parameter
      'X-M2M-Origin': config.nodeID								// X-M2M-Origin header value shall be specified by the composer of the request(originator)
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

//---------------------------------------------------- 2. Request mgmtCmd(PUSH MESSAGE)----------------------------------------------------------//
function reqMgmtCmd(mgmtCmdPrefix, cmd, cb){
	httpReq({ 
    options: {
      host : config.TPhost,
      port : config.TPport,
      path : '/'+config.AppEUI+'/'+config.version+'/mgmtCmd-'+config.nodeID + '_' + mgmtCmdPrefix,
      method: 'PUT',
      headers : {
        Accept: 'application/json',									// Originator may use the Accept header to indicate which content-type is supported.
        uKey : config.uKey,											// user Token Key from ThingPlug Portal
        'X-M2M-Origin': config.nodeID,								// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),	// X-M2M-RI header shall be mapped to the Request Identifier parameter
		'Content-Type': 'application/json;ty=8'
	  }
      },
		body : {mgc:{
    exra : cmd,				// (exra == execReqArgs)
    exe : true,				// Trigger Attribute (true/false) (exe == execEnable)
	cmt : mgmtCmdPrefix		// command Type
  }}
}).then(function(result){
  console.log(colors.green('Request mgmtCmd'));
  if(result.data){
		var data = JSON.parse(result.data);
		return cb(null, data);
  }
  
});
}
//=============================================================================================================================//
