// Algoritma: Casiez et al. "1€ Filter"
export class OneEuroFilter {
  freq: number;
  mincutoff: number;
  beta: number;
  dcutoff: number;
  xPrev: number | null;
  dxPrev: number;
  lastTime: number | null;

  constructor(freq = 30, mincutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
    this.freq = freq;
    this.mincutoff = mincutoff;
    this.beta = beta; // 0.007 is a good starting point for responsiveness
    this.dcutoff = dcutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.lastTime = null;
  }

  alpha(cutoff: number) {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp: number | null = null) {
    // Update frequency based on timestamps if provided
    if (timestamp != null && this.lastTime != null) {
      const dt = Math.max(1e-6, (timestamp - this.lastTime) / 1000); // seconds
      this.freq = 1.0 / dt;
    }
    this.lastTime = timestamp ?? this.lastTime;

    if (this.xPrev == null) {
      this.xPrev = value;
      this.dxPrev = 0;
      return value;
    }

    const dx = (value - this.xPrev) * this.freq;
    const edalpha = this.alpha(this.dcutoff);
    const dxHat = edalpha * dx + (1 - edalpha) * this.dxPrev;

    const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff);
    const xHat = a * value + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}
