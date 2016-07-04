![ThingPlug logo](https://raw.githubusercontent.com/SKT-ThingPlug/thingplug-lora-starter-kit/onWork/images/thingplug-logo.png)
# SKT ThingPlug LoRa oneM2M Starter Kit
본 Starter Kit은 SKT의 ThingPlug에서 제공하는 IoT 국제 표준인 oneM2M API를 이용하여 LoRa서비스 개발 환경을 구축할때 Device가 없이도 서비스 테스트가 가능하도록 제공하는 모듈입니다.
본 Starter Kit을 통하여 SK Telecom의 ThingPlug LoRa를 활용하는 방법을 쉽게 이해하고, 다양한 LoRa 서비스 개발을 Starter Kit에서부터 시작해보세요.

## Starter Kit의 목적
Starter Kit에서는 역할에 따라 구성원을 다음 세 가지로 구분할 수 있습니다.

![구성과 주요 요청](https://raw.githubusercontent.com/SKT-ThingPlug/thingplug-lora-starter-kit/master/images/LoRaStarterKit%20Flow.png)

- 애플리케이션 클라이언트 (Application)
- 디바이스 클라이언트 (Device)
- oneM2M API를 제공하는 ThingPlug 서버 (ThingPlug)

애플리케이션과 디바이스는 직접적으로 통신하지 않고 각 구성원들은 기본적으로 ThingPlug가 제공하는 oneM2M 표준 기반의 REST API를 통해 oneM2M 서버와 통신을 하게 됩니다. 해당 API를 통해 제공되는 IoT의 공통적인 기능(예, 데이터 저장, 장치 관리, 장치 등록 등)은 디바이스와 애플리케이션의 개발자들이 좀 더 쉽게 LoRa 서비스를 개발할 수 있는 환경을 제공합니다.

본 Starer Kit이 제공되는 목적은 첫째로는 애플리케이션과 디바이스가 따로 없어도 쉽게 LoRa 서비스를 활용하기 위해 ThingPlug 서버가 제공하는 API를 활용하는 방법을 익히고, 두번째로는 ThingPlug에서 제공하는 oneM2M을 직접 경험해 봄으로써 oneM2M 표준을 이해하는 것입니다.

## Starter Kit 실행절차 요약
다음 절차를 따르면 간편하게 Starter Kit을 실행할 수 있습니다.

1. 사전 준비 : 필요한 필수 도구 설치 및 코드 복사
2. Code를 복사
3. 프로젝트 dependency를 설치
4. 나의 ThingPlug 계정정보에 맞게 일부 파일(config.js)을 수정
5. Device.js를 실행
6. ThingPlug에 내 계정에 Device를 등록
7. Application_web.js를 실행

### 사전 준비
#### Node 설치
Starter Kit을 실행하기 위해서는 다음과 같은 도구가 설치되어 있어야 합니다.

- [Node.js](https://nodejs.org) : 공식 사이트에서 설치 패키지를 다운받을 수 있습니다.

> 주의!<br>
ThingPlug oneM2M을 이용하기 위해서는 ThingPlug 계정이 필요합니다. ThingPlug 회원가입 시 사용할 디바이스 연동 프로토콜을 반드시 HTTP로 선택해야 합니다. HTTP로 선택하지 않고 이미 계정을 만드셨다면 다른 계정을 하나 더 만들어서 진행하세요.

#### 코드 복사

Git에 Release된 프로젝트 압축파일을 다운 받아서 임의에 폴더에 압축을 해제하세요. 또는 아래 명령어를 이용하여 github의 master 버전을 clone해도 됩니다.

```
git clone https://github.com/SKT-ThingPlug/thingplug-lora-starter-kit.git
```

복사된 폴더 안을 살펴보면 다음과 같은 주요파일이 있습니다.

- `device_mqtt_x.js` : 실제 IoT Device에서 구동이 가능한 코드 입니다. Node.js로 구현되어 있어 Node.js가 실행 가능한 컴퓨터에서 실행가능하며 [BeegleBone Black](http://beagleboard.org/black) 같이 Node.js를 구동할 수 있는 IoT Device에서 직접 실행이 가능합니다. 해당 js파일은 mqtt방식의 프로토콜을 적용한 버전입니다.
- `device_http_x.js` : 해당 파일은  device.js파일의 http 버전입니다.
- `application_web.js` : Express.js를 사용한 Web API 서버로 Sample Web Application에서 호출하는 backend 서버의 역할을 합니다. `device.js`에서 ThingPlug로 전송한 데이터를 사용자에게 보여주거나 웹페이지로부터 명령을 받아 ThingPlug 서버를 통해 실제 device를 제어하기도 합니다.
- `public/` : Sample Web Application의 html, css, javascript 등 정적 파일 목록입니다.
- `notification/` : trigger 발생시 문제를 notify하기 위한 E-MAIL관련 파일이 있습니다. 현재 E-MAIL은 nodemailer api를 활용해 전송을 하는 방식을 활용하였으며, 이외에도 개발자가 nodejs의 library를 통해 다양한 방법을 응용할 수 있습니다.
- `config_x.js` : 개발자 인증키와 디바이스 ID등 스타터킷 실행에 앞서 필요한 환경 값을 가지고 있습니다. 각자의 상황에 맞게 수정이 필요합니다. [config.js 수정참고 섹션](https://github.com/SKT-ThingPlug/thingplug-lora-starter-kit#configjs-수정)

> 	현재 sample의 경우 multi Device를 지원하기위해 js파일 이름에 `_숫자` 형태로 mapping 하였습니다. Device의 숫자를 변경하기 위해서는 몇가지 변경사항이 있습니다.<br>
	1. `config_x.js`와 `device_x.js`파일을 추가 또는 삭제(번호는 1번부터 빠짐없이 순차로)<br>
	2. `config_x.js`의 `nodeID`수정<br>
	3.  `application_web.js`의 `numOfDevice`수정<br>
	4.  `/public/js/app.js` 의 `numOfDevice` 수정<br>




#### 프로젝트 dependency 설치
Starter Kit을 통해서 실행하는 device와 application은 Node.js로 구현되어 있으며 실행에 필요한 dependency 정보는 package.json에 기입되어 있습니다. 따라서 위에서 복사한 starter kit 폴더(package.json이 존재하는 폴더)로 이동 후 `npm install` 명령어를 통해 dependency 설치하세요.

```
cd thingplug-lora-starter-kit
npm install
```

### config.js 수정
Starter Kit이 실질적으로 동작하기 위해서는 개발자 계정정보 및 디바이스 정보를 개발자 상황에 맞게 수정해야합니다. `config.js_sample`파일을 `config.js`파일로 복사한 후 `config.js`를 에디터에서 열고 각 항목 오른쪽에 달린 주석 설명과 아래 설명을 참고하여 수정하세요.

```javascript
module.exports = {

  AppEUI : 'starterkittest', 					// Application EUI
  version : 'v1_0', 							// Application의 version
  TPhost : 'thingplugtest.sktiot.com',			// ThingPlug의 HOST Addresss
  TPport : '9000', 								// ThingPlug의 HTTP PORT 번호
  responseAddress : 'HTTP|http://0.0.0.0:0000', // HTTP버전에서 디바이스 제어를 위한 디바이스의 물리적 주소 mga
  responsePORT : '0000',						// HTTP버전에서 디바이스제어를 위한 디바이스의 물리적 주소 mga 포트
  userID : 'userID',							// MQTT버전에서 Broker 접속을 위한 ID
  uKey : 'USER_KEY', 							// Thingplug로그인 후, `마이페이지`에 있는 사용자 인증키
  mqttClientId : 'MQTT Client ID',				// MQTT버전에서 Broker 접속을 위한 client ID
  nodeID : 'LTID', 								// Device 구분을 위한 LTID
  passCode : '000101', 							// ThingPlug에 Device등록 시 사용할 Device의 비밀번호
  appID : 'myApplication', 						// Application의 구분을 위한 ID
  containerName:'LoRa', 						// starter kit에서 생성하고 사용할 container 이름 (임의지정)
  DevReset : 'DevReset', 						// starter kit에서 생성하고 사용할 제어 명령 DevReset
  RepPerChange : 'RepPerChange', 				// starter kit에서 생성하고 사용할 제어 명령 RepPerChange
  RepImmediate : 'RepImmediate', 				// starter kit에서 생성하고 사용할 제어 명령 RepImmediate
  cmdType : 'sensor_1' 							// starter kit에서 사용할 제어 타입 (임의지정)

};
```

### Device 실행
`node device` 명령어로 Device를 실행하면 다음과 같은 결과 화면이 나오면 정상입니다.

```
$ node device
### ThingPlug Device ###
1. node 생성 요청
node 생성 결과
생성 node Resource ID : ND00000000000000000000//(ThingPlug에서 발급받은 값)
content-location: /APP_EUI/APP_version/node-LTID

2. remoceCSE 생성 요청
remoteCSE 생성 결과

다비이스 키 : 64based encoding value//(ThingPlug에서 발급받은 값)

content-location: /APP_EUI/APP_version/remoteCSE-LTID

3. container 생성 요청
container 생성 결과
content-location: /APP_EUI/APP_version/remoteCSE-LTID/container-LoRa

4. mgmtCmd 생성 요청
mgmtCmd 생성 결과
content-location: /APP_EUI/APP_version/mgmtCmd-LTID_mgmtCmdType

5. content Instance 주기적 생성 시작

6. 제어 명령 수신
### mqtt(http) connected ###
content : 35,72,90 //온도, 습도, 조도 가상값
content : 33,70,92 //온도, 습도, 조도 가상값
content : 32,74,91 //온도, 습도, 조도 가상값
...
```

#### Device가 하는 일

 구분  | 설명 | HTTP Method<br>(MQTT Publish)
-------|----|---
1. node 생성 | 물리적 Device를 등록합니다. | POST
2. remoteCSE 생성 | 서비스 및 remoteCSE ID와 passCode를 oneM2M 서버에 등록하고, 서비스에서 발생되는 데이터(dKey)를 저장합니다 . | POST
3. container 생성 | 데이터를 저장해둘 container를 생성합니다. 파일시스템의 폴더와 같은 역할을 합니다. | POST
4. mgmtCmd 생성 | 디바이스에서 받아들일 수 있는 제어 명령어를 포함하는 자원을 생성 합니다. LoRa의 경우 predefined된 command가 있습니다. | POST
5. Content Instance 생성 | 센서의 측정값을 지정한 컨테이너에 기록합니다. | POST
6. execInstance 갱신 | ThingPlug로부터 전달받은 execInstance의 결과를 갱신합니다. | PUT

- MQTT 버전의 경우 `isRunning`의 상태에 따라 동작을 구분 지으며,  
`Subscribe`를 통해 ThingPlug로부터 Response를 받고, `Publish`를 통해 ThingPlug로 HTTP의 Request 동작을 하게 됩니다.

### ThingPlug에 내 계정에 Device를 등록
애플리케이션에서 ThingPlug oneM2M REST API를 통해 데이터를 필요에 따라 제어명령을 보내기 위해서는 먼저 ThingPlug 사이트에 위 device(생성된 remoteCSE)를 등록해야합니다.

- [ThingPlug] 로그인 후 "마이페이지 > 나의 디바이스 > 디바이스 등록" 페이지로 이동합니다.

- 위에서 device 실행 시 사용한 `config.js`의 디바이스 아이디(LTID)와 passCode를 개별등록에 입력하고 `디바이스 정보확인` 버튼을 누릅니다.

- 필수정보 입력화면에 내용을 해당 내용을 넣어준 후 하단 '저장'버튼을 누르면 ThingPlug에 Device 등록이 완료됩니다.


## Application 실행
`node application_web.js` 명령어로 application을 실행합니다. (Application 실행하기 전에 `device.js`가 동작하는 상태로 유지합니다. 따라서 `device.js` 실행을 종료하지 않고 새로운 terminal(커맨드창)을 열어 실행하세요. 웹페이지를 확인하시기 위해서는 `http://[SERVER_IP]:3000/dashboard`를 확인해주세요

해당 web page에서는 device의 위치값을 표시할 수 있고, 디바이스에서 보내온 센서 3종의 값을 보여주며, device에 predefined된 LoRa mgmtCmd를 실행할 수 있고, trigger를 설정해 event 발생시 E-MAIL 등으로 알림을 전송 할 수 있습니다.



실행 후 `device.js`가 실행중인 터미널을 살펴보면 application이 보낸 mgmtCmd에 대한 아래와 같은 로그가 보일 것입니다.

```
///device.js mgmtCmd수신 받은경우//
#####################################
MQTT(HTTP) 수신 
mgmtCmd : mgmtCmd

RI : EI00000000000000000000
CMT : mgmtCmd
EXRA : request 목적
#####################################
```
```javascript
///////CODE EXAMPLE in device.js///////////

////////////response for HTTP//////////////
httpRes.createServer(function (req, res) {
...//받은 요청 처리 및 응답
}).listen(ResponsePORT);

////////////response for MQTT//////////////
client.on('message', function(topic, message){
	var msgs = message.toString().split(',');
	xml2js.parseString( msgs[0], function(err, xmlObj){
		...//받은 요청 처리 및 응답
	});

/////////condition branch//////////////////
		if(cmt=='RepImmediate'){//즉시보고
			...
		}
		else if(cmt=='RepPerChange'){//주기변경
			...
		}
		else if(cmt=='DevReset'){//디바이스 초기화
			...		
		}
		else{
			console.log('Unknown CMD');
		}
```

#### Application 하는 일

 구분  | 설명 | Method
-------|----|---
1. Content Instance 조회 |  가장 최근의 content Instance를 조회합니다. | HTTP GET
2. mgmtCmd 요청 | Device로 보낼 제어 명령을 ThingPlug에게 보냅니다. | HTTP POST
2-1. <br>DevReset | LoRa 디바이스 리셋을 위한 mgmtCmd | 
2-2. <br>RepPerChange | LoRa 디바이스의 Uplink(주기 보고) 주기 변경을 위한 mgmtCmd | 
2-3. <br>RepImmediate | LoRa 디바이스의 Uplink(주기 보고) 즉시 보고를 위한 mgmtCmd |
3. mgmtCmd execInstance 조회 | Device로 보낸 제어 명령의 상태를 조회 합니다. | HTTP GET
4. Sensor Display | Sensor값(현재 온도, 습도, 조도) 그래프형태로 표시 | d3 API
5. Google 지도 API | LoRa Device 위치 표시 | Google API
6. Trigger 설정 | Trigger 발생시 notification | nodemailer API

## Web Application 실행
`node application_web.js` 명령어로 Express.js 서버를 실행합니다. 
이제 웹 브라우저를 열어서 실행 중인 서버의 IP로 접속하여 Dashboard를 실행합니다.
가상 센서를 위한 Dashboard는 http://[SERVER_IP]:3000/dashboard 이며, 
가상 센서값을 Dashboard에 표시하기 위해서는 `node device.js` 를 실행하면 됩니다.
해당 application의 실제 동작과 관련된 내용을 수정하기 위해서는 `/public/index.html` 파일에서 웹페이지를 수정하고, `/public/js/app.js`파일에서 실제 동작과 관련된 내용을 수정합니다.

![web page](https://raw.githubusercontent.com/SKT-ThingPlug/thingplug-lora-starter-kit/master/images/web.png)


## 환영합니다. 당신은 이제 ThingPlug LoRa IoT User입니다.
어떠세요? 벌써 Starter Kit을 이용하여 SK ThingPlug LoRa 사용에 필요한 구성요소를 준비 완료했습니다. 이제 Application과 Device의 코드를 시작점으로 원하는 서비스를 만들어보세요. 서비스를 개발해 나가는 과정에서 생겨나는 궁금증은 [ThingPlug 개발자 커뮤니티](https://sandbox.sktiot.com/IoTPortal/cmmnty/cmmntyList)를 이용해주세요.

##Starter Kit에 대한 상세한 내용은 ThingPlug 가이드북을 참고하세요.
[ThingPlug로 시작하는 IoT 서비스 개발](http://book.naver.com/bookdb/book_detail.nhn?bid=9766474)를 참고하세요.

## FAQ

#### device 실행 시 마다 매번 Resource를 등록해야하는 건가요?
아닙니다. 디바이스마다 최초 1회만 Resource를 등록하면 됩니다. 본 스타터킷에서는 디바이스 실행 시 매번 Resource를 등록하도록 되어 있습니다. 이 경우에도 문제가 되는 것은 아닙니다. 다만 같은 ID로 만드려고 하는 경우conflict ( HTTP : 409, MQTT : 4015) 메시지가 발생할것입니다.

#### 마이페이지에 사용자 인증키가 없는데요?
ThingPlug 회원가입 입력양식에 있는 디바이스 연동 프로토콜 선택을 반드시 HTTP로 선택해야 합니다. 그렇지 않을 경우 oneM2M API를 이용할 수 없습니다. 가입시에만 선택이 가능하기 때문에 새로운 아이디로 새 계정을 만들고 가입 입력양식에서 꼭 HTTP로 선택해주세요.

#### MQTT connect가 되지 않습니다
ThingPlug ID와 uKey가 config파일에 제대로 입력이 되었는지 확인해주세요. 그리고 clientId가 다른사람과 겹치는 경우 간혹 문제가 발생할 수 있으니 주의하여 주십시오

#### 센서값이 보이지 않습니다
ThingPlug 포털에 디바이스를 등록하였는지 확인해주세요. 등록하지 않은경우 uKey mapping이 되지 않아 Application에서 디바이스로 접근이 되지 않습니다. 
