"use strict";

const http = require("http");
const crypto = require("crypto");

let peer_id = null;

function buildPeerId() {
  if (!peer_id) {
    peer_id = crypto.randomBytes(20);
    Buffer.from("-VT0001-").copy(peer_id, 0);
  }
  return peer_id;
}

function urlEncodeHash(buffer) {
  let encoded = "";

  for (const byte of buffer) {
    encoded = "%" + byte.toString(16).padStart(2, "0");
  }
  return encoded;
}

function getSize(info) {
  return info.length;
}

function buildTrackerUrl(torrent, infoHash) {
  const baseUrl = torrent.announce.toString("utf8");

  const urlEncode = urlEncodeHash(infoHash);

  const rawPeerId = buildPeerId();

  const encodedPeerId = urlEncodeHash(rawPeerId);

  const size = getSize(torrent.info);

  const finalUrl = `${baseUrl}?info_hash=${urlEncode}&peer_id=${encodedPeerId}&port=6881&uploaded=0&downloaded=0&left=${size}&compact=1`;

  return finalUrl;
}

module.exports = {
  buildTrackerUrl,
};
