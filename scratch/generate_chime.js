const fs = require('fs');

const sampleRate = 44100;
const duration = 0.5; // seconds
const numSamples = Math.floor(sampleRate * duration);
const buffer = Buffer.alloc(44 + numSamples * 2);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);

// fmt chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
buffer.writeUInt16LE(1, 22);  // NumChannels (1)
buffer.writeUInt32LE(sampleRate, 24); // SampleRate
buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
buffer.writeUInt16LE(2, 32);  // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample

// data chunk
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);

// Generate 2-note glass chime: Note 1 (E6: 1318.5Hz) at t=0, Note 2 (B6: 1975.5Hz) at t=0.08
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  
  // Note 1 (E6 = 1318.51 Hz)
  let amp1 = Math.exp(-t * 12); // fast natural glass decay
  let val1 = Math.sin(2 * Math.PI * 1318.51 * t) * amp1 * 0.5;
  let val1_harm = Math.sin(2 * Math.PI * 2637.02 * t) * amp1 * 0.15; // 2nd harmonic
  
  // Note 2 (B6 = 1975.53 Hz) starting at 0.07s
  let val2 = 0;
  if (t >= 0.07) {
    const t2 = t - 0.07;
    let amp2 = Math.exp(-t2 * 10);
    val2 = Math.sin(2 * Math.PI * 1975.53 * t2) * amp2 * 0.6;
  }
  
  let sample = (val1 + val1_harm + val2);
  sample = Math.max(-1, Math.min(1, sample)); // clamp
  
  const int16 = Math.floor(sample * 32767);
  buffer.writeInt16LE(int16, 44 + i * 2);
}

const b64 = buffer.toString('base64');
console.log('BASE64_LENGTH:', b64.length);
fs.writeFileSync('scratch/chime_b64.txt', 'data:audio/wav;base64,' + b64);
