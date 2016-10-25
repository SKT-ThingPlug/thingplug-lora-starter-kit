/*
 ThingPlug StarterKit for LoRa version 0.1
 
 Copyright © 2016 IoT Tech. Lab of SK Telecom All rights reserved.

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	http://www.apache.org/licenses/LICENSE-2.0
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

*/

'use strict';

var colors = require('colors');
var parseString = require('xml2js').parseString;


//--------------------------------------------------------Connection Declaration-----------------------------------------------//
var config = require('./config_2');
var httpReq = require('./promise-http').request;
var httpRes = require('http');

console.log(colors.green('### ThingPlug virtual Device###'));
if(typeof config == 'undefined') {
  return console.log(colors.red('if no config_#.js, please check README.md and check optionData in config file'));
}
//=============================================================================================================================//


//-------------------------------------------------------Virtual Sensor Data---------------------------------------------------//
var IntervalFunction;
//=============================================================================================================================//

//-----------------------------------------------randomInt Function for Create Request ID--------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//


//-----------------------------------HTTP client Server to get mgmtCmd PUSH Message-----------------------------------------//
httpRes.createServer(function (req, res) {

    console.log(colors.green('mgmtCmd PUSH Message'));  
	req.on('data', function (chunk) {
		parseString( chunk, function(err, xmlObj){
			if(!err){
				
				try{
					console.log('RI : '+xmlObj['m2m:exin']['ri'][0]);		//Resource ID (ex : EI000000000000000)
					console.log('CMT : '+xmlObj['m2m:exin']['cmt'][0]);		//Type
					console.log('EXRA : '+xmlObj['m2m:exin']['exra'][0]);	//command Type
					
					var req = JSON.parse(xmlObj['m2m:exin']['exra'][0]);
					var cmt = xmlObj['m2m:exin']['cmt'][0];	
					processCMD(req, cmt);
					var ei = xmlObj['m2m:exin']['ri'][0];
					updateExecInstance(ei, cmt);							//Update mgmtCmd Execute Result - updateExecInstance
				}
				catch(e){
					console.error(chunk);
					console.error(e);
				}
				
			}
		});
	});
 	
  res.setHeader("Content-Type", "application/vnd.onem2m-res+xml");
  res.writeHead(200);
  res.end('');
}).listen(config.responsePORT);


function processCMD(req, cmt){
	if(cmt=='DevReset'){						//mgmtCmd DevReset
		config.BASE_TEMP = 40;		
	}
	else if(cmt=='extDevMgmt'){					//mgmtCmd extDevMgmt
		console.log("commamd Type : " + cmt);
		console.log("commamd : " + req.cmd);
	}
	else{
		console.log('Unknown CMD');
	}
}
//=============================================================================================================================//


