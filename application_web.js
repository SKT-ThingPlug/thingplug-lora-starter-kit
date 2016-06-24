'use strict';

var http = require('http');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var config = require('./config');
var config_1 = require('./config_1');
var config_2 = require('./config_2');

var sms = require('./sms/sendsms').request;
var nodemailer = require('./mail').request;

var colors = require('colors');

var Promise = require('es6-promise').Promise;

app.set('port', process.env.PORT || 3000);
app.use('/dashboard', express.static(path.join(__dirname,'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/config_1', function(req,res) {
	config = config_1;
	//console.log('config_1 ->' + config_1.nodeID);
  res.send(config_1);
});

app.get('/config_2', function(req,res) {
	config = config_2;
	//console.log('config_2 ->' + config_2.nodeID);
  res.send(config_2);
});

app.get('/data/:container', function(req,res) {
  var container = req.params.container;
 
  getLatestContainer(function(err, data){
    if(err) return res.send(err);
    else return res.send(data.cin);
  });
});

app.post('/control', function(req,res) {
  var cmd = JSON.stringify(req.body);
  console.log("{\"cmd\":\""+req.body.cmd+"\"}");
  reqMgmtCmd(req.body.cmt, "{\"cmd\":\""+req.body.cmd+"\"}", config.nodeRI, function(err, data){

    if(err) return res.send({'error':err});
    return res.send({'result':'ok'});
  });
});



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
    host : '211.115.15.160',
    port: '9000',
    path : '/0000000000000001/v1_0/remoteCSE-'+ config.nodeID+ '/container-'+config.containerName+'/latest',
    method: 'GET',
    headers : {
      Accept: 'application/json',
      locale: 'ko',
      uKey : config.uKey,
      'X-M2M-RI': randomInt(100000, 999999),
      'X-M2M-Origin': config.appID
    }
  }
}).then(function(result){
  if(result.data){
		var data = JSON.parse(result.data);
		return cb(null, data);
  }
});
}


function reqMgmtCmd(mgmtCmdPrefix, cmd, nodeRI, cb){
	httpReq({ // 2. mgmCmd 요청
    options: {
      host : '211.115.15.160',
      port: '9000',
      path : '/0000000000000001/v1_0/mgmtCmd-'+config.nodeID + '_' + mgmtCmdPrefix,
      method: 'PUT',
      headers : {
        Accept: 'application/json',
        uKey : config.uKey,
        'X-M2M-Origin': config.appID,
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
