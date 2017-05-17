var express = require('express');
var fs = require('fs');
var parser = require('body-parser');
var app = express();
var nodemailer = require('nodemailer');
var ping = require('ping');
app.use(parser.urlencoded({ extended: false }));
/**
 * Arr of prev system state
 * @type {Array}
 */
var oldFallen = [];
/**
 * Arr of new up Events
 * @type {Array}
 */
var upArr;
/**
 * Arr of new down Events
 * @type {Array}
 */
var downArr;
/**
 * Message of current problems in html
 * @type {String}
 */
var htmlStatus;
/**
 * Last Event time, for cheking if something new has happend (for clients)
 * @type {Date}
 */
var lastEvent;
/**
 * Prev time when ping has applied, need it for force_update only
 * @type {Date}
 */
var updateOld;
/**
 * Sorted  message of current problems in html (method 'addrup')
 * @type {String}
 */
var htmlStatusAddSortUp;
/**
 * Sorted  message of current problems in html (method 'addrdown')
 * @type {String}
 */
var htmlStatusAddSortDown;
/**
 * configObject
 * @type {Object}
 */
var config = JSON.parse(fs.readFileSync(__dirname + '/config.ini'));
/**
 * Database of switches(Array of Objects)
 * @type {Array}
 */
var arrAdIpEv = JSON.parse(fs.readFileSync(__dirname + '/db.txt'));
console.log(arrAdIpEv.length);

/**Function_calls.*/
pingAll();
var timer = setInterval(pingAll, config.refreshTime*1000);

/**
 * Mailer_module
 * @param {String} msg
 */
function sendMail(msg) {
    var smtpConfig = {
        host: config.mailOptions.host,                   // smtp server
        port: config.mailOptions.port,                   // listening port
        secure: config.mailOptions.secure,               // use/not SSL
        ignoreTLS: config.mailOptions.ignoreTLS,         // ignore STARTLS if supported
    	auth: {                                          // auth data
    	    user: config.mailOptions.user,
            pass: config.mailOptions.pass
            }
        };
    var transporter = nodemailer.createTransport(smtpConfig);
    var mailOptions = {
        from: config.mailOptions.from,                   // sender address
        to: config.mailOptions.to,                       // list of receivers
        cc: config.mailOptions.cc,                       // copy_to list
        subject: config.mailOptions.subject,             // Subject line
        text: msg                                        // plaintext body
        };
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
}

/**
 * Sort arr with picked method
 * @param {Array} arr
 * @param {String} method
 */
function sortArr(arr, method) {
    var keya, keyb;

    if (method == 'addrup' || method == 'evup') {
        keya = -1;
        keyb = 1;
    } else {
        keya = 1;
        keyb = -1;
    }

    if (method == 'addrup' || method == 'addrdown') {
        arr.sort(function(a, b) {
            var c = arrAdIpEv[a].address,
            d = arrAdIpEv[b].address;

            if (c < d) {
                return keya;

            } else if (c > d) {
                return keyb;

            } else {
                return 0;
            }

        });
    } else {
        arr.sort(function(a, b) {
            var c = arrAdIpEv[a].evTime,
            d = arrAdIpEv[b].evTime;

            if (c < d) {
                return keya;

            } else if (c > d) {
                return keyb;

            } else {
                return 0;
            }

        });
    }
}

/**
 * Form htmlStatus
 * @param {Array} arr
 * @param {String} method
 * @returns {String}
 */