//---------------------------------------------------1. Request node Creation--------------------------------------------------//
httpReq({ 
  options: {
	  host: config.TPhost,
      port: config.TPport,
      path : '/'+config.AppEUI+'/'+config.version,
    method: 'POST',
    headers : {
      'X-M2M-Origin': config.nodeID,								// X-M2M-Origin header value shall be specified by the composer of the request(originator)
      'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),		// X-M2M-RI header shall be mapped to the Request Identifier parameter
      'X-M2M-NM': config.nodeID,           							// X-M2M-NM header shall be mapped to the Name parameter
      'Accept': 'application/json',									// Originator may use the Accept header to indicate which content-type is supported. 
      'Content-Type': 'application/json;ty=14', 					// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
    }
  },
  body : {nod : 
  {ni : config.nodeID,											// LTID
   mga :  'HTTP|' + config.responseAddress						// mgmtCmd Address to get mgmtCmd
  }}

//=============================================================================================================================//

//---------------------------------------------------1. node Creation Response--------------------------------------------------//
}).then(function(result){
  console.log(colors.green('1. node Creation Response'));
  if(result.statusCode == 409){
    console.log('Already exists node.');
  }
  config.nodeRI = JSON.parse(result.data).nod.ri;	//Resource ID of node
  console.log(colors.yellow('Created node Resource ID : ') + config.nodeRI);
//=============================================================================================================================//    

//---------------------------------------------------2. Request remoteCSE Creation--------------------------------------------------//
  return httpReq({ 
    options: {
	  host: config.TPhost,
      port: config.TPport,
      path : '/'+config.AppEUI+'/'+config.version,												
      method: 'POST',
      headers : {	
        'X-M2M-Origin': config.nodeID,									// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),		// X-M2M-RI header shall be mapped to the Request Identifier parameter
        'X-M2M-NM': config.nodeID,										// X-M2M-NM header shall be mapped to the Name parameter
        'passCode': config.passCode,										
        'Accept': 'application/json',									// Originator may use the Accept header to indicate which content-type is supported. 
        'Content-Type': 'application/json;ty=16'						// containing Req message-body shall include the Content-type header set to one  (ty == 16 is remoteCSE)
      }
    },
    body : {csr : {
    cst : 3, 										// CSE Type (IN-CSE = 1, MN-CSE = 2, ASN-CSE = 3) (cseType == cst)
    csi : config.nodeID, 							// CSE-ID
    rr : true, 										// Request Reachability, set true when poa has static IP
    nl : config.nodeRI								// <node> Resource ID (nl == nodelink)
  }}
  });
//=============================================================================================================================//

//---------------------------------------------------2. remoteCSE Creation Response--------------------------------------------------//
}).then(function(result){
  console.log(colors.green('2. remoteCSE Creation Response'));
  if(result.statusCode == 409){
    console.log('Already exists remoteCSE');
  }
  if(result.headers.dkey){
    console.log('dKey : '+ result.headers.dkey);								// Get dKey when remoteCSE created 
    console.log('content-location: '+ result.headers['content-location']);		// Created Resource's URI
    config.dKey= result.headers.dkey;
  }
//=============================================================================================================================//   
}).then(function(result){

//---------------------------------------------------3. Request container Creation--------------------------------------------------//
  return httpReq({ 
    options: {
	  host: config.TPhost,
      port: config.TPport,												
      path : '/'+config.AppEUI+'/'+config.version+'/remoteCSE-'+ config.nodeID,				
      method: 'POST',
      headers : {
        'X-M2M-Origin': config.nodeID,									// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),		// X-M2M-RI header shall be mapped to the Request Identifier parameter
        'X-M2M-NM': config.containerName,								// X-M2M-NM header shall be mapped to the Name parameter
        'dkey' : config.dKey,											// device Key (Get device Key when remoteCSE created)
        'Accept': 'application/json',									// Originator may use the Accept header to indicate which content-type is supported. 
        'Content-Type': 'application/json;ty=3'							// containing Req message-body shall include the Content-type header set to one  (ty == 3 is container)
      }
    },
    body : {cnt:{
    containerType : 'heartbeat',
    heartbeatPeriod : 300
  }}
  });
//=============================================================================================================================//

//---------------------------------------------------3. container Creation Response--------------------------------------------------//
}).then(function(result){
  console.log(colors.green('3. container Creation Response'));
  if(result.statusCode == 409){
    console.log('Already exists container');
  }
  console.log('content-location: '+ result.headers['content-location']);		// Created Resource's URI
//=============================================================================================================================//
     
//---------------------------------------------------4. Request DevReset(mgmtCmd) Creation--------------------------------------------------//
  return httpReq({
    options: {
	  host: config.TPhost,
      port: config.TPport,
      path : '/'+config.AppEUI+'/'+config.version,	
      method: 'POST',
      headers : {
        'Accept': 'application/json',										// Originator may use the Accept header to indicate which content-type is supported. 
        dkey : config.dKey,													// Get dKey when remoteCSE created
        'X-M2M-Origin': config.nodeID,										// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),			// X-M2M-RI header shall be mapped to the Request Identifier parameter
        'X-M2M-NM': config.nodeID+'_'+config.DevReset,						// X-M2M-NM header shall be mapped to the Name parameter - Device Reset
        'Content-Type': 'application/json;ty=12'							// containing Req message-body shall include the Content-type header set to one (ty == 12 is mgmtCmd)
      }
    },
    body: {mgc:{
    cmt : config.DevReset,   					// command Type
    exe : true,             					// Trigger Attribute (true/false) (exe == execEnable)
    ext : config.nodeRI     					// execute Target means node's Resource ID (ext == exeTarget)
  }}
  });
//=============================================================================================================================//

//---------------------------------------------------4. DevReset(mgmtCmd Creation Response--------------------------------------------------//
}).then(function(result){
  console.log(colors.green('4. DevReset(mgmtCmd) Creation Response'));	
  if(result.statusCode == 409){
    console.log('Already exists DevReset');
  }
  console.log('content-location: '+ result.headers['content-location']);		// Created Resource's URI
//=============================================================================================================================//
 
//---------------------------------------------------4. Request extDevMgmt(mgmtCmd) Creation--------------------------------------------------//
  return httpReq({
    options: {
	  host: config.TPhost,
      port: config.TPport,
      path : '/'+config.AppEUI+'/'+config.version,	
      method: 'POST',
      headers : {
        'Accept': 'application/json',											// Originator may use the Accept header to indicate which content-type is supported. 
        dkey : config.dKey,														// Get dKey when remoteCSE created
        'X-M2M-Origin': config.nodeID,											// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),				// X-M2M-RI header shall be mapped to the Request Identifier parameter
        'X-M2M-NM': config.nodeID+'_'+config.extDevMgmt,						// X-M2M-NM header shall be mapped to the Name parameter - external Device mgmtCmd
        'Content-Type': 'application/json;ty=12'								// containing Req message-body shall include the Content-type header set to one (ty == 12 is mgmtCmd)
      }
    },
    body: {mgc:{
    cmt : config.extDevMgmt,   					// command Type
    exe : true,             					// Trigger Attribute (true/false) (exe == execEnable)
    ext : config.nodeRI     					// execute Target means node's Resource ID (ext == exeTarget)
  }}
  
 });
//=============================================================================================================================//

//---------------------------------------------------4.  extDevMgmt(mgmtCmd) Creation Response--------------------------------------------------//
  }).then(function(result){
console.log(colors.green('4. extDevMgmt(mgmtCmd) Creation Response'));	
  if(result.statusCode == 409){
    console.log('Already exists extDevMgmt');
  }
  console.log('content-location: '+ result.headers['content-location']);		// Created Resource's URI
  
  if(result.headers){
    console.log(colors.yellow('5. Request ContentInstance Creation for Sensor Data'));
	IntervalFunction = setInterval(IntervalProcess, config.UPDATE_CONTENT_INTERVAL);
  }

//=============================================================================================================================//


}).catch(function(err){
  console.log(err);
});

