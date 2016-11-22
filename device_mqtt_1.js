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
var xml2js = require('xml2js');
var async = require('async');

var util = require('util');
var mqtt = require('mqtt');

//--------------------------------------------------------Connection Declaration-----------------------------------------------//
var config = require('./config_1');
console.log(colors.green('### ThingPlug virtual Device###'));
if(typeof config === 'undefined') {
  return console.log(colors.red('if no config_#.js, please check README.md and check optionData in config file'));
}

console.log(colors.green('0. Connect with MQTT Broker'));

//=============================================================================================================================//


//-----------------------------------------------------Virtual Sensor Data-----------------------------------------------------//
var IntervalFunction;
//=============================================================================================================================//

//-----------------------------------------------randomInt Function for Create Request ID--------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//

var self = this;

var isRunning = 1;
var reqHeader = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\">";

var client = mqtt.connect('mqtt://'+config.TPhost, {
	username:config.userID,			//user ID to connect with MQTT broker
	password:config.uKey,			//password to connect with MQTT broker(uKey of portal)
	clientId:config.mqttClientId(),	//Client ID to connect with MQTT broker
	clean:true						//clean session
});
client.on('connect', function () {
	console.log('### mqtt connected ###');
//---------------------------------------------------Subscribe Declaration-----------------------------------------------------//
	client.subscribe("/oneM2M/req/+/"+ config.mqttClientId());		
	client.subscribe("/oneM2M/resp/"+ config.mqttClientId() +"/+");
//=============================================================================================================================//

	nodeCreationReq ();							//1. Request node Creation
});

client.on('close', function(){
	console.log('### mqtt disconnected ###');
});

client.on('error', function(error){
	console.log(colors.red(error));
	self.emit('error', error);
});

client.on('message', function(topic, message){
	if("ContentInstance"!=isRunning){
	console.log(' ');
	}
	var msgs = message.toString().split(',');
  
	  xml2js.parseString( msgs, function(err, xmlObj){
		if(!err){
			if("node"==isRunning){
				nodeCreationRes(xmlObj);		//1. node Creation Response
				remoteCSECreationReq();			//2. Request remoteCSE Creation
			}
			else if("remoteCSE"==isRunning){
				remoteCSECreationRes(xmlObj);	//2. remoteCSE Creation Response
				containerCreationReq();			//3. Request container Creation
			}
			else if("container"==isRunning){
				containerCreationRes(xmlObj);	//3. container Creation Response
				DevResetCreationReq();			//4-1. Request DevReset(mgmtCmd) Creation
			}
			else if("DevReset"==isRunning){
				DevResetCreationRes(xmlObj);	//4-1. DevReset(mgmtCmd) Creation Response
				extDevMgmtCreationReq();		//4-2. Request extDevMgmt(mgmtCmd) Creation
			}
			else if("extDevMgmt"==isRunning){
				extDevMgmtCreationRes(xmlObj);	//4-2. extDevMgmt(mgmtCmd) Creation Response
				contentInstanceCreationReq ();	//5. Request ContentInstance Creation for Sensor Data	
			}	
			else if("ContentInstance"==isRunning){
					try{
						if(xmlObj['m2m:req']){
							processCMD(xmlObj);				//mgmtCmd PUSH Message Subscribe
							updateExecInstanceReq(xmlObj);	//6. Update mgmtCmd Execute Result - updateExecInstance
						}
						else if(xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ty'][0] == 4){
							contentInstanceCreationRes (xmlObj);	//5. ContentInstance Creation for Sensor Data Response
						}
					}
					catch(e){
						console.error(colors.yellow(msgs));
						console.error(colors.yellow(e));
					}
			}
			else if("updateExecInstance"==isRunning){
				isRunning = "ContentInstance";
			}
		}
  });
	
});     

