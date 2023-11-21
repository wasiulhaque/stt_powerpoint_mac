export const getWavHeader = (options) => {
  const numFrames = options.numFrames;
  const numChannels = options.numChannels || 2;
  const sampleRate = options.sampleRate || 44100;
  const bytesPerSample = options.isFloat ? 4 : 2;
  const format = options.isFloat ? 3 : 1;

  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44);
  const dv = new DataView(buffer);

  let p = 0;

  function writeString(s) {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i));
    }
    p += s.length;
  }

  function writeUint32(d) {
    dv.setUint32(p, d, true);
    p += 4;
  }

  function writeUint16(d) {
    dv.setUint16(p, d, true);
    p += 2;
  }

  writeString("RIFF"); // ChunkID
  writeUint32(dataSize + 36); // ChunkSize
  writeString("WAVE"); // Format
  writeString("fmt "); // Subchunk1ID
  writeUint32(16); // Subchunk1Size
  writeUint16(format); // AudioFormat https://i.stack.imgur.com/BuSmb.png
  writeUint16(numChannels); // NumChannels
  writeUint32(sampleRate); // SampleRate
  writeUint32(byteRate); // ByteRate
  writeUint16(blockAlign); // BlockAlign
  writeUint16(bytesPerSample * 8); // BitsPerSample
  writeString("data"); // Subchunk2ID
  writeUint32(dataSize); // Subchunk2Size

  return new Uint8Array(buffer);
};

export const getWavBytes = (buffer, options) => {
  const type = options.isFloat ? Float32Array : Uint16Array;
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT;

  const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }));
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);

  // prepend header, then add pcmBytes
  wavBytes.set(headerBytes, 0);
  wavBytes.set(new Uint8Array(buffer), headerBytes.length);

  return wavBytes;
};

export const fileToAudioBuffer = (file) => {
  const context = new AudioContext();
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.addEventListener("load", () => {
      context.decodeAudioData(
        fileReader.result,
        (audioBuffer) => {
          resolve(audioBuffer);
        },
        reject
      );
    });
    fileReader.addEventListener("error", reject);
    fileReader.readAsArrayBuffer(file);
  });
};

export const chunkifyAudioBuffer = (audioBuffer, chunkSizeInSecond) => {
  const chunkSize = audioBuffer.sampleRate * chunkSizeInSecond; // Second
  const numChunks = Math.ceil(audioBuffer.length / chunkSize);
  const wavFiles = [];
  for (let j = 0; j < numChunks; j++) {
    const start = j * chunkSize;
    const end = start + chunkSize >= audioBuffer.length ? audioBuffer.length : start + chunkSize;

    if (audioBuffer.numberOfChannels === 2) {
      // Float32Array samples
      const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

      // const interleaved = new Float32Array(left.length + right.length)
      console.log(start, end);
      const interleaved = new Float32Array((end - start) * 2);
      for (let src = start, dst = 0; src < end; src++, dst += 2) {
        interleaved[dst] = left[src];
        interleaved[dst + 1] = right[src];
      }

      // get WAV file bytes and audio params of your audio source
      const wavBytes = getWavBytes(interleaved.buffer, {
        isFloat: true, // floating point or 16-bit integer
        numChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      });
      const wav = new Blob([wavBytes], { type: "audio/wav" });
      const fileChunk = new File([wav], `chunk${j}`, { type: "audio/wav" });
      wavFiles.push(fileChunk);
      // const downloadLink = document.createElement('a')
      // downloadLink.href = URL.createObjectURL(wav)
      // downloadLink.download = 'my-audio.wav' // name file
      // document.body.appendChild(downloadLink);
      // downloadLink.click();
      // document.body.removeChild(downloadLink);
    } else {
      // Float32Array samples
      const [left] = [audioBuffer.getChannelData(0)];

      // const interleaved = new Float32Array(left.length + right.length)
      console.log(start, end);
      const interleaved = new Float32Array(end - start);
      for (let src = start, dst = 0; src < end; src++) {
        interleaved[dst++] = left[src];
      }

      // get WAV file bytes and audio params of your audio source
      const wavBytes = getWavBytes(interleaved.buffer, {
        isFloat: true, // floating point or 16-bit integer
        numChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      });
      const wav = new Blob([wavBytes], { type: "audio/wav" });
      const fileChunk = new File([wav], `chunk${j}`, { type: "audio/wav" });
      wavFiles.push(fileChunk);
      // const downloadLink = document.createElement('a')
      // downloadLink.href = URL.createObjectURL(wav)
      // downloadLink.download = 'my-audio.wav' // name file
      // document.body.appendChild(downloadLink);
      // downloadLink.click();
      // document.body.removeChild(downloadLink);
    }

    // create download link and append to Dom
    // const downloadLink = document.createElement('a')
    // downloadLink.href = URL.createObjectURL(wav)
    // downloadLink.download = 'my-audio.wav' // name file
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);
  }
  return wavFiles;
};

