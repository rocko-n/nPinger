var express = require('express');
var fs = require('fs');
var parser = require('body-parser');
var app = express();
var nodemailer = require('nodemailer');
var ping = require('ping');

app.use(parser.urlencoded({ extended: false }));


var oldFallen = [];                                         // arr of prev system state
var upArr;                                                  // arr of new up Events
var downArr;                                                // arr of new down Events
var htmlStatus;                                             // message of current problems in html
var lastEvent;                                              // last Event time, for cheking if something new has happend (for clients) 
var UpdateOld;                                              // prev time when ping is apply, needed for force_update only
var htmlStatusAddSortUp;                                    // sorted  message of current problems in html (method 'addrup')
var htmlStatusAddSortDown;                                  // sorted  message of current problems in html (method 'addrdown')


// Write to file function
////////////////////////////////////////////////////////////////////////////////////
function writeFile(dest, data) {
     fs.open(dest, "a+", 0644, function(err, file_handle) {
	if (!err) {
	    fs.writeSync(file_handle, data, null, function(err, written) {
	        if (!err) {
	            console.log("OK");
	        } else {
	            console.log("Error");
	        };
	    });
	} else {
		console.log("Can't open");
	};
     });
};
///////////////////////////////////////////////////////////////////////////////////////



//Mailer_module
//////////////////////////////////////////////////////////////
function sendMail(msg) {
    var smtpConfig = {
        host: 'smtp.test.com',                        // smtp server
        port: 587,                                    // listening port
    	secure: false,                                // use/not SSL 
    	auth: {                                       // auth data 
        	user: 'test@test.com',
       	 	pass: '25252525'
    	}
    };
    var transporter = nodemailer.createTransport(smtpConfig);
    var mailOptions = {
    	from: '"Tech" <tech@test.com>',    // sender address 
        to: 'tech@test.com',               // list of receivers 
    	subject: 'Pinger Event Report',    // Subject line 
    	text: msg,                         // plaintext body     
    };
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
};
/////////////////////////////////////////////////////////////////



/*
//Forming DataBase Files. Now it's useless. DataBase is form.
/////////////////////////////////////////////////////////////////////////////////////////////////
var dataBase1 = fs.readFileSync('appl/pinger/dataold.txt', 'utf8');
var reg1 = /172\.\d+\.\d+\.\d+/g;
var reg2 = /\r\n['а-яєії0-9a\-\s\(\)\,\/’:_]+172\./ig;
var result = dataBase1.match(reg2);
console.log(result);
console.log(result.length);
fs.open('appl/pinger/data.txt', "a+", 0644, function(err, file_handle) {
	if (!err) {
          result.forEach(function(line, i){
	    fs.writeFileSync(file_handle, line, null, function(err, written) {	       
	    });
          }); 
	} else {
		console.log("Can't open");
	};
});
*/


//Sort arr with picked method
////////////////////////////////////////////////////////////////////////////////////////////////
function SortArr(arr, method) {
      var keya, keyb;
      if ((method == 'addrup') || (method == 'evup')) {
            keya = -1;
            keyb = 1;
      } else {
            keya = 1;
            keyb = -1;
      };
      if ((method == 'addrup') || (method == 'addrdown')) { 
            arr.sort(function(a, b){
               var c = arrAdIpEv[a].address,
               d = arrAdIpEv[b].address;
               if( c < d ){
                   return keya;
               }else if( c > d ){
                   return keyb;
               } else {
                   return 0;
               }
            }); 
      } else {
            arr.sort(function(a, b){
               var c = arrAdIpEv[a].EvTime,
               d = arrAdIpEv[b].EvTime;
               if( c < d ){
                   return keya;
               }else if( c > d ){
                   return keyb;
               } else {
                   return 0;
               }
            }); 
      };
} 
///////////////////////////////////////////////////////////////////////////////////////////////