//----------------------------------Request ContentInstance Creation for virtual Sensor Data---------------------------------------------//  
 function IntervalProcess(){
	  var op = "<op>1</op>";																						// opearation Method, 1 is create
	  var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"/container-"+config.containerName+"</to>";	// destination URI
	  var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	  var ty = "<ty>4</ty>";																						// contents type  (ty 4 is contentsInstance)
	  var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";											// ri header shall be mapped to the Request Identifier parameter
	  var dKey = "<dKey>"+config.dKey+"</dKey>";																	// Get dKey when remoteCSE created
	  var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one
	  var reqBody = "<pc><cin><cnf>text</cnf><con>"+config.contents()+"</con></cin></pc></m2m:req>";
																													// cnf : uploaded content's type info (cnf = contentInfo)
																													// con : uploaded contents (con == content)
	  var createContentInstance = reqHeader+op+to+fr+ty+ri+cty+dKey+reqBody;
	  client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, createContentInstance, {qos : 1}, function(){
					
	  });
    }
//=============================================================================================================================//

//----------------------------------------------------mgmtCmd PUSH Message Subscribe----------------------------------------------------//
function processCMD(xmlObj){
	
	console.log(colors.red('#####################################'));
	console.log(colors.red('MQTT Subscription'));
	console.log('RI : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0]);		//Resource ID, (ex : EI000000000000000)
	console.log('CMT : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0]);		//command Type
	console.log('EXRA : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);	//Execute Argument

	var req = JSON.parse(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
	var cmt = xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0];
	
	if(cmt=='DevReset'){
		config.BASE_TEMP = 30;		
	}
	else if(cmt=='extDevMgmt'){
		console.log("commamd Type : " + cmt);
		console.log("commamd : " + req.cmd);
	}
	else{
		console.log('Unknown CMD');
	}
}
//=============================================================================================================================//

//---------------------------------------------------1. Request node Creation--------------------------------------------------//
function nodeCreationReq (){
		var op = "<op>1</op>";																						// opearation Method, 1 is create
		var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";												// destination URI
		var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
		var ty = "<ty>14</ty>";																						// contents type  (ty 14 is node)
		var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
		var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one
		var nm = "<nm>"+config.nodeID+"</nm>";																		// nm header shall be mapped to the Name parameter
		var reqBody = "<pc><nod><ni>"+config.nodeID+"</ni><mga>MQTT|"+config.mqttClientId()+"</mga></nod></pc></m2m:req>";
																													// ni : LTID
																													// mga : mgmtCmd Address to get mgmtCmd
		var createNode = reqHeader+op+to+fr+ty+ri+cty+nm+reqBody;
		client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, createNode, {qos : 1}, function(){
			console.log(colors.yellow('1. Request node Creation'));
			isRunning = "node";
					
		});
}
//=============================================================================================================================//	

//---------------------------------------------------1. node Creation Response--------------------------------------------------//
function nodeCreationRes (xmlObj){
	console.log(colors.green('1. node Creation Response'));
	if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
		console.log(colors.white('Already exists node'));
	}
	console.log("Created node Resource ID : "+xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0]);						// Resource ID of node
	config.nodeRI = xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0];

	console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
}
//=============================================================================================================================//	

//---------------------------------------------------2. Request remoteCSE Creation--------------------------------------------------//
function remoteCSECreationReq (){
	var op = "<op>1</op>";																						// opearation Method, 1 is create
	var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";												// destination URI
	var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	var ty = "<ty>16</ty>";																						// contents type (ty 16 is remoteCSE)
	var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
	var passCode = "<passCode>"+config.passCode+"</passCode>";													// password to use for reqistering device at portal
	var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
	var nm = "<nm>"+config.nodeID+"</nm>";																		// nm header shall be mapped to the Name parameter																		// nm header shall be mapped to the Name parameter
	var reqBody = "<pc><csr><cst>3</cst><csi>"+config.nodeID+"</csi><rr>false</rr><nl>"+config.nodeRI+"</nl></csr></pc></m2m:req>";
																												// cst : CSE Type (IN-CSE = 1, MN-CSE = 2, ASN-CSE = 3) (cseType == cst)
																												// csi : CSE-ID
																												// rr :  Request Reachability, set true when poa has static IP
																												// nl : <node> Resource ID (nl == nodelink)
																													
	var createRemoteCSE = reqHeader+op+to+fr+ty+ri+passCode+cty+nm+reqBody;
	client.publish("/oneM2M/req/"+ config.mqttClientId() + "/"+config.AppEUI, createRemoteCSE, {qos : 1}, function(){
		console.log(' ');
		console.log(colors.yellow('2. Request remoteCSE Creation '));
		isRunning = "remoteCSE";
	});
}
//=============================================================================================================================//	

