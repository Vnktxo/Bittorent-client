"use strict";

const net = require("net");
const fs = require("fs");
const crypto = require("crypto");

const { decodeNext, encode } = require("./src/bencode.js");
const {
  buildTrackerUrl,
  buildPeerId,
  getPeers,
  parsePeer,
} = require("./src/tracker.js");
const { buildHandshake } = require("./src/message.js");

const torrentBuffer = fs.readFileSync("./debian.iso.torrent");
const result = decodeNext(torrentBuffer, 0);

const info = result.value.info;
const infoBuffer = encode(info);
const infoHash = crypto.createHash("sha1").update(infoBuffer).digest();

const trackerUrl = buildTrackerUrl(result.value, infoHash);
console.log("Contacting tracker rn...");

getPeers(trackerUrl, (responseBuffer) => {
  console.log("Tracker Responded gng!");
  const trackerResponse = decodeNext(responseBuffer, 0);
  console.log(trackerResponse.value);

  const peers = parsePeer(trackerResponse.value.peers);
  const peer = peers[0];

  console.log(`Connecting to ${peer.extractedIp}:${peer.extractedPort}...`);

  const socket = new net.Socket();

  socket.connect(peer.extractedPort, peer.extractedIp, () => {
    console.log("TCP Connection establishes gng! Sending handshake...");

    const rawPeerId = buildPeerId();
    const handshake = buildHandshake(infoHash, rawPeerId);

    socket.write(handshake);
  });

  socket.on("data", (data) => {
    console.log("Peer replied son!", data);
  });

  socket.on("error", (err) => {
    console.error(`Connection failed: ${err.message}`);
  });
});
