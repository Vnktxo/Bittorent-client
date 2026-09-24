"use strict";

const net = require("net");
const fs = require("fs");
const crypto = require("crypto");

const { decodeNext, encode } = require("./src/bencode.js");
const Pieces = require("./src/pieces.js");
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

const fd = fs.openSync("debian.iso", "w");
const torrentBuffer = fs.readFileSync("./debian.iso.torrent");
const result = decodeNext(torrentBuffer, 0);

const info = result.value.info;

const pieces = new Pieces(info);
console.log(`Job Queue loaded with ${pieces.queue.length} block requests`);

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

    const activePieces = {};

    socket.connect(peer.extractedPort, peer.extractedIp, () => {
      console.log("TCP Connection established! Sending handshake...");

      // We connected! Turn off the timeout so we don't kill a healthy download.
      socket.setTimeout(0);

      const rawPeerId = buildPeerId();
      const handshake = buildHandshake(infoHash, rawPeerId);
      socket.write(handshake);
    });

    function requestNextBlock() {
      const nextBlock = pieces.dequeue();

      if (nextBlock) {
        console.log(
          `Requesting Piece ${nextBlock.index}, Offset ${nextBlock.begin}...`,
        );
        socket.write(buildRequest(nextBlock));
        pieces.addRequested(nextBlock);
      } else {
        console.log("Queue is empty! We have requested everything.");
      }
    }

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
              "Received Bitfield! Informing peer we are interested...",
            );
            socket.write(buildInterested());
          }

          if (parsed.id === 1) {
            console.log("Peer unchoked us! Starting download...");
            requestNextBlock();
          }

          if (parsed.id === 7) {
            // Reconstruct the block info from the payload to mark it received
            const index = parsed.payload.readUInt32BE(0);
            const begin = parsed.payload.readUInt32BE(4);
            const blockData = parsed.payload.slice(8);

            if (!activePieces[index]) {
              const pieceSize =
                index === pieces.requested.length - 1
                  ? pieces.totalLength % pieces.pieceLength ||
                    pieces.pieceLength
                  : pieces.pieceLength;
              activePieces[index] = Buffer.alloc(pieceSize);
            }

            blockData.copy(activePieces[index], begin);
            pieces.addReceived({ index, begin });

            if (pieces.received[index].every((block) => block === true)) {
              console.log(`Piece ${index} complete. Verifying hash...`);

              const pieceBuffer = activePieces[index];
              const pieceHash = crypto
                .createHash("sha1")
                .update(pieceBuffer)
                .digest();

              const expectedHash = info.pieces.slice(
                index * 20,
                index * 20 + 20,
              );

              if (pieceHash.equals(expectedHash)) {
                console.log(`Hash verified! Writing Piece ${index} to disk...`);

                // Calculate exactly where this piece belongs in the final file
                const fileOffset = index * pieces.pieceLength;

                fs.write(
                  fd,
                  pieceBuffer,
                  0,
                  pieceBuffer.length,
                  fileOffset,
                  (err) => {
                    if (err) console.error("Write error:", err);
                    delete activePieces[index]; // Free memory so your RAM doesn't explode
                  },
                );
              } else {
                console.log(
                  `CRITICAL: Hash mismatch on Piece ${index}! Dropping data.`,
                );
                delete activePieces[index];
                pieces.resetPiece(index);
                // In a robust client, we would un-check this piece in the grid and re-queue it here
              }
            }

            // Instantly ask for the next block to keep the data flowing
            requestNextBlock();
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
