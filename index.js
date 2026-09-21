"use strict";
const fs = require("fs");
const { decodeNext } = require("./src/bencode.js");
('const torrentBuffer = fs.readFileSync("./debian.iso.torrent");');
const testBuffer = Buffer.from("i42e");
const result = decodeNext(testBuffer, 0);

console.log("Parsed Value: ", result.value);
console.log("Next Cursor Position: ", result.cursor);
