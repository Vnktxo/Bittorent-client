"use strict";

function decodeString(torrentBuffer, cursor) {
  let lengthString = "";

  while (torrentBuffer[cursor] != 58) {
    lengthString += String.fromCharCode(torrentBuffer[cursor]);
    cursor++;
  }

  cursor++;

  const length = parseInt(lengthString, 10);
  const stringData = torrentBuffer.slice(cursor, cursor + length);
  const result = stringData.toString("utf8");

  cursor += length;

  return {
    value: result,
    cursor: cursor,
  };
}

function decodeInt(torrentBuffer, cursor) {
  cursor++;
  const start = cursor;

  while (torrentBuffer[cursor] != 101) {
    cursor++;
  }

  const intString = torrentBuffer.toString("ascii", start, cursor);
  cursor++;

  const value = parseInt(intString, 10);

  return {
    value: value,
    cursor: cursor,
  };
}

function decodeNext(buffer, cursor) {
  const byte = buffer[cursor];

  if (byte === 105) {
    return decodeInt(buffer, cursor);
  }

  return decodeString(buffer, cursor);
}

module.exports = {
  decodeNext,
  decodeString,
  decodeInt,
};
