'use strict';

var http = require('http');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var config = [];
var config_h = [];
var configInedex = 0;
var numOfDevice = 2;

var TPhost = '211.115.15.160';
var TPport = '9000';
var AppEUI = '/0000000000000001';
var version = '/v1_0';


var sms = require('./notification/sendsms').request;
var nodemailer = require('./notification/mail').request;

var colors = require('colors');

var Promise = require('es6-promise').Promise;

app.set('port', process.env.PORT || 3000);
app.use('/dashboard', express.static(path.join(__dirname,'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//config 등록
for (var j =0; j < numOfDevice; j++) {
	config.push(require('./config_'+(j+1).toString()));
	config_h.push('/config_'+(j+1).toString());
}

//지도에서 클릭만 node 관련 config return
app.get(config_h, function(req,res) {
  configInedex = parseInt(req.originalUrl[8])-1;
  res.send(config[configInedex]);
});

//현재 node의 getLatestContainer
app.get('/data/:container', function(req,res) {
  var container = req.params.container;
 
  getLatestContainer(function(err, data){
    if(err) return res.send(err);
    else return res.send(data.cin);
  });
});

//현재 node에 reqMgmtCmd
app.post('/control', function(req,res) {
  var cmd = JSON.stringify(req.body);
  console.log("{\"cmd\":\""+req.body.cmd+"\"}");
  reqMgmtCmd(req.body.cmt, "{\"cmd\":\""+req.body.cmd+"\"}", config[configInedex].nodeRI, function(err, data){

    if(err) return res.send({'error':err});
    return res.send({'result':'ok'});
  });
});

//현재 node관련 trigger notify
app.post('/email', function(req,res) {
	var cmd =req.body;
	nodemailer(cmd);
  return res.send('result : ok');
});


app.post('/sms', function(req,res) {
	
	var cmd =req.body;
	
	console.log(cmd);
	//sms(cmd);
	
	
  return res.send('result : ok');
});


var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server for sample dashboard listening on port:'+ app.get('port'));
});

function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

var httpReq = require('./promise-http').request;


function getLatestContainer(cb){	
	// 1. ContentInstance를 활용한 서버에 저장된 센서 값 조회(Retrieve)
httpReq({ 
  options: {
    host : TPhost,
    port: TPport,
    path : AppEUI+version+'/remoteCSE-'+ config[configInedex].nodeID+ '/container-'+config[configInedex].containerName+'/latest',
    method: 'GET',
    headers : {
      Accept: 'application/xml',
      locale: 'ko',
      uKey : config[configInedex].uKey,
      'X-M2M-RI': randomInt(100000, 999999),
      'X-M2M-Origin': config[configInedex].appID
    }
  }
}).then(function(result){
	
	  //console.log(result);
  if(result.data){
		var data = JSON.parse(result.data);
		return cb(null, data);
  }
});
}


function reqMgmtCmd(mgmtCmdPrefix, cmd, nodeRI, cb){
	httpReq({ // 2. mgmCmd 요청
    options: {
      host : TPhost,
      port: TPport,
      path : AppEUI+version+'/mgmtCmd-'+config[configInedex].nodeID + '_' + mgmtCmdPrefix,
      method: 'PUT',
      headers : {
        Accept: 'application/json',
        uKey : config[configInedex].uKey,
        'X-M2M-Origin': config[configInedex].appID,
        'X-M2M-RI': randomInt(100000, 999999),
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
