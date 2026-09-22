"use strict";

function decodeString(torrentBuffer, cursor) {
  let lengthString = "";

  while (torrentBuffer[cursor] !== 58) {
    lengthString += String.fromCharCode(torrentBuffer[cursor]);
    cursor++;
  }

  cursor++;

  const length = parseInt(lengthString, 10);
  const stringData = torrentBuffer.slice(cursor, cursor + length);

  cursor += length;

  return {
    value: stringData,
    cursor: cursor,
  };
}

function decodeInt(torrentBuffer, cursor) {
  cursor++;
  const start = cursor;

  while (torrentBuffer[cursor] !== 101) {
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

function decodeLists(torrentBuffer, cursor) {
  cursor++;
  const list = [];

  while (torrentBuffer[cursor] !== 101) {
    const result = decodeNext(torrentBuffer, cursor);
    list.push(result.value);
    cursor = result.cursor;
  }
  cursor++;
  return {
    value: list,
    cursor: cursor,
  };
}

function decodeDictionary(torrentBuffer, cursor) {
  cursor++;

  const dict = {};

  while (torrentBuffer[cursor] !== 101) {
    const keyResult = decodeNext(torrentBuffer, cursor);
    cursor = keyResult.cursor;

    const valueResult = decodeNext(torrentBuffer, cursor);
    cursor = valueResult.cursor;

    dict[keyResult.value] = valueResult.value;
  }
  cursor++;

  return {
    value: dict,
    cursor: cursor,
  };
}

function decodeNext(buffer, cursor) {
  const byte = buffer[cursor];

  if (byte === 105) {
    return decodeInt(buffer, cursor);
  }

  if (byte === 108) {
    return decodeLists(buffer, cursor);
  }

  if (byte === 100) {
    return decodeDictionary(buffer, cursor);
  }

  return decodeString(buffer, cursor);
}

function encode(data) {
  const buffers = [];

  if (typeof data === "number") {
    return Buffer.from(`i${data}e`);
  }

  if (Buffer.isBuffer(data)) {
    const length = data.length;
    const prefix = Buffer.from(length + ":");
    return Buffer.concat([prefix, data]);
  }

  if (Array.isArray(data)) {
    buffers.push(Buffer.from("l"));
    for (const item of data) {
      buffers.push(encode(item));
    }
    buffers.push(Buffer.from("e"));

    return Buffer.concat(buffers);
  }

  if (typeof data === "object") {
    buffers.push(Buffer.from("d"));

    const keys = Object.keys(data).sort();
    for (const key of keys) {
      buffers.push(encode(Buffer.from(key)));
      buffers.push(encode(data[key]));
    }
    buffers.push(Buffer.from("e"));
    return Buffer.concat(buffers);
  }
}

module.exports = {
  decodeNext,
  decodeString,
  decodeInt,
  decodeLists,
  decodeDictionary,
  encode,
};
