const express = require('express');
const bodyParser = require('body-parser');
const webSocketServer = require('./websocketserver.js');

const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

var key = fs.readFileSync(__dirname + '/../server.key');
var cert = fs.readFileSync(__dirname + '/../server.cert');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

webSocketServer.startServer(key, cert);


app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});
//app.listen(80);

var options = {
  key: key,
  cert: cert
};
var server = https.createServer(options, app);

server.listen(443, () => {
  console.log("server starting on port : " + 443)
});
