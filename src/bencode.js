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

module.exports = {
  decodeString,
};
