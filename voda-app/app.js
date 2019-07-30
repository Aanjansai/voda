var restify = require('restify');
var Client = require('ssh2').Client;


const server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.get('/', function (req, res, next) {
  var string = '';
  var conn = new Client();
  conn.on('ready', function() {
    console.log('Client :: ready');
    conn.exec('cat dockerlogs.sh', function(err, stream) {
      if (err) throw err;
      stream.on('close', function(code, signal) {
        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        conn.end();
      }).on('data', function(data) {
        console.log('STDOUT: ' + data);
         string += data.toString();
         res.send(string);
      }).stderr.on('data', function(data) {
        console.log('STDERR: ' + data);
      });
    });
  }).connect({
    host: '1.tcp.ap.ngrok.io',
    port: 20191,
    username: 'chatbot',
    password: 'Ch@tb0t'
  });
});


server.get('/2g', function(req, res, next){
  const { exec } = require('child_process');
  exec('cat ./data/2g.txt', function(err, stdout, stderr){
    if(err){
      next(err);
    }else{
      var resultObj = {};
      var allLinesWithSpaces = stdout.split('\n');
      var allLinesWithOutSpaces = removeSpacesBetweenLines(allLinesWithSpaces);
      findSectorStatus(allLinesWithOutSpaces, resultObj);
      findChannelStatus(allLinesWithOutSpaces, resultObj);
      res.send(resultObj);
    }
  })
})

server.get('/3g', function(req, res, next){
  const { exec } = require('child_process');
  exec('cat ./data/3g.txt', function(err, stdout, stderr){
    if(err){
      next(err);
    }else{
      var allLinesWithSpaces = stdout.split('\n');
      var allLinesWithOutSpaces = removeSpacesBetweenLines(allLinesWithSpaces);
      res.send(findSiteStatus(allLinesWithOutSpaces));
    }
  })
})

function findSiteStatus(allLinesWithOutSpaces){
  var siteObjects = [];
  allLinesWithOutSpaces.forEach(function(rec, index){
    if(rec == 'Proxy Adm State Op. State MO'){
      var keys = rec.split(' ');
      for(var i = index+2; i < allLinesWithOutSpaces.length; i++){
        var obj = {};
        var values = allLinesWithOutSpaces[i].split(' ');
        if(keys.length == values.length){
          keys.forEach(function(key, keyIndex){
            obj[key] = values[keyIndex];
          })
          siteObjects.push(obj);
        }
      }
    }
  })
  return siteObjects;
}


function findChannelStatus(allLinesWithOutSpaces, resultObj){
  var channelObjects = [];
  var channels = [];
  allLinesWithOutSpaces.forEach(function(rec, index){
      if(rec == 'BPC CHANNEL CHRATE SPV STATE ICMBAND CHBAND 64K USE'){
        if(channels.includes(rec)){

        }else{
          channels.push(rec);
        }
      }else{
        if(channels.length > 0){
          channels.push(rec);
        }
      }
  })
  channels.forEach(function(rec, index){
    if(rec == 'BPC CHANNEL CHRATE SPV STATE ICMBAND CHBAND 64K USE'){
      var keys = rec.split(' ');
      for(var i = index+1; i < channels.length; i++){
        var obj = {};
        var values = channels[i].split(' ');
        if(keys.length == values.length){
          keys.forEach(function(key, keyIndex){
            obj[key] = values[keyIndex];
          })
          channelObjects.push(obj);
        }
      }
    }
  })
  resultObj.BUSYCHANNELS = channelObjects;
}

function findSectorStatus(allLinesWithOutSpaces, resultObj){
  var sectorObj = {};
  allLinesWithOutSpaces.forEach(function(rec, index){
    if(rec == 'CELL BCCH CBCH SDCCH NOOFTCH QUEUED ECBCCH'){
      var keys = rec.split(' ');
      var values = allLinesWithOutSpaces[index + 1].split(' ');
      keys.forEach(function(key, index){
        sectorObj[key] = values[index];
      })
      if(sectorObj.BCCH == '1'){
        resultObj.sector = 'up'
      }else{
        resultObj.sector = 'down'
      }
    }
  })
}

function removeSpacesBetweenLines(allLinesWithSpaces){
  var allLinesWithOutSpaces = [];
  allLinesWithSpaces.forEach(function(eachLine){
    eachLine = eachLine.replace(/  +/g, ' ');
    if(eachLine == ''){
      return;
    }else{
      allLinesWithOutSpaces.push(eachLine);
    }
  })
  return allLinesWithOutSpaces;
}

function findState(key, channelSet){
  var found = channelSet.find(function(element){
    return element.CHANNEL = key;
  })
  return found;
}

server.listen(5000, function () {
  console.log('%s listening at %s', server.name, server.url);
});
