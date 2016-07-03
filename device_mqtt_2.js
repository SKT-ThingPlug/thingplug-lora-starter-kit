'use strict';

var colors = require('colors');
var xml2js = require('xml2js');
var async = require('async');

var util = require('util');
var mqtt = require('mqtt');

//---------------------------------------------------------Connection 설정-----------------------------------------------------//
var config = require('./config_2');
console.log(colors.green('### ThingPlug - LoRa virtual Device###'));
if(typeof config === 'undefined') {
  return console.log(colors.red('먼저 config.js를 열어 optionData를 설정하세요. README.md에 Starterkit 실행 방법이 설명되어 있습니다.'));
}

console.log(colors.green('0. 제어 명령 수신 MQTT 연결'));
MQTTClient();
//=============================================================================================================================//


//-----------------------------------------------------Virtual Sensor Data-----------------------------------------------------//
var IntervalFunction;
var UPDATE_CONTENT_INTERVAL = 1000;
var BASE_TEMP = 40;
var BASE_HUMID = 70;
var BASE_LUX = 90;
//=============================================================================================================================//

//--------------------------------------------Request ID를 생성하기 위한 RandomInt Function------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//


function MQTTClient(){

  
  var self = this;
  
  var isRunning = 1;
  var getStatus = function(){return this.isRunning;}
  
  var client = mqtt.connect('mqtt://'+config.TPhost, {
	username:config.userID,			//MQTT broker로 접속을 위한 ID
	password:config.uKey,			//MQTT broker로 접속을 위한 password
	clientId:config.mqttClientId,	//MQTT Client ID
	clean:true						//clean session
  });
	client.on('connect', function () {
		console.log('### mqtt connected ###');
//----------------------------------------------------------Subscribe 설정-----------------------------------------------------//
		client.subscribe("/oneM2M/req/+/"+ config.nodeID);		
		client.subscribe("/oneM2M/resp/"+ config.nodeID +"/+");
//=============================================================================================================================//


//----------------------------------------------------------1. node 생성 요청--------------------------------------------------//
		var createNode = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"</to><fr>"+config.nodeID+"</fr><ty>14</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><nm>"+config.nodeID+"</nm><cty>application/vnd.onem2m-prsp+xml</cty><pc><nod><ni>"+config.nodeID+"</ni><mga>MQTT|"+config.nodeID+"</mga></nod></pc></m2m:req>";
		client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createNode, {qos : 1}, function(){
			console.log(colors.blue('1. node 생성 요청'));
			isRunning = "node";
		});
//=============================================================================================================================//		
	});
	
  client.on('close', function(){
		console.log('### mqtt disconnected ###');
  });
  
	client.on('error', function(error){
    self.emit('error', error);
  });

	client.on('message', function(topic, message){			//mqtt subscribe message 수신
		if("ContentInstance"!=isRunning){
		console.log(' ');
		}
		var msgs = message.toString().split(',');
	  
		  xml2js.parseString( msgs, function(err, xmlObj){
			if(!err){
//-------------------------------------------------------1. node 생성 subscribe------------------------------------------------//
				if("node"==isRunning){
					console.log(colors.green('1. node 생성 결과'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 node 입니다.'));
					}
					console.log("생성 node Resource ID : "+xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0]);//
					config.nodeRI = xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0];

					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
//=============================================================================================================================//

//-------------------------------------------------2. remoteCSE생성 요청(기기등록)---------------------------------------------//
					var createRemoteCSE = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"</to><fr>"+config.nodeID+"</fr><ty>16</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><passCode>"+config.passCode+"</passCode><cty>application/vnd.onem2m-prsp+xml</cty><nm>"+config.nodeID+"</nm><pc><csr><cst>3</cst><csi>"+config.nodeID+"</csi><rr>true</rr><nl>"+config.nodeRI+"</nl></csr></pc></m2m:req>";
					client.publish("/oneM2M/req/"+ config.nodeID + "/"+config.AppEUI, createRemoteCSE, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.blue('2. remoceCSE 생성 요청'));
						isRunning = "remoteCSE";
					});
				}
//=============================================================================================================================//

//----------------------------------------2. remoteCSE생성 요청(기기등록) subscribe--------------------------------------------//	
				else if("remoteCSE"==isRunning){
					console.log(colors.green('2. remoteCSE 생성 결과'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 remoteCSE 입니다.'));
					}
					console.log("디바이스 키 : "+xmlObj['m2m:rsp']['dKey'][0]);//
					config.dKey = xmlObj['m2m:rsp']['dKey'][0];
					
					
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
//=============================================================================================================================//

//---------------------------------------------------3. container 생성 요청----------------------------------------------------//	
					var createContainer = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"</to><fr>"+config.nodeID+"</fr><ty>3</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><nm>"+config.containerName+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><cnt><lbl>con</lbl></cnt></pc></m2m:req>";
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createContainer, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.blue('3. container 생성 요청'));
						isRunning = "container";
					});
				}