//---------------------------------------------------2. remoteCSE Creation Response--------------------------------------------------//
function remoteCSECreationRes (xmlObj){
	console.log(colors.green('2. remoteCSE Creation Response'));
	if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
		console.log(colors.white('Already exists remoteCSE'));
	}
	console.log("dKey : "+xmlObj['m2m:rsp']['dKey'][0]);//														// Get dKey when remoteCSE created 
	config.dKey = xmlObj['m2m:rsp']['dKey'][0];
	
	console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
}
//=============================================================================================================================//	

//---------------------------------------------------3. Request container Creation--------------------------------------------------//
function containerCreationReq (){
	var op = "<op>1</op>";																						// opearation Method, 1 is create
	var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"</to>";					// destination URI
	var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	var ty = "<ty>3</ty>";																						// contents type (ty 3 is container)
	var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
	var nm = "<nm>"+config.containerName+"</nm>";																// nm header shall be mapped to the Name parameter			
	var dKey = "<dKey>"+config.dKey+"</dKey>";																	// Get dKey when remoteCSE created 
	var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
	var reqBody = "<pc><cnt><lbl>con</lbl></cnt></pc></m2m:req>";										
	
	var createContainer = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
	client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, createContainer, {qos : 1}, function(){
		console.log(' ');
		console.log(colors.yellow('3. Request container Creation'));
		isRunning = "container";
	});
}
//=============================================================================================================================//	

//---------------------------------------------------3. container Creation Response--------------------------------------------------//
function containerCreationRes (xmlObj){
	console.log(colors.green('3. container Creation Response'));
	if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
		console.log(colors.white('Already exists container'));
	}
	console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/remoteCSE-' + config.nodeID + '/' + isRunning + '-' + config.containerName);
}
//=============================================================================================================================//	

//---------------------------------------------------4. Request DevReset(mgmtCmd) Creation--------------------------------------------------//
function DevResetCreationReq (){
	var op = "<op>1</op>";																						// opearation Method, 1 is create
	var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";												// destination URI
	var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	var ty = "<ty>12</ty>";																						// contents type (ty 12 is mgmtCmd)
	var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
	var nm = "<nm>"+config.nodeID+"_"+config.DevReset+"</nm>";													// nm header shall be mapped to the Name parameter		
	var dKey = "<dKey>"+config.dKey+"</dKey>";																	// Get dKey when remoteCSE created 
	var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
	var reqBody = "<pc><mgc><cmt>"+config.DevReset+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
																												// cmt : command Type
																												// exe : Trigger Attribute (true/false) (exe == execEnable)
																												// ext : execute Target means node's Resource ID (ext == exeTarget)
	var createDevReset = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
	client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, createDevReset, {qos : 1}, function(){
		console.log(' ');
		console.log(colors.yellow('4. Request DevReset(mgmtCmd) Creation'));
		isRunning = "DevReset";
	});
}
//=============================================================================================================================//	

//---------------------------------------------------4.  DevReset(mgmtCmd Creation Response--------------------------------------------------//
function DevResetCreationRes (xmlObj){
	console.log(colors.green('4. DevReset(mgmtCmd) Creation Response'));	
	if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
		console.log(colors.white('Already exists DevReset'));
	}
	console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
}
//=============================================================================================================================//