// Form htmlStatus
///////////////////////////////////////////////////////////////////////////////////////////////
function FormHtmlStatus(arr, method) {
      function info(index) {
           if ( arrAdIpEv[index].info != undefined ) {
              return arrAdIpEv[index].info;
           } else {
              return '';
           };
      }  
      var file = '';                                       
      SortArr(arr, method);
      arr.forEach( function(unit) {
          file += '<tr><td align="left">' + arrAdIpEv[unit].address + '</td><td><a target="blank" href="http://us.uch.net/oper/abon_list.php?type=find&search=' + arrAdIpEv[unit].ip + '">' + arrAdIpEv[unit].ip + '</td><td class="down" align="center">DOWN</td><td align="center">' + (arrAdIpEv[unit].EvTime.getDate()<10?'0':'') + arrAdIpEv[unit].EvTime.getDate() + '.' + (arrAdIpEv[unit].EvTime.getMonth()<9?'0':'') + (arrAdIpEv[unit].EvTime.getMonth()+1) + ' ' + (arrAdIpEv[unit].EvTime.getHours()<10?'0':'') + arrAdIpEv[unit].EvTime.getHours() + ':' + (arrAdIpEv[unit].EvTime.getMinutes()<10?'0':'') + arrAdIpEv[unit].EvTime.getMinutes() + ':' + (arrAdIpEv[unit].EvTime.getSeconds()<10?'0':'') + arrAdIpEv[unit].EvTime.getSeconds() + '</td><td class="duration" align="center" data-start="' + arrAdIpEv[unit].EvTime + '"></td><td align="right"><text>' + info(unit) + '</text><button class="edit" data-unit="' + unit + '">edit</button></td></tr>';
      });
      return file;
}                       
///////////////////////////////////////////////////////////////////////////////////////////////


//Open database of switches and convert it to array of objects.
//////////////////////////////////////////////////////////////////////////////////////////////
var dataBase = fs.readFileSync('appl/pinger/switchDataBase.txt', 'utf8');
var arrOfSwitches = dataBase.trim().split('\r\n');
dataBase = fs.readFileSync('appl/pinger/adressDataBase.txt', 'utf8');
var arrOfAddresses = dataBase.trim().split('\r\n');
var arrAdIpEv = [];
for (var i=0;  i<arrOfAddresses.length; i++) {
     arrAdIpEv[i] = {address: arrOfAddresses[i],
                     ip: arrOfSwitches[i] 
                    };
};
delete dataBase;
delete arrOfSwitches;
delete arrOfAddresses;
console.log(arrAdIpEv.length);
//////////////////////////////////////////////////////////////////////////////////////////////



