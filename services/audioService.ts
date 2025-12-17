export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private beatCount: number = 0;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private timerID: number | null = null;

  // Cyberpunk Arpeggio Scale (Minor Pentatonic-ish)
  private notes = [110, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63]; 
  private bassNote = 55;

  constructor() {
    // Lazy init via start()
  }

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64; // Low resolution for visual punch
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
  }

  public start() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;
    this.nextNoteTime = this.ctx!.currentTime;
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID) window.clearTimeout(this.timerID);
    if (this.ctx) this.ctx.suspend();
  }

  public getAnalysis(): number {
    if (!this.analyser) return 0;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    return sum / bufferLength; // 0 - 255
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / 120.0; // 120 BPM
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.beatCount++;
    
    if (this.beatCount % 4 === 0) {
        this.playOsc(this.notes[Math.floor(Math.random() * this.notes.length)], 'square', 0.1, 0.1);
    }
    if (this.beatCount % 8 === 0) {
        this.playOsc(this.bassNote, 'sawtooth', 0.2, 0.4);
    }
    // Hi-hats
    this.playNoise(0.05);
  }

  private playOsc(freq: number, type: OscillatorType, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(vol, this.nextNoteTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.nextNoteTime);
    osc.stop(this.nextNoteTime + duration);
  }

  private playNoise(duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, this.nextNoteTime);
    gain.gain.linearRampToValueAtTime(0.01, this.nextNoteTime + duration);
    
    // Simple filter to make it sound like a hi-hat
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(this.nextNoteTime);
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }
}
