"use strict";

class Pieces {
  constructor(torrentInfo) {
    this.pieceLength = torrentInfo["piece length"];

    this.totalLength = torrentInfo.files
      ? torrentInfo.files.map((file) => file.length).reduce((a, b) => a + b)
      : torrentInfo.length;

    this.requested = this.buildGrid();
    this.received = this.buildGrid();

    this.queue = this.buildQueue();
  }

  buildGrid() {
    const totalPieces = Math.ceil(this.totalLength / this.pieceLength);
    const blocksPerPiece = Math.ceil(this.pieceLength / 16384);

    return Array.from({ length: totalPieces }, () => {
      return new Array(blocksPerPiece).fill(false);
    });
  }

  buildQueue() {
    const queue = [];
    const totalPieces = Math.ceil(this.totalLength / this.pieceLength);

    for (let pieceIndex = 0; pieceIndex < totalPieces; pieceIndex++) {
      const pieceSize =
        pieceIndex === totalPieces - 1
          ? this.totalLength % this.pieceLength || this.pieceLength
          : this.pieceLength;

      const blocksPerPiece = Math.ceil(pieceSize / 16384);

      for (let blockIndex = 0; blockIndex < blocksPerPiece; blockIndex++) {
        const blockSize =
          blockIndex === blocksPerPiece - 1
            ? pieceSize % 16384 || 16384
            : 16384;

        queue.push({
          index: pieceIndex,
          begin: blockIndex * 16384,
          length: blockSize,
        });
      }
    }
    return queue;
  }

  // in pieces.js
  resetPiece(index) {
    const blocksPerPiece = this.requested[index].length;

    this.requested[index].fill(false);
    this.received[index].fill(false);

    const pieceSize =
      index === this.requested.length - 1
        ? this.totalLength % this.pieceLength || this.pieceLength
        : this.pieceLength;

    for (let blockIndex = 0; blockIndex < blocksPerPiece; blockIndex++) {
      const blockSize =
        blockIndex === blocksPerPiece - 1
          ? pieceSize % 16384 || 16384
          : pieceSize % 16384 === 0
            ? 16384
            : 16384;

      this.queue.push({
        index,
        begin: blockIndex * 16384,
        length: Math.min(16384, pieceSize - blockIndex * 16384),
      });
    }
  }

  dequeue() {
    return this.queue.shift();
  }

  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.begin / 16384;
    this.requested[pieceBlock.index][blockIndex] = true;
  }

  addReceived(pieceBlock) {
    const blockIndex = pieceBlock.begin / 16384;
    this.received[pieceBlock.index][blockIndex] = true;
  }

  needed(pieceBlock) {
    if (this.requested.length === 0) {
      return false;
    }
    const blockIndex = pieceBlock.begin / 16384;
    return (
      !this.requested[pieceBlock.index][blockIndex] &&
      !this.received[pieceBlock.index][blockIndex]
    );
  }
}
module.exports = Pieces;