//Compare Arrs and receive Uping and Downing Arrs.
///////////////////////////////////////////////////////////////////////////////////////////////////
function compare(newArr){                           // newArr - current whole downlist             
     upArr = [];                                                        // clear arr of new up events
     downArr = [];                                                      // clear arr of new down events
     var time = new Date; 
     

     if ( ( newArr.length == oldFallen.length ) && ( oldFallen.length != 0 ) ) {  // test - if nothing new has happend (for server) 
         newArr.sort();
         oldFallen.sort();
         if (newArr.join(',') == oldFallen.join(',')) {
             console.log('Nothing new has happend');
             return;
         }; 
     };
            if ( ( oldFallen.length == 0 ) && ( newArr.length == 0 ) ) {   //case 1(simple)
                console.log('Nothing new has happend');
                return;
            } else
            if ( ( oldFallen.length == 0 ) && ( newArr.length != 0 ) ) {   // case 2(simple)
                downArr = newArr;
                downArr.forEach( function(unit)  {
                    oldFallen.push(unit);  
                    arrAdIpEv[unit].EvTime = time;
                });
                lastEvent = new Date;
            } else
            if ( ( newArr.length == 0 ) && ( oldFallen.length != 0 ) ) {  // case 3(simple)
                upArr = oldFallen;  
                upArr.forEach( function(unit)  {  
                    delete arrAdIpEv[oldFallen[i]].EvTime;                // delete event-time for up events
                    delete arrAdIpEv[oldFallen[i]].info;                  // delete info for up events
                });
                oldFallen = [];
                lastEvent = new Date;
            }
            else {                                                        //case 4(complex)
                for ( var i = 0; i < newArr.length; i++ ){                // receive arr of new down events
	            for ( var j = 0; j < oldFallen.length; j++ ){
                        if ( newArr[i] == oldFallen[j] ) {
                           break;
                        } else
                        if ( j == oldFallen.length - 1 ) {
                           downArr.push(newArr[i]);
                           arrAdIpEv[newArr[i]].EvTime = time;
                        };
                    }; 
                }; 
                for ( var i = 0; i < oldFallen.length; i++ ){                  // receive arr of new up events
	            for ( var j = 0; j < newArr.length; j++ ){
                        if ( oldFallen[i] == newArr[j] ) {
                           break;
                        } else
                        if ( j == newArr.length - 1 ) {
                           upArr.push(oldFallen[i]);
                           delete arrAdIpEv[oldFallen[i]].EvTime;                // delete event-time for up events
                           delete arrAdIpEv[oldFallen[i]].info;                  // delete info for up events
                        };
                    }; 
                }; 
                oldFallen = newArr;                                              // actualize whole downlist (for next step)
                lastEvent = new Date;
            };                                                                  // end of case 4

     console.log('total numder of down = ' + oldFallen.length);
     console.log('number is up now = ' + upArr.length);
     console.log('namber is down now = ' + downArr.length);
     console.log(lastEvent);
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	    
	



//Ping all hosts and if something new has happend - send message and form html response.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function PingAll() {
        var UpdateNow = new Date;                                                   // needed for force_update only
	var fallen = [];                                                            // current arr of whole downlist
        var PromiseArr = [];                                                        // arr of promises, for nextstep
        var prom;                                                                   // promise, needed fo force update only
           if ((UpdateOld == undefined) || (UpdateNow-UpdateOld>15000)) {           // needed for force_update only
               console.log((UpdateNow-UpdateOld)/1000 + ' s');                                   
               UpdateOld = UpdateNow;  
//move on hosts database and ping all hosts, forming arr of fallen hosts, forming arr of promises
               arrAdIpEv.forEach(function(_switch, i){                              
                         PromiseArr[i] = ping.promise.probe(_switch.ip).
                             then(function (result){
                                if (result.alive == false) {
                                    fallen.push(i); 
                                };      			   
                         });
	       });

//when ping all hosts accomplished - compare prev state and present, if something new has happend - forming messages
               prom = Promise.all(PromiseArr).then(function () {
                                       compare(fallen);              //compare prev and present state           
                                       var time = new Date;          //time when new event has happend   
                                       var message = '';             //mail message 
                                       var htmlLog = '';             //log message                      
                                       if ( ( downArr.length != 0 ) && ( ( upArr.length != 0 ) ) ) {     //case 1
                                          SortArr(downArr, 'addrup');
                                          SortArr(upArr, 'addrup');
                                          message = time + '\r\n'+'IS DOWN\r\n';
                                          htmlLog = '<div style="background-color: silver">' + time + '</div>' + '<div style="background-color: brown">IS DOWN</div>';   
                                          downArr.forEach( function(unit) {
                                              message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';  
                                              htmlLog += '<div style="color: brown">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                                          });  
                                          message += '--------'+'\r\n'+'IS UP\r\n';
                                          htmlLog += '<div style="background-color: green">IS UP</div>'
                                          upArr.forEach( function(unit) {
                                              message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';  
                                              htmlLog += '<div style="color: green">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>'; 
                                          });  
                                          htmlStatusAddSortUp = FormHtmlStatus(oldFallen, 'addrup');
                                          sendMail(message); 
                                          writeFile('appl/pinger/log.txt', htmlLog);                                               
                                       } else
                                       if ( ( downArr.length == 0 ) && ( ( upArr.length != 0 ) ) ) {     //case 2
                                          SortArr(upArr, 'addrup');
                                          message = time + '\r\n'+'IS UP\r\n';
                                          htmlLog = '<div style="background-color: silver">' + time + '</div>' + '<div style="background-color: green">IS UP</div>'; 
                                          upArr.forEach( function(unit) {
                                              message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';  
                                              htmlLog += '<div style="color: green">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';  
                                          });   
                                          htmlStatusAddSortUp = FormHtmlStatus(oldFallen, 'addrup');
                                          sendMail(message);    
                                          writeFile('appl/pinger/log.txt', htmlLog);                                           
                                       } else
                                       if ( ( downArr.length != 0 ) && ( ( upArr.length == 0 ) ) ) {    //case 3
                                          SortArr(downArr, 'addrup'); 
                                          message = time + '\r\n'+'IS DOWN\r\n';
                                          htmlLog = '<div style="background-color: silver">' + time + '</div>' + '<div style="background-color: brown">IS DOWN</div>';
                                          downArr.forEach( function(unit) {
                                              message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';  
                                              htmlLog += '<div style="color: brown">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                                          }); 
                                          htmlStatusAddSortUp = FormHtmlStatus(oldFallen, 'addrup');
                                          sendMail(message);  
                                          writeFile('appl/pinger/log.txt', htmlLog);
                                       }; 
               });
               return prom;                          //return promise, needed for force update
           } else {                                  
               prom = Promise.resolve();
               return prom;                          //return resolved promise, if  PingAll has applied less then 15 seconds before
           };
           
           
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



//Function_calls.
//////////////////////////////////////////////////////////////////
PingAll();
setInterval(PingAll, 60000);
//////////////////////////////////////////////////////////////////



//Server
//////////////////////////////////////////////////////////////////////////////////////////////
app.use(express.static('./appl/pinger/WWW'));

// send log
/////////////////////////////////////////////////////////////////////////////////////////////
 app.post('/log', function (request, response) {                                         
    response.send(fs.readFileSync('appl/pinger/log.txt'));
 });
////////////////////////////////////////////////////////////////////////////////////////////

// send lastEvent & current time
////////////////////////////////////////////////////////////////////////////////////////////
 app.post('/chek', function (request, response) {                                        
    response.send({lastEv:lastEvent, now: new Date});
 });
//////////////////////////////////////////////////////////////////////////////////////////////

// receive info 
//////////////////////////////////////////////////////////////////////////////////////////////
 app.post('/add_info', function (request, response) {  
    arrAdIpEv[request.body.unit].info = request.body.info;      // save info in main arr  
    var now = new Date;                                        
    response.send(now);                                         // send current server time
    lastEvent = now;                                            // change last event time
    htmlStatusAddSortUp = FormHtmlStatus(oldFallen, 'addrup');  // change main html message
 });
//////////////////////////////////////////////////////////////////////////////////////////////

// send status and problems
//////////////////////////////////////////////////////////////////////////////////////////////
 app.post('/status', function (request, response) {                                      
        if (request.body.id == 'addrup') {
            htmlStatus = htmlStatusAddSortUp;
        } else {
            htmlStatus = FormHtmlStatus(oldFallen, request.body.id);
        };
        var status = {
                ok: arrAdIpEv.length - oldFallen.length,
                down: oldFallen.length,     
                html: htmlStatus,
                now: new Date            
        };
    response.send(status);
 });
///////////////////////////////////////////////////////////////////////////////////////////////

// force PingAll and update status
///////////////////////////////////////////////////////////////////////////////////////////////
 app.post('/force_update', function (request, response) {                               
    PingAll().then(function() {
        if (request.body.id == 'addrup') {
            htmlStatus = htmlStatusAddSortUp;
        } else {
            htmlStatus = FormHtmlStatus(oldFallen, request.body.id);
        };
        console.log('forcing');
        var status = {
                ok: arrAdIpEv.length - oldFallen.length,
                down: oldFallen.length,     
                html: htmlStatus,
                now: new Date            
        };
    response.send(status);
    });
 });
///////////////////////////////////////////////////////////////////////////////////////////////
 
app.listen(8000, function () {
  console.log('server started');
});
//////////////////////////////////////////////////////////////////////////////////////////////