//---------------------------------------------------4. Request extDevMgmt(mgmtCmd) Creation--------------------------------------------------//
function extDevMgmtCreationReq (){
	var op = "<op>1</op>";																						// opearation Method, 1 is create
	var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";												// destination URI
	var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	var ty = "<ty>12</ty>";																						// contents type (ty 12 is mgmtCmd)
	var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
	var nm = "<nm>"+config.nodeID+"_"+config.extDevMgmt+"</nm>";												// nm header shall be mapped to the Name parameter		
	var dKey = "<dKey>"+config.dKey+"</dKey>";																	// Get dKey when remoteCSE created 
	var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
	var reqBody = "<pc><mgc><cmt>"+config.extDevMgmt+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
																												// cmt : command Type
																												// exe : Trigger Attribute (true/false) (exe == execEnable)
																												// ext : execute Target means node's Resource ID (ext == exeTarget)
	var createRepPerChange = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
	client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, createRepPerChange, {qos : 1}, function(){
		console.log(' ');
		console.log(colors.yellow('4. Request extDevMgmt(mgmtCmd) Creation'));
		isRunning = "extDevMgmt";
	});
}
//=============================================================================================================================//	

//---------------------------------------------------4.  extDevMgmt(mgmtCmd) Creation Response--------------------------------------------------//
function extDevMgmtCreationRes (xmlObj){
	console.log(colors.green('4. extDevMgmt(mgmtCmd) Creation Response'));	
	if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
		console.log(colors.white('Already exists extDevMgmt'));
	}
	console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
}
//=============================================================================================================================//	

//---------------------------------------------------5. Request contentInstance Creation--------------------------------------------------//
function contentInstanceCreationReq (){
	console.log(' ');
	console.log(colors.yellow('5. Request ContentInstance Creation for Sensor Data'));
	IntervalFunction = setInterval(IntervalProcess, config.UPDATE_CONTENT_INTERVAL); // Regular contentInstance Creation
	isRunning = "ContentInstance";
}
//=============================================================================================================================//	

//---------------------------------------------------5. contentInstance Creation Response--------------------------------------------------//
function contentInstanceCreationRes (xmlObj){
	console.log(colors.white('content : ' + xmlObj['m2m:rsp']['pc'][0]['cin'][0]['con'][0] + ', resourceID : '+ xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ri'][0]));	
}
//=============================================================================================================================//

//---------------------------------------------------5. updateExecInstance Request--------------------------------------------------//
function updateExecInstanceReq (xmlObj){
	var exin_ri = xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0];
	
	var op = "<op>3</op>";																						// opearation Method, 3 is update
	var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/mgmtCmd-"+config.nodeID+"_"+cmt+"/execInstance-"+exin_ri+"</to>";	// destination URI
	var fr = "<fr>"+config.nodeID+"</fr>";																		// from header value shall be specified by the composer of the request(originator)
	var ty = "<ty>12</ty>";																						// contents type (ty 12 is mgmtCmd)
	var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";										// ri header shall be mapped to the Request Identifier parameter
	var dKey = "<dKey>"+config.dKey+"</dKey>";																	// Get dKey when remoteCSE created
	var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";														// containing Req message-body shall include the Content-type header set to one (ty == 14 is node)
	var reqBody = "<pc><exin><exs>3</exs><exr>0</exr></exin></pc></m2m:req>";
																												// exs : execStatus after update mgmtCmd
	var updateExecInstance = reqHeader+op+to+fr+ri+dKey+cty+reqBody;
	client.publish("/oneM2M/req/"+ config.mqttClientId() +"/"+config.AppEUI, updateExecInstance, {qos : 1}, function(){
		console.log(colors.red('#####################################'));
		isRunning = "updateExecInstance";
	});
}
//=============================================================================================================================//
