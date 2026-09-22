"use strict";

const Buffer = require("buffer").Buffer;

function buildHandshake(infoHash, peerId) {
  const buf = Buffer.alloc(68);

  buf.writeUInt8(19, 0);
  buf.write("BitTorrent protocol", 1);

  infoHash.copy(buf, 28);
  peerId.copy(buf, 48);

  return buf;
}

module.exports = {
  buildHandshake,
};
