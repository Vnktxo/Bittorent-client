"use strict";

const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");

let peer_id = null;

function buildPeerId() {
  if (!peer_id) {
    peer_id = crypto.randomBytes(20);
    Buffer.from("-TR2940-").copy(peer_id, 0);
  }
  return peer_id;
}

function urlEncodeHash(buffer) {
  let encoded = "";

  for (const byte of buffer) {
    encoded += "%" + byte.toString(16).padStart(2, "0");
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

function getPeers(trackerUrl, callback) {
  const myUrl = new URL(trackerUrl);

  const options = {
    hostname: myUrl.hostname,
    port: myUrl.port || 80,
    path: myUrl.pathname + myUrl.search,
    method: "GET",
    headers: {
      "User-Agent": "Transmission/2.94",
      Connection: "close",
    },
  };

  const req = http.get(options, (res) => {
    const chunks = [];

    res.on("data", (chunk) => {
      chunks.push(chunk);
    });

    res.on("end", () => {
      const responseBuffer = Buffer.concat(chunks);
      callback(responseBuffer);
    });
  });

  req.on("error", (err) => {
    console.error("Network Error:", err.message);
  });

  req.end();
}

function parsePeer(peersBuffer) {
  const peers = [];

  for (let i = 0; i + 6 <= peersBuffer.length; i += 6) {
    const extractedIp = `${peersBuffer[i]}.${peersBuffer[i + 1]}.${peersBuffer[i + 2]}.${peersBuffer[i + 3]}`;
    const extractedPort = peersBuffer.readUInt16BE(i + 4);

    peers.push({ extractedIp, extractedPort });
  }
  return peers;
}

function parsePeerV6(peersBuffer) {
  const peers = [];
  for (let i = 0; i + 18 <= peersBuffer.length; i += 18) {
    const ipBytes = peersBuffer.slice(i, i + 16);
    const ip = ipBytes
      .toString("hex")
      .match(/.{1,4}/g)
      .join(":");
    const port = peersBuffer.readUInt16BE(i + 16);
    peers.push({ ip, port });
  }
  return peers;
}

module.exports = {
  buildTrackerUrl,
  buildPeerId,
  getPeers,
  parsePeer,
  parsePeerV6,
};