function formHtmlStatus(arr, method) {
    function info(index) {
        if (arrAdIpEv[index].info != undefined) {
            return arrAdIpEv[index].info;
        } else {
            return '';
        }
    }

    var file = '';
    sortArr(arr, method);

    arr.forEach(function(unit) {
        file += '<tr><td align="left">' + arrAdIpEv[unit].address + '</td><td><a target="blank" href="http://us.uch.net/oper/abon_list.php?type=find&search=' + arrAdIpEv[unit].ip + '">' + arrAdIpEv[unit].ip + '</td><td class="down" align="center">DOWN</td><td align="center">' + (arrAdIpEv[unit].evTime.getDate()<10?'0':'') + arrAdIpEv[unit].evTime.getDate() + '.' + (arrAdIpEv[unit].evTime.getMonth()<9?'0':'') + (arrAdIpEv[unit].evTime.getMonth()+1) + ' ' + (arrAdIpEv[unit].evTime.getHours()<10?'0':'') + arrAdIpEv[unit].evTime.getHours() + ':' + (arrAdIpEv[unit].evTime.getMinutes()<10?'0':'') + arrAdIpEv[unit].evTime.getMinutes() + ':' + (arrAdIpEv[unit].evTime.getSeconds()<10?'0':'') + arrAdIpEv[unit].evTime.getSeconds() + '</td><td class="duration" align="center" data-start="' + arrAdIpEv[unit].evTime + '"></td><td align="right"><text>' + info(unit) + '</text><button class="edit" data-unit="' + unit + '">edit</button></td></tr>';
    });

    return file;
}

/**
 * Compare Arrs and receive Uping and Downing Arrs.
 * @param {Array} newArr
 */
function compare(newArr) {
    /**Clear arr of new up events*/
    upArr = [];
    /**Clear arr of new down events*/
    downArr = [];
    var time = new Date;
    /**Check - if nothing new has happend (for server)*/
    if (newArr.length == oldFallen.length && oldFallen.length != 0) {
        newArr.sort();
        oldFallen.sort();

        if (newArr.join(',') == oldFallen.join(',')) {
            console.log('Nothing new has happend');
            return;
        }

    }
    /**Case 1(simple)*/
    if (oldFallen.length == 0 && newArr.length == 0) {
        console.log('Nothing new has happend');
        return;
        /**Case 2(simple)*/
    } else if (oldFallen.length == 0 && newArr.length != 0) {
        downArr = newArr;
        downArr.forEach(function(unit)  {
            oldFallen.push(unit);
            arrAdIpEv[unit].evTime = time;
        });
        lastEvent = new Date;
    /**Case 3(simple)*/
    } else if (newArr.length == 0 && oldFallen.length != 0) {
        upArr = oldFallen;
        upArr.forEach(function(unit)  {
            /**Delete event-time for up events*/
            delete arrAdIpEv[oldFallen[i]].evTime;
            /**Delete info for up events*/
            delete arrAdIpEv[oldFallen[i]].info;
        });
        oldFallen = [];
        lastEvent = new Date;
    /**Case 4(complex)*/
    } else {
        /**Receive arr of new down events*/
        for (var i = 0; i < newArr.length; i++) {
	        for (var j = 0; j < oldFallen.length; j++) {

                if (newArr[i] == oldFallen[j]) {
                    break;

                } else if (j == oldFallen.length - 1) {
                    downArr.push(newArr[i]);
                    arrAdIpEv[newArr[i]].evTime = time;
                }

            }
        }
        /**Receive arr of new up events*/
        for (i = 0; i < oldFallen.length; i++) {
	        for (j = 0; j < newArr.length; j++) {

                if (oldFallen[i] == newArr[j]) {
                    break;

                } else if (j == newArr.length - 1) {
                    upArr.push(oldFallen[i]);
                    /**Delete event-time for up events*/
                    delete arrAdIpEv[oldFallen[i]].evTime;
                    /**Delete info for up events*/
                    delete arrAdIpEv[oldFallen[i]].info;
                }

            }
        }
        /**Actualize whole downlist (for next step)*/
        oldFallen = newArr;
        lastEvent = new Date;
    }
    console.log('total numder of down = ' + oldFallen.length);
    console.log('number is up now = ' + upArr.length);
    console.log('namber is down now = ' + downArr.length);
    console.log(lastEvent);
}