export const audioBufferToWav = (audioBuffer) => {
  const chunkSize = audioBuffer.sampleRate * audioBuffer.duration;
  const numChunks = Math.ceil(audioBuffer.length / chunkSize);
  let wavFile = null;
  for (let j = 0; j < numChunks; j++) {
    const start = j * chunkSize;
    const end = start + chunkSize >= audioBuffer.length ? audioBuffer.length : start + chunkSize;

    if (audioBuffer.numberOfChannels === 2) {
      // Float32Array samples
      const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

      // const interleaved = new Float32Array(left.length + right.length)
      console.log(start, end);
      const interleaved = new Float32Array((end - start) * 2);
      for (let src = start, dst = 0; src < end; src++, dst += 2) {
        interleaved[dst] = left[src];
        interleaved[dst + 1] = right[src];
      }

      // get WAV file bytes and audio params of your audio source
      const wavBytes = getWavBytes(interleaved.buffer, {
        isFloat: true, // floating point or 16-bit integer
        numChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      });
      const wav = new Blob([wavBytes], { type: "audio/wav" });
      const fileChunk = new File([wav], `chunk${j}`, { type: "audio/wav" });
      wavFile = fileChunk;
    } else {
      // Float32Array samples
      const [left] = [audioBuffer.getChannelData(0)];

      // const interleaved = new Float32Array(left.length + right.length)
      // console.log(start, end);
      const interleaved = new Float32Array(end - start);
      for (let src = start; src < end; src++) {
        interleaved[src] = left[src];
      }

      // get WAV file bytes and audio params of your audio source
      const wavBytes = getWavBytes(interleaved.buffer, {
        isFloat: true, // floating point or 16-bit integer
        numChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
      });
      const wav = new Blob([wavBytes], { type: "audio/wav" });
      const fileChunk = new File([wav], `chunk${j}`, { type: "audio/wav" });
      wavFile = fileChunk;
    }

    // create download link and append to Dom
    // const downloadLink = document.createElement('a')
    // downloadLink.href = URL.createObjectURL(wav)
    // downloadLink.download = 'my-audio.wav' // name file
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);
  }
  return wavFile;
};

export const getAudioSlice = (audioBuffer, startTime, endTime) => {
  console.log(
    "duration",
    audioBuffer.duration,
    "length",
    audioBuffer.length,
    "sr",
    audioBuffer.sampleRate,
    audioBuffer.numberOfChannels
  );
  let startFrame = startTime * audioBuffer.sampleRate;
  let endFrame = endTime * audioBuffer.sampleRate;
  if (audioBuffer.numberOfChannels == 2) {
    const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

    const interleaved = new Float32Array((endFrame - startFrame) * 2);
    for (let src = startFrame, dst = 0; src < endFrame; src++, dst += 2) {
      interleaved[dst] = left[src];
      interleaved[dst + 1] = right[src];
    }

    // get WAV file bytes and audio params of your audio source
    const wavBytes = getWavBytes(interleaved.buffer, {
      isFloat: true, // floating point or 16-bit integer
      numChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });
    const wav = new Blob([wavBytes], { type: "audio/wav" });
    const fileChunk = new File([wav], `chunk${startTime}`, {
      type: "audio/wav",
    });
    let wavFile = fileChunk;
    return wavFile;
  } else if (audioBuffer.numberOfChannels == 1) {
    const [left] = [audioBuffer.getChannelData(0)];

    const interleaved = new Float32Array(endFrame - startFrame);
    for (let src = startFrame; src < endFrame; src++) {
      interleaved[src] = left[src];
    }

    // get WAV file bytes and audio params of your audio source
    const wavBytes = getWavBytes(interleaved.buffer, {
      isFloat: true, // floating point or 16-bit integer
      numChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });
    const wav = new Blob([wavBytes], { type: "audio/wav" });
    const fileChunk = new File([wav], `chunk${startTime}`, {
      type: "audio/wav",
    });
    let wavFile = fileChunk;
    return wavFile;
  }
  return new File([], "default.wav", { type: "audio/wav" });
};