//=============================================================================================================================//

//--------------------------------------------3. container 생성 요청 subscribe-------------------------------------------------//
				else if("container"==isRunning){
					console.log(colors.green('3. container 생성 결과'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 container 입니다.'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/remoteCSE-' + config.nodeID + '/' + isRunning + '-' + config.containerName);
//=============================================================================================================================//

//---------------------------4. 장치 제어를 위한 device mgmtCmd DevReset 리소스 생성 요청--------------------------------------//
					var createDevReset = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><nm>"+config.nodeID+"_"+config.DevReset+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.DevReset+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createDevReset, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.blue('4. DevReset 생성 요청'));
						isRunning = "DevReset";
					});
				}
//=============================================================================================================================//

//---------------------4. 장치 제어를 위한 device mgmtCmd DevReset 리소스 생성 요청 subscribe----------------------------------//
				else if("DevReset"==isRunning){
					console.log(colors.green('4. mgmtCmd 생성 결과'));	
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 DevReset 입니다.'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
//=============================================================================================================================//

//---------------------------4. 장치 제어를 위한 device mgmtCmd RepImmediate 리소스 생성 요청----------------------------------//
					var createRepImmediate = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><nm>"+config.nodeID+"_"+config.RepImmediate+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.RepImmediate+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createRepImmediate, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.blue('4. RepImmediate 생성 요청'));
						isRunning = "RepImmediate";
					});
				}
//=============================================================================================================================//

//---------------------4. 장치 제어를 위한 device mgmtCmd RepImmediate 리소스 생성 요청 subscribe------------------------------//
				else if("RepImmediate"==isRunning){
					console.log(colors.green('4. mgmtCmd 생성 결과'));	
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 RepImmediate 입니다.'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
//=============================================================================================================================//

//---------------------------4. 장치 제어를 위한 device mgmtCmd RepPerChange 리소스 생성 요청----------------------------------//
					var createRepPerChange = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><nm>"+config.nodeID+"_"+config.RepPerChange+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.RepPerChange+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createRepPerChange, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.blue('4. RepPerChange 생성 요청'));
						isRunning = "RepPerChange";
					});
				}
//=============================================================================================================================//