//---------------------------------------------------5. Request contentInstance Creation--------------------------------------------------//
 function IntervalProcess(){
    httpReq({ 
      options : {
		host: config.TPhost,
        port: config.TPport,
        path : '/'+config.AppEUI+'/'+config.version+'/remoteCSE-'+ config.nodeID+ '/container-'+config.containerName,		
        method: 'POST',
        headers : {
          'Accept': 'application/json',											// Originator may use the Accept header to indicate which content-type is supported. 
          'X-M2M-Origin': config.nodeID,										// X-M2M-Origin header value shall be specified by the composer of the request(originator)
		  'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),				// X-M2M-RI header shall be mapped to the Request Identifier parameter
          'Content-Type': 'application/json;ty=4',								// containing Req message-body shall include the Content-type header set to one (ty == 4 is contentInstance)
		  dkey : config.dKey,													// Get dKey when remoteCSE created
        
        }
      },
      body : {cin:{
		cnf : 'text', 							// uploaded content's type info (cnf = contentInfo)
		con : config.contents()					// uploaded contents (con == content)
		}}
//=============================================================================================================================//

//---------------------------------------------------5. contentInstance Creation Response--------------------------------------------------//
    }).then(function(result){
		
      var data = JSON.parse(result.data);
      console.log('content : ' + data.cin.con + ', resourceID : '+data.cin.ri); //uploaded content's info data (con, ri)
    }).catch(function(err){
		console.log(colors.red('#####################################'));
      console.log(err);
    });
      
    }
//=============================================================================================================================//

//---------------------------------------------------6. updateExecInstance Request--------------------------------------------------//
function updateExecInstance(ei, mgmtCmdprefix){
  httpReq({
    options: {
		host: config.TPhost,
        port: config.TPport,
      path : '/'+config.AppEUI+'/'+config.version+'/mgmtCmd-'+mgmtCmdprefix+'/execInstance-'+ei,
      method: 'PUT',
      headers : {
        'Accept': 'application/json',										// Originator may use the Accept header to indicate which content-type is supported. 
        dKey : config.dKey,													// Get dKey when remoteCSE created
        'X-M2M-Origin': config.nodeID,										// X-M2M-Origin header value shall be specified by the composer of the request(originator)
        'X-M2M-RI': config.nodeID+'_'+randomInt(100000, 999999),			// X-M2M-RI header shall be mapped to the Request Identifier parameter
        'Content-Type': 'application/json'									// containing Req message-body shall include the Content-type header set to one  ty == 4은 생성하고자 하는 contentInstance 자원을 의미함
      }
    },
    body : {
		exin : {
			exs : 3,														// execStatus after update mgmtCmd
			exr : 0
		}
	}
//=============================================================================================================================//

//----------------------------------------- 6. updateExecInstance Respon--------------------------------//
  }).then(function(result){
    var data = JSON.parse(result.data);
    console.log('resouceId : ' + data.ri);
    console.log('execStatus : ' + data.exs);
    console.log(colors.red('#####################################'));
  }).catch(function(err){
    console.log(err);
  });
}
//=============================================================================================================================//
