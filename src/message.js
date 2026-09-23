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

function msgParser(msgBuffer) {
  const length = msgBuffer.readUInt32BE(0);

  if (length === 0) {
    return { id: null, payload: null };
  }
  const id = msgBuffer.readUInt8(4);

  const payload = msgBuffer.length > 5 ? msgBuffer.slice(5, 4 + length) : null;

  return { id, payload, length };
}

function buildKeepAlive() {
  const buf = Buffer.alloc(4);

  return buf;
}

function buildChoke() {
  const buf = Buffer.alloc(5);

  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(0, 4);
  return buf;
}

function buildUnChoke() {
  const buf = Buffer.alloc(5);

  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(1, 4);

  return buf;
}

function buildInterested() {
  const buf = Buffer.alloc(5);

  buf.writeUInt32BE(1, 0);

  buf.writeUInt8(2, 4);

  return buf;
}

function buildUnInterested() {
  const buf = Buffer.alloc(5);

  buf.writeUInt32BE(1, 0);
  buf.writeUInt8(3, 4);

  return buf;
}

function buildHave(payload) {
  const buf = Buffer.alloc(9);

  buf.writeUInt32BE(5, 0);
  buf.writeUInt8(4, 4);
  buf.writeUInt32BE(payload, 5);

  return buf;
}

function buildBitField(bitfield) {
  const buf = Buffer.alloc(bitfield.length + 5);

  buf.writeUInt32BE(bitfield.length + 1, 0);
  buf.writeUInt8(5, 4);
  bitfield.copy(buf, 5);
  return buf;
}

function buildRequest(payload) {
  const buf = Buffer.alloc(17);

  buf.writeUInt32BE(13, 0);
  buf.writeUInt8(6, 4);

  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  buf.writeUInt32BE(payload.length, 13);

  return buf;
}

function buildPiece(payload) {
  const buf = Buffer.alloc(payload.block.length + 13);

  buf.writeUInt32BE(payload.block, length + 9, 0);
  buf.writeUInt8(7, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);

  payload.block.copy(buf, 13);

  return buf;
}

function buildCancel(payload) {
  const buf = Buffer.alloc(17);

  buf.writeUInt32BE(13, 0);
  buf.writeUInt8(8, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  buf.writeUInt32BE(payload.length, 13);

  return buf;
}

function buildPort(payload) {
  const buf = Buffer.alloc(7);

  buf.writeUInt32BE(3, 0);
  buf.writeUInt8(9, 4);
  buf.writeUInt16BE(payload, 5);

  return buf;
}

module.exports = {
  buildHandshake,
  msgParser,
  buildBitField,
  buildCancel,
  buildChoke,
  buildHave,
  buildInterested,
  buildKeepAlive,
  buildPiece,
  buildPort,
  buildRequest,
  buildUnChoke,
  buildUnInterested,
};
