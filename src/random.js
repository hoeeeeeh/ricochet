export class XorShift32 {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }
  next() {
    // xorshift32
    let x = this.state >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  nextFloat() {
    return (this.next() >>> 0) / 0xffffffff;
  }
  nextInt(maxExclusive) {
    return Math.floor(this.nextFloat() * maxExclusive);
  }
  pick(arr) {
    return arr[this.nextInt(arr.length)];
  }
}


