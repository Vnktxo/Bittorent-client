# Node.js BitTorrent Client (v1.0)

A single-peer BitTorrent client built from scratch in Node.js. This project implements the core pieces of the BitTorrent specification without relying on external networking or torrenting libraries — from raw bencode decoding to TCP peer-wire messaging and cryptographic piece verification.

## Core Features

- **Custom Bencode Engine** — Parses and encodes torrent metadata dictionaries and lists directly from memory buffers, with no external parsing library.
- **Tracker Communication** — Computes the SHA-1 info hash, generates a peer ID, builds the HTTP tracker request, and decodes compact binary peer lists (IPv4) from the response.
- **Peer Wire Protocol (PWP)** — Implements the handshake, and message types including bitfield, interested/unchoke, request, and piece.
- **Stateful TCP Stream Parser** — Accumulates raw socket bytes across TCP fragmentation and splits them into complete, length-prefixed protocol messages.
- **Piece Manager & Job Queue** — Tracks per-block request/received state across a 2D grid (piece × 16KB block), with a pre-computed queue for dispatching block requests and a `resetPiece` recovery path that re-queues a piece's blocks if its hash check fails.
- **Cryptographic Verification** — Buffers incoming blocks in memory until a full piece is assembled, then SHA-1-hashes it against the expected hash from the `.torrent` file before accepting it.
- **Disk Persistence** — Writes verified pieces to the output file at their correct byte offset via `fs.write`.

## Architecture

- `src/bencode.js` — Recursive buffer parser/encoder that translates between the bencode format and JavaScript objects.
- `src/tracker.js` — Builds the HTTP tracker announce URL, URL-encodes binary hashes, and parses the compact peer list.
- `src/message.js` — Protocol builder/parser for the byte-level peer-wire messages.
- `src/pieces.js` — State machine for the block/piece grid, the request queue, and re-queuing logic for failed verification.
- `index.js` — Main execution: reads the torrent file, contacts the tracker, connects to a peer, drives the message loop, verifies hashes, and writes to disk.

## Usage

1. Clone the repository and navigate to the project directory.
2. Place a valid `.torrent` file (e.g. `debian.iso.torrent`) in the project root and reference it in `index.js`.
3. Run the client:

   ```bash
   node index.js
   ```

4. The client contacts the tracker, connects to a peer, negotiates unchoke, and downloads + verifies the file to disk block by block.

Confirmed working end-to-end: a manual run successfully downloaded and hash-verified ~30MB of a Debian ISO before being stopped manually (see Known Limitations — the client doesn't yet exit on its own once a download finishes).

## Environment & Compatibility

This client was built and tested on **Arch Linux**.
_Note for Windows users:_ If you encounter `fs` routing errors, ensure that your local path separators in `index.js` (e.g., `./debian.iso.torrent`) are properly resolved for your environment, or utilize Node's native `path.join()` module.

## Known Limitations

- **Single peer only** — connects to one peer at a time from the tracker's list; does not fan out to a swarm.
- **No choke-state tracking** — if the connected peer sends `choke` mid-download, the client currently keeps issuing requests rather than pausing, which can stall progress silently.
- **No completion handling** — once the job queue empties, the client doesn't yet close the file descriptor, end the socket, or exit cleanly.
- **HTTP trackers only** — UDP tracker announce (BEP 15) isn't implemented.
- **No seeding / upload path** — this is a downloader only.

## Roadmap

- Fix known limitations above (choke handling, clean completion/exit).
- **Concurrency** — move from a single peer connection to a multi-peer swarm pulling from the shared `Pieces` queue.
- **UDP tracker support.**
- **Upload/choking algorithm** — serve verified pieces back to the network.
