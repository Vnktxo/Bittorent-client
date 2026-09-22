"use strict";
const fs = require("fs");
const { decodeNext } = require("./src/bencode.js");

const torrentBuffer = fs.readFileSync("./debian.iso.torrent");

const result = decodeNext(torrentBuffer, 0);

const announceUrl = result.value[Buffer.from("announce")].toString("utf8");

console.log(announceUrl);
