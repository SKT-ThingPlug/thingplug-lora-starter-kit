
var nodemailer = require('nodemailer');

exports.request = function(mailoptions){
// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://skt.thingplug%40gmail.com:qmffnqpfl1225@smtp.gmail.com');

// send mail with defined transport object
transporter.sendMail(mailoptions, function(error, info){
    if(error){
        return console.log(error);
    }
    //console.log('Message sent: ' + info.response);
	
	return console.log('Message sent: ' + info.response);
});
}