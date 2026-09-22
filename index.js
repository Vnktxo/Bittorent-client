"use strict";
const fs = require("fs");
const crypto = require("crypto");
const { decodeNext, encode } = require("./src/bencode.js");
const { buildTrackerUrl } = require("./src/tracker.js");

const torrentBuffer = fs.readFileSync("./debian.iso.torrent");
const result = decodeNext(torrentBuffer, 0);

const info = result.value.info;
const infoBuffer = encode(info);
const infoHash = crypto.createHash("sha1").update(infoBuffer).digest();

const trackerUrl = buildTrackerUrl(result.value, infoHash);
console.log(trackerUrl);
