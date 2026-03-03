export default class ECGDataBuffer {
  private buffer: number[] = [];
  private timer: any = null;

  private sampleRate = 250;
  private frameRate = 60;
  private accumulator = 0;

  onOutputBatch?: (batch: number[]) => void;

  appendDataArray(data: number[]) {
    this.buffer.push(...data);
  }

  startOutput() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.outputBatch();
    }, 16);
  }

  stopOutput() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private outputBatch() {
    if (this.buffer.length === 0) return;

    this.accumulator += this.sampleRate / this.frameRate;
    const count = Math.floor(this.accumulator);
    this.accumulator -= count;

    const batch = this.buffer.splice(0, count);

    if (batch.length > 0) {
      this.onOutputBatch?.(batch);
    }
  }
}