//---------------------4. 장치 제어를 위한 device mgmtCmd RepPerChange 리소스 생성 요청 subscribe------------------------------//
				else if("RepPerChange"==isRunning){
					console.log(colors.green('4. mgmtCmd 생성 결과'));	
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('이미 생성된 RepPerChange 입니다.'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
//=============================================================================================================================//

//------------------------------5. 센서 데이터 전송을 위한 ContentInstance 리소스 생성 요청------------------------------------//					
					console.log(' ');
					console.log(colors.blue('5. ContentInstance 생성 요청'));
					IntervalFunction = setInterval(IntervalProcess, UPDATE_CONTENT_INTERVAL);
					isRunning = "ContentInstance";
				}
//=============================================================================================================================//
	
				else if("ContentInstance"==isRunning){
						try{
//----------------------------------------------------mgmtCmd요청 처리 부분----------------------------------------------------//
							if(xmlObj['m2m:req']){//mgmtCmd Request
								console.log(colors.red('#####################################'));
								console.log(colors.red('MQTT 수신'));
								console.log('RI : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0]);		//Resource ID 출력, (ex : EI000000000000000)
								console.log('CMT : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0]);		//Type
								console.log('EXRA : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);	//CMD 출력
								
								var req = JSON.parse(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
								var cmt = xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0];
								
								processCMD(req, cmt);
//=============================================================================================================================//

//----------------------------------------- 6. mgmtCmd 수행 결과 전달 updateExecInstance---------------------------------------//
								var ri = xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0];
								var updateExecInstance = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>3</op><to>"+"/"+config.AppEUI+"/"+config.version+"/mgmtCmd-"+config.nodeID+"_"+cmt+"/execInstance-"+ri+"</to><fr>"+config.nodeID+"</fr><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><exin><exs>3</exs><exr>0</exr></exin></pc></m2m:req>";
								client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, updateExecInstance, {qos : 1}, function(){
									console.log(colors.red('#####################################'));
									isRunning = "updateExecInstance";
								});
//=============================================================================================================================//
							}
//-------------------------5. 센서 데이터 전송을 위한 ContentInstance 리소스 생성 요청 subscribe-------------------------------//	
							else if(xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ty'][0] == 4){
								console.log(colors.white('content : ' + xmlObj['m2m:rsp']['pc'][0]['cin'][0]['con'][0] + ', resourceID : '+ xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ri'][0]));		
							}
//=============================================================================================================================//
						}
						catch(e){
							console.error(colors.yellow(msgs));
							console.error(e);
						}
				}
//----------------------------------------- 6. mgmtCmd 수행 결과 전달 updateExecInstance---------------------------------------//
				else if("updateExecInstance"==isRunning){
					isRunning = "ContentInstance";
				}
//=============================================================================================================================//
			}
      });
		
  });     

//--------------------------------------------------ContentInstance publish----------------------------------------------------//  
 function IntervalProcess(){

	 //Create Random Virtual Value
      var value_TEMP = Math.floor(Math.random() * 5) + BASE_TEMP;
	  var value_HUMID = Math.floor(Math.random() * 5) + BASE_HUMID;
	  var value_LUX = Math.floor(Math.random() * 5) + BASE_LUX;
	  
	  var createContentInstance = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"/container-"+config.containerName+"</to><fr>"+config.nodeID+"</fr><ty>4</ty><ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri><cty>application/vnd.onem2m-prsp+xml</cty> <dKey>"+config.dKey+"</dKey><pc><cin><cnf>text</cnf><con>"+value_TEMP.toString()+","+value_HUMID.toString()+","+value_LUX.toString()+"</con></cin></pc></m2m:req>";
	  client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createContentInstance, {qos : 1}, function(){
		});
    }
//=============================================================================================================================//


//----------------------------------------------------mgmtCmd요청 처리 부분----------------------------------------------------//
function processCMD(req, cmt){
	if(cmt=='RepImmediate'){
		BASE_TEMP = 10;
	}
	else if(cmt=='RepPerChange'){
		UPDATE_CONTENT_INTERVAL = req.cmd*1000;
		console.log('UPDATE_CONTENT_INTERVAL: ' + UPDATE_CONTENT_INTERVAL);
		clearInterval(IntervalFunction);
		IntervalFunction = setInterval(IntervalProcess, UPDATE_CONTENT_INTERVAL);
	}
	else if(cmt=='DevReset'){
		BASE_TEMP = 30;		
	}
	else{
		console.log('Unknown CMD');
	}
}
//=============================================================================================================================//
 
  

};