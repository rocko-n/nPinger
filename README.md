# nPinger
ping hosts and form messages and etc

Start point - pinger.js

To start application you need to instal nodeJS, then type in console node "path/pinger.js".

Convert from xls to JSON - convertdata.js:
1) You must rename xls file to "data.xls" and place it in the same folder with "convertdata.js". 
2) Then run "node path/convertdata.js".
3) If console message say "ok, switches number = ", then in this folder will appear file "data.json".
4) To update database you must replace file "data.json" to the application folder "/data/", then rename file to "db.json".
5) Now you can remove file "data.xls" and restart pinger.
Thats all.
