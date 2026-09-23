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
const {
  buildHandshake,
  msgParser,
  buildInterested,
  buildRequest,
} = require("./src/message.js");

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
  let peerIndex = 0;

  function tryNextPeer() {
    if (peerIndex >= peers.length) {
      console.log("Exhausted all peers in the list.");
      return;
    }

    const peer = peers[peerIndex];
    console.log(
      `\nAttempting peer ${peerIndex}: ${peer.extractedIp}:${peer.extractedPort}...`,
    );

    const socket = new net.Socket();
    let savedBuffer = Buffer.alloc(0);
    let handshakeComplete = false;

    // 1. Set a 3-second timeout. If they don't answer, we drop them.
    socket.setTimeout(3000);

    socket.connect(peer.extractedPort, peer.extractedIp, () => {
      console.log("TCP Connection established! Sending handshake...");

      // We connected! Turn off the timeout so we don't kill a healthy download.
      socket.setTimeout(0);

      const rawPeerId = buildPeerId();
      const handshake = buildHandshake(infoHash, rawPeerId);
      socket.write(handshake);
    });

    socket.on("data", (data) => {
      savedBuffer = Buffer.concat([savedBuffer, data]);

      if (!handshakeComplete) {
        if (savedBuffer.length >= 68) {
          handshakeComplete = true;
          console.log("Handshake received!");
          savedBuffer = savedBuffer.slice(68);
        } else {
          return;
        }
      }

      while (savedBuffer.length >= 4) {
        const msgLength = savedBuffer.readUInt32BE(0);

        if (savedBuffer.length >= 4 + msgLength) {
          const fullMessage = savedBuffer.slice(0, 4 + msgLength);
          const parsed = msgParser(fullMessage);
          console.log(
            `Received Message ID: ${parsed.id}, Length: ${parsed.length}`,
          );

          if (parsed.id === 5) {
            console.log(
              "Recieved Bitfield! Informing peer we are interested...",
            );
            socket.write(buildInterested());
          }

          if (parsed.id === 1) {
            console.log("Peer unchoked us! We are cleared to request data...");

            const requestPayload = {
              index: 0,
              begin: 0,
              length: 16384,
            };
            console.log("Asking for Piece 0, Block offset 0...");
            socket.write(buildRequest(requestPayload));
          }

          if (parsed.id === 7) {
            console.log(
              `LESSSSGOOO! Recieved Piece Data! Paylaod Size: ${parsed.payload.length} bytes`,
            );

            socket.destroy();
          }

          savedBuffer = savedBuffer.slice(4 + msgLength);
        } else {
          break;
        }
      }
    });

    // 2. Handle Errors and Timeouts by destroying the socket and trying the next peer
    socket.on("error", (err) => {
      console.log(`Connection failed: ${err.message}. Moving to next peer...`);
      socket.destroy();
      peerIndex++;
      tryNextPeer();
    });

    socket.on("timeout", () => {
      console.log("Connection timed out. Moving to next peer...");
      socket.destroy();
      peerIndex++;
      tryNextPeer();
    });
  }

  tryNextPeer();
});
