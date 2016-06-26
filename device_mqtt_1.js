'use strict';

var colors = require('colors');
var xml2js = require('xml2js');
var async = require('async');

var config = require('./config_1');

var IntervalFunction;
var UPDATE_CONTENT_INTERVAL = 1000;
var util = require('util');
var mqtt = require('mqtt');

var BASE_TEMP = 30;
var BASE_HUMID = 60;
var BASE_LUX = 80;

var APP_EUI = "/0000000000000001";
var APP_version = "/v1_0";

var mqttServerIP = 'mqtt://211.115.15.160';

console.log(colors.green('### ThingPlug - LoRa virtual Device###'));
if(typeof config === 'undefined') {
  return console.log(colors.red('먼저 config.js를 열어 optionData를 설정하세요. README.md에 Starterkit 실행 방법이 설명되어 있습니다.'));
}

    console.log(colors.green('0. 제어 명령 수신 MQTT 연결'));
	MQTTClient();


function MQTTClient(){

  
  var self = this;
  
  var isRunning = 1;
  var getStatus = function(){return this.isRunning;}
  

  
  var client = mqtt.connect(mqttServerIP, {
	username:'admin02',
	password:'admin02'
  });
	client.on('connect', function () {
		console.log('### mqtt connected ###');
		client.subscribe("/oneM2M/req/+/"+ config.nodeID);		
		client.subscribe("/oneM2M/resp/"+ config.nodeID +"/+");
		
		var createNode = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"</to><fr>"+config.nodeID+"</fr><ty>14</ty><ri>1234</ri><nm>"+config.nodeID+"</nm><cty>application/vnd.onem2m-prsp+xml</cty><pc><nod><ni>"+config.nodeID+"</ni><mga>MQTT|"+config.nodeID+"</mga></nod></pc></m2m:req>";
		client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createNode, false, function(){
			console.log(colors.blue('1. node 생성 요청'));
			isRunning = "node";
		});
		
		
	});
	

  client.on('close', function(){
		console.log('### mqtt disconnected ###');
  });
  
	client.on('error', function(error){
    self.emit('error', error);
  });

	client.on('message', function(topic, message){
		if("ContentInstance"!=isRunning){
		console.log(' ');
	
		console.log(colors.red('#####################################'));
		console.log(colors.red('MQTT 수신'));
		}
		var msgs = message.toString().split(',');

		
	  
		  xml2js.parseString( msgs[0], function(err, xmlObj){
			//if(!err){
				
				//console.log(colors.white('message : '+ msgs));
				
				//console.log('mqttClient.isRunning : '+isRunning);
				if("node"==isRunning){
					console.log("nodeRI : "+xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0]);//
					config.nodeRI = xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0];
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 node 입니다.'));
					}
					var createRemoteCSE = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"</to><fr>"+config.nodeID+"</fr><ty>16</ty><ri>1234</ri><passCode>"+config.passCode+"</passCode><cty>application/vnd.onem2m-prsp+xml</cty><nm>"+config.nodeID+"</nm><pc><csr><cst>3</cst><csi>"+config.nodeID+"</csi><rr>true</rr><nl>"+config.nodeRI+"</nl></csr></pc></m2m:req>";
					console.log('content-location: '+ APP_EUI+ APP_version + '/' + isRunning + '-' + config.nodeID);
					
					isRunning = "remoteCSE";
					client.publish("/oneM2M/req/"+ config.nodeID + APP_EUI, createRemoteCSE, false, function(){
						console.log(' ');
						console.log(colors.blue('2. remoceCSE 생성 요청'));
					});
				}
				else if("remoteCSE"==isRunning){
					console.log("dKey : "+xmlObj['m2m:rsp']['dKey'][0]);//
					config.dKey = xmlObj['m2m:rsp']['dKey'][0];
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 remoteCSE 입니다.'));
					}
					
					var createContainer = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"/remoteCSE-"+config.nodeID+"</to><fr>"+config.nodeID+"</fr><ty>3</ty><ri>1234</ri><nm>"+config.containerName+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><cnt><lbl>con</lbl></cnt></pc></m2m:req>";
					console.log('content-location: '+ APP_EUI+ APP_version + '/' + isRunning + '-' + config.nodeID);
					
					isRunning = "container";
					client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createContainer, false, function(){
						console.log(' ');
						console.log(colors.blue('3. container 생성 요청'));
					});
				}
				else if("container"==isRunning){
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 container 입니다.'));
					}
					var createDevReset = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>1234</ri><nm>"+config.nodeID+"_"+config.DevReset+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.DevReset+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					console.log('content-location: '+ APP_EUI+ APP_version + '/remoteCSE-' + config.nodeID + '/' + isRunning + '-' + config.containerName);
					
					isRunning = "DevReset";
					client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createDevReset, false, function(){
						console.log(' ');
						console.log(colors.blue('4. DevReset 생성 요청'));
					});
				}
				else if("DevReset"==isRunning){
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 DevReset 입니다.'));
					}
					var createRepImmediate = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>1234</ri><nm>"+config.nodeID+"_"+config.RepImmediate+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.RepImmediate+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					console.log('content-location: '+ APP_EUI+ APP_version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
					
					isRunning = "RepImmediate";
					client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createRepImmediate, false, function(){
						console.log(' ');
						console.log(colors.blue('4. RepImmediate 생성 요청'));
					});
				}
				else if("RepImmediate"==isRunning){
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 RepImmediate 입니다.'));
					}
					var createRepPerChange = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"</to><fr>"+config.nodeID+"</fr><ty>12</ty><ri>1234</ri><nm>"+config.nodeID+"_"+config.RepPerChange+"</nm><dKey>"+config.dKey+"</dKey><cty>application/vnd.onem2m-prsp+xml</cty><pc><mgc><cmt>"+config.RepPerChange+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					console.log('content-location: '+ APP_EUI+ APP_version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
					
					isRunning = "RepPerChange";
					client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createRepPerChange, false, function(){
						console.log(' ');
						console.log(colors.blue('4. RepPerChange 생성 요청'));
					});
				}
				else if("RepPerChange"==isRunning){
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.green('이미 생성된 RepPerChange 입니다.'));
					}
					console.log('content-location: '+ APP_EUI+ APP_version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
					
					isRunning = "ContentInstance";
					console.log(' ');
					console.log(colors.blue('5. ContentInstance 생성 요청'));
					IntervalFunction = setInterval(IntervalProcess, UPDATE_CONTENT_INTERVAL);
				}
				else if("ContentInstance"==isRunning){
						xml2js.parseString( msgs, function(err, xmlObj){	
							if(xmlObj['m2m:req']){
								console.log('RI : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0]);//EI000000000000000
								console.log('cmt : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0]);//Type
								console.log('exra : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);//CMD :
								
								var req = JSON.parse(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
								var cmt = xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0];
								
								processCMD(req, cmt);
							}
							else if(xmlObj['m2m:rsp']){
								console.log(colors.white('content : ' + xmlObj['m2m:rsp']['pc'][0]['cin'][0]['con'][0] + ', resourceID : '+ xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ri'][0]));
							}
						});

					}
      });
		
  });     

  
 function IntervalProcess(){

	 
      var value_TEMP = Math.floor(Math.random() * 5) + BASE_TEMP;
	  var value_HUMID = Math.floor(Math.random() * 5) + BASE_HUMID;
	  var value_LUX = Math.floor(Math.random() * 5) + BASE_LUX;
	  
	  var createContentInstance = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\"><op>1</op><to>"+APP_EUI+APP_version+"/remoteCSE-"+config.nodeID+"/container-"+config.containerName+"</to><fr>"+config.nodeID+"</fr><ty>4</ty><ri>1234</ri><cty>application/vnd.onem2m-prsp+xml</cty> <dKey>"+config.dKey+"</dKey><pc><cin><cnf>text</cnf><con>"+value_TEMP.toString()+","+value_HUMID.toString()+","+value_LUX.toString()+"</con></cin></pc></m2m:req>";
	  client.publish("/oneM2M/req/"+ config.nodeID +APP_EUI, createContentInstance, false, function(){
						//console.log(' ');
						//console.log(colors.green('ContentInstance Published'));
						//console.log(colors.green(createContentInstance));
		});
    }

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

 
  

};