/**
 * Ping module -> Ping all hosts and if something new has happend - send message and form html response.
 * @returns {Promise}
 */
function pingAll() {
    /**
     * Need it for force_update only
     * @type {Date}
     */
    var updateNow = new Date;
    /**
     * Current arr of whole downlist
     * @type {Array}
     */
	var fallen = [];
    /**
     * Arr of promises, for nextstep
     * @type {Array}
     */
    var promiseArr = [];
    /**
     * Promise, need it for force update only
     * @type {Promise}
     */
    var prom;
    /**This check is needed for force update only*/
    if (updateOld == undefined || updateNow - updateOld > 15000) {
        console.log((updateNow-updateOld)/1000 + ' s');
        updateOld = updateNow;
        /**move on hosts database and ping all hosts, forming arr of fallen hosts, forming arr of promises*/
        arrAdIpEv.forEach(function(_switch, i) {
            promiseArr[i] = ping.promise.probe(_switch.ip)
                .then(function(result){
                    if (result.alive == false) {
                        fallen.push(i);
                    }
                });
	    });
        /**when ping all hosts has accomplished - compare prev state and present, if something new has happend - forming messages*/
        prom = Promise.all(promiseArr)
            .then(function() {
                compare(fallen);              //compare prev and present state
                /**
                 * time when new event has happend
                 * @type {Date}
                 */
                var time = new Date;
                /**
                 * mail message
                 * @type {string}
                 */
                var message = '';
                /**
                 * log message
                 * @type {string}
                 */
                var htmlLog = '';
                /**Case 1*/
                if (downArr.length != 0 && upArr.length != 0) {
                    sortArr(downArr, 'addrup');
                    sortArr(upArr, 'addrup');
                    message = '\r\n'+'IS DOWN ' + time + '\r\n';
                    htmlLog = '<div style="background-color: brown">IS DOWN <text style="color: silver">' + time + '</text></div>';

                    downArr.forEach(function(unit) {
                        message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';
                        htmlLog += '<div style="color: brown">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                    });

                    message += '--------'+'\r\n'+'IS UP ' + time + '\r\n';
                    htmlLog += '<div style="background-color: green">IS UP <text style="color: silver">' + time + '</text></div>';

                    upArr.forEach(function(unit) {
                        message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';
                        htmlLog += '<div style="color: green">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                    });

                    htmlStatusAddSortUp = formHtmlStatus(oldFallen, 'addrup');
                    sendMail(message);
                    fs.appendFileSync(__dirname + '/log.txt', htmlLog);
                /**Case 2*/
                } else if (downArr.length == 0 && upArr.length != 0) {
                    sortArr(upArr, 'addrup');
                    message = '\r\n'+'IS UP ' + time + '\r\n';
                    htmlLog = '<div style="background-color: green">IS UP <text style="color: silver">' + time + '</text></div>';

                    upArr.forEach(function(unit) {
                        message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';
                        htmlLog += '<div style="color: green">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                    });

                    htmlStatusAddSortUp = formHtmlStatus(oldFallen, 'addrup');
                    sendMail(message);
                    fs.appendFileSync(__dirname + '/log.txt', htmlLog);
                /**Case 3*/
                } else if (downArr.length != 0 && upArr.length == 0) {
                    sortArr(downArr, 'addrup');
                    message = '\r\n'+'IS DOWN ' + time + '\r\n';
                    htmlLog = '<div style="background-color: brown">IS DOWN <text style="color: silver">' + time + '</text></div>';

                    downArr.forEach(function(unit) {
                        message += arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '\r\n';
                        htmlLog += '<div style="color: brown">' + arrAdIpEv[unit].address + ' ' + arrAdIpEv[unit].ip + '</div>';
                    });

                    htmlStatusAddSortUp = formHtmlStatus(oldFallen, 'addrup');
                    sendMail(message);
                    fs.appendFileSync(__dirname + '/log.txt', htmlLog);
                }
            });
        /**Return promise, need it for force update*/
        return prom;

    } else {
        /**Return resolved promise, if  pingAll has applied less then 15 seconds before*/
        return Promise.resolve();
    }
}
/**Server*/
app.use(express.static(__dirname + '/www'));
/**Send log*/
app.post('/log', function(request, response) {
    response.send(fs.readFileSync(__dirname + '/log.txt'));
});
/**send lastEvent & current time*/
app.post('/chek', function(request, response) {
    response.send({lastEv:lastEvent, now: new Date});
});
/**receive info*/
app.post('/add_info', function(request, response) {
    /**Save info in main arr*/
    arrAdIpEv[request.body.unit].info = request.body.info;
    /**Change last event time*/
    lastEvent = new Date;
    /**Send current server time*/
    response.send(lastEvent);
    /**Change main html message*/
    htmlStatusAddSortUp = formHtmlStatus(oldFallen, 'addrup');
});
/**send status and problems*/
app.post('/status', function(request, response) {

    if (request.body.id == 'addrup') {
        htmlStatus = htmlStatusAddSortUp;
    } else {
        htmlStatus = formHtmlStatus(oldFallen, request.body.id);
    }

    var status = {
        ok: arrAdIpEv.length - oldFallen.length,
        down: oldFallen.length,
        html: htmlStatus,
        now: new Date
        };

    response.send(status);
});
/**Force pingAll and update status*/
app.post('/force_update', function(request, response) {
    pingAll().then(function() {

        if (request.body.id == 'addrup') {
            htmlStatus = htmlStatusAddSortUp;
        } else {
            htmlStatus = formHtmlStatus(oldFallen, request.body.id);
        }

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
/**Get current config*/
app.post('/get_conf', function(request, response) {
    response.send(JSON.stringify(config));
});
/**Change current config and DB*/
app.post('/set_conf', function(request, response) {

    if (request.body.type == 'refreshTime' || request.body.type == 'mail') {
        config = JSON.parse(request.body.jsonData);
        fs.writeFileSync(__dirname + '/config.ini', request.body.jsonData);

        if (request.body.type == 'refreshTime') {
            clearInterval(timer);
            timer = setInterval(pingAll, config.refreshTime * 1000);
        }

        response.send('Config changed');

    } else if (request.body.type == 'add') {
        var newIpReg = new RegExp('"' + request.body.ip + '"');

        if (newIpReg.test(JSON.stringify(arrAdIpEv))) {
            response.send('This switch is already in DB');

        } else {
            arrAdIpEv.push({address: request.body.address, ip: request.body.ip});
            lastEvent = new Date;
            fs.writeFileSync(__dirname + '/db.txt', JSON.stringify(arrAdIpEv, ["address", "ip"]));
            response.send('Success');
        }

    } else if (request.body.type == 'remove') {
        /**
         * Remove process status
         * @type {boolean}
         */
        var status = false;

        for (var count = 0; count < arrAdIpEv.length; count++) {

            if (arrAdIpEv[count].ip == request.body.ip) {

                arrAdIpEv.splice(count, 1);

                oldFallen.forEach(function(unit, i) {

                    if (unit > count) {
                        oldFallen[i] -= 1;

                    } else if (unit == count) {
                        oldFallen.splice(i, 1);

                        if (oldFallen[i] > count) {
                            oldFallen[i] -= 1;
                        }

                    }
                });

                htmlStatusAddSortUp = formHtmlStatus(oldFallen, 'addrup');
                lastEvent = new Date;
                fs.writeFileSync(__dirname + '/db.txt', JSON.stringify(arrAdIpEv, ["address", "ip"]));
                status = true;

                break;
            }
        }

        if (status) {
            response.send("Success");
        } else {
            response.send("Can't find this switch in DB");
        }
    }
});

app.listen(8888, function() {
    console.log('server started :8888');
});