var BLOCK_LENGTH = 16 * 1024
var url = require('url');
var http = require('http');
var BlockStream = require('block-stream')
module.exports = function(storage, pt, file_url, opts) {

  if(!opts) opts = {}
  var pieceIndex = opts.pieceIndex || 0;
  var reserve = opts.reserve || 5;
  
  var firstByte = storage.pieceLength * (pieceIndex);
  if(firstByte < 0) {
    firstByte = 0;
  }
  var options = {
    headers: {
			range: 'bytes='+ firstByte +  '-'
		},
    host: url.parse(file_url).host,
    port: 80,
    path: url.parse(file_url).pathname
  };
  
  if(!pt.reserve(pieceIndex)) {
    return;
  }
  var max_piece = pieceIndex;
  for (var i = pieceIndex + 1; i < pieceIndex + reserve; i++) {
    if(pt.reserve(i)) {
      max_piece = i;
    } else {
     break; 
    }
  }
  
  console.log("downloading");
  http.get(options, function(res) {
    res.pipe(new BlockStream(storage.pieceLength, { nopad: true }))
    .on('data', function (piece) {
      var index = pieceIndex
      pieceIndex += 1
      if(pt.reserve(max_piece + 1)) {
         max_piece++;
      }
      if(index > max_piece) {
        res.destroy();
        return;
      }
      var blockIndex = 0
      var s = new BlockStream(BLOCK_LENGTH, { nopad: true })
      s.on('data', function (block) {
        var offset = blockIndex * BLOCK_LENGTH
        blockIndex += 1

        storage.writeBlock(index, offset, block)
      })
      s.write(piece)
      s.end()
    })
    .on('end', function () {
    })
    .on('error', function (err) {
    })
  });

}