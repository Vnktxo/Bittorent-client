"use strict";
const fs = require("fs");
const { decodeString } = require("./src/bencode.js");
const torrentBuffer = fs.readFileSync("./debian.iso.torrent");
const result = decodeString(torrentBuffer, 1);

console.log("Parsed Value: ", result.value);
console.log("Next Cursor Position: ", result.cursor);
