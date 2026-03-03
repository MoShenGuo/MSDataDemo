import EcgRingBuffer from "./EcgRingBuffer";

export default class EcgController {
  buffer: EcgRingBuffer;
  listeners: (() => void)[] = [];

  constructor(capacity: number) {
    this.buffer = new EcgRingBuffer(capacity);
  }

  addRawBatch(data: number[]) {
    this.buffer.addBatch(data);
    this.notify();
  }

  addRaw(value: number) {
    this.buffer.add(value);
    this.notify();
  }

  get data() {
    return this.buffer.getSnapshot();
  }

  get max() {
    return this.buffer.maxValue;
  }

  get min() {
    return this.buffer.minValue;
  }

  subscribe(fn: () => void) {
    this.listeners.push(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }
}