export default class EcgRingBuffer {
  private capacity: number;
  private data: number[];
  private writeIndex = 0;
  private size = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Array(capacity).fill(0);
  }

  add(value: number) {
    this.data[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    }
  }

  addBatch(values: number[]) {
    values.forEach(v => this.add(v));
  }

  getSnapshot(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(
        this.data[
          (this.writeIndex - this.size + i + this.capacity) % this.capacity
        ]
      );
    }
    return result;
  }

  get length() {
    return this.size;
  }

  get maxValue() {
    return this.size === 0 ? 0 : Math.max(...this.getSnapshot());
  }

  get minValue() {
    return this.size === 0 ? 0 : Math.min(...this.getSnapshot());
  }
}