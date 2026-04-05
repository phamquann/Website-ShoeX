const crypto = require('crypto');

class BloomFilter {
  constructor(sizeBits = 1 << 20, hashCount = 5) {
    this.sizeBits = Math.max(1024, sizeBits);
    this.hashCount = Math.max(2, hashCount);
    this.bytes = new Uint8Array(Math.ceil(this.sizeBits / 8));
  }

  _positions(value) {
    const text = String(value || '');
    const digest = crypto.createHash('sha256').update(text).digest();
    const positions = [];

    for (let i = 0; i < this.hashCount; i += 1) {
      const seed = digest.readUInt32BE((i * 4) % (digest.length - 4));
      positions.push(seed % this.sizeBits);
    }

    return positions;
  }

  add(value) {
    if (!value) return;

    for (const pos of this._positions(value)) {
      const byteIndex = Math.floor(pos / 8);
      const bitMask = 1 << (pos % 8);
      this.bytes[byteIndex] |= bitMask;
    }
  }

  mightContain(value) {
    if (!value) return false;

    for (const pos of this._positions(value)) {
      const byteIndex = Math.floor(pos / 8);
      const bitMask = 1 << (pos % 8);
      if ((this.bytes[byteIndex] & bitMask) === 0) {
        return false;
      }
    }

    return true;
  }
}

const checkoutIdempotencyBloom = new BloomFilter(1 << 20, 5);

module.exports = {
  BloomFilter,
  checkoutIdempotencyBloom
};
