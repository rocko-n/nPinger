var fs = require('fs');

//Forming DataBase Files.
/////////////////////////////////////////////////////////////////////////////////////////////////
var dataBase = fs.readFileSync(__dirname + '/data.xls', 'utf8').replace(/\t/g, ' ').replace(/Черкассы\,\s/g, 'start');
var reg1 = /172\.\d+\.\d+\.\d+/g;
var reg2 = /start.+\r\n/g;
var result1 = dataBase.match(reg1);
var result2 = dataBase.match(reg2);

if (!result1 || !result2 || result1.length !== result2.length) {

    console.log('Error\r\nSomething wrong:\r\nwrong parsedata or parsedatalength missmatch!!!');

} else {

    var finalData = [];

    result2.forEach(function(result, i) {
        result2[i] = result.replace('start', '').replace('\r\n', '').replace('&#047;', '/').replace('&#039;', "'");
        finalData.push({"address": result2[i], "ip": result1[i]});
    });

    fs.writeFileSync(__dirname + '/data.json', JSON.stringify(finalData));

    console.log('ok\r\nswitches number = ' + finalData.length);

}