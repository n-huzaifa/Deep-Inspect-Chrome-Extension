let intervalId
let recorder
let isRecording = false // Track recording state
let chunks = []
let stream // Keep track of the captured stream
let recordingTimeout // To store the timeout ID

function sendToFastAPI(blob, filename) {
  const button = document.getElementById('share-audio-button')
  const originalText = button.textContent

  // Show loader on the button
  button.textContent = 'Uploading...'
  button.disabled = true

  const formData = new FormData()
  formData.append('file', blob, filename)

  fetch('http://127.0.0.1:8000/upload', {
    method: 'POST',
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    })
    .then((data) => {
      console.log('File upload successful:', data)
      displayApiResponse(data) // Function to display API response on the UI
    })
    .catch((error) => {
      console.error('Error uploading file:', error)
      displayApiError(error) // Function to display error message on the UI
    })
    .finally(() => {
      // Restore button text
      button.textContent = originalText
      button.disabled = false
    })
}

function displayApiResponse(data) {
  const responseContainer = document.getElementById('response-container')
  const predictions = data.predictions
  const genuineCount = predictions.filter((pred) => pred === 0).length
  const deepfakeCount = predictions.filter((pred) => pred === 1).length
  const totalPredictions = predictions.length
  const genuinePercentage = ((genuineCount / totalPredictions) * 100).toFixed(2)
  const deepfakePercentage = ((deepfakeCount / totalPredictions) * 100).toFixed(2)

  responseContainer.innerHTML = `
    <p>Filename: ${data.filename}</p>
    <p>File Path: ${data.file_path}</p>
    <p>${genuinePercentage}% is genuine and ${deepfakePercentage}% is deepfake</p>
    <p>Predictions: ${data.predictions}</p>
    <p>Probabilities: ${JSON.stringify(data.probabilities)}</p>
  `
}

function displayApiError(error) {
  const responseContainer = document.getElementById('response-container')
  responseContainer.innerHTML = `
    <p>Error: ${error.message}</p>
  `
}

function generateFilename() {
  const date = new Date()
  const dateString = date.toISOString().replace(/:/g, '-')
  const randomHash = Math.random().toString(36).substring(2, 15)
  return `recording_${dateString}_${randomHash}.wav`
}

function startRecording(stream) {
  const context = new AudioContext({ sampleRate: 48000 })
  const source = context.createMediaStreamSource(stream)

  context.audioWorklet
    .addModule('audio-processor.js')
    .then(() => {
      const audioProcessor = new AudioWorkletNode(context, 'audio-processor')
      source.connect(audioProcessor)
      audioProcessor.connect(context.destination)

      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        chunks.push(e.data)
      }
      recorder.onstop = () => {
        clearInterval(intervalId)
        clearTimeout(recordingTimeout)
        const filename = generateFilename()
        sendToFastAPI(new Blob(chunks, { type: 'audio/wav' }), filename)

        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
          stream = null
        }
      }
      recorder.start()

      recordingTimeout = setTimeout(() => {
        stopRecording()
      }, 60000)
    })
    .catch((error) => {
      console.error('Error loading AudioWorkletNode:', error)
    })
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop()
  }
  isRecording = false
  document.getElementById('share-audio-button').textContent = 'Start Recording'
}

function captureTabAudio() {
  let timeElapsed = 0
  const timerElement = document.getElementById('timer')
  timerElement.textContent = `${timeElapsed}s`
  timerElement.style.display = 'flex'

  intervalId = setInterval(() => {
    timeElapsed++
    timerElement.textContent = `${timeElapsed}s`
  }, 1000)

  chrome.tabCapture.capture({ audio: true, video: false }, (capturedStream) => {
    if (!capturedStream) {
      clearInterval(intervalId)
      console.error('Failed to capture tab audio.')
      return
    }
    stream = capturedStream
    startRecording(stream)
  })
}

function handleFileUpload() {
  // Get the uploaded file
  let uploadedFile = this.files[0]

  // Check if the uploaded file is a .wav file
  if (uploadedFile && uploadedFile.type === 'audio/wav') {
    // Create a Blob from the file data
    let blob = new Blob([uploadedFile], { type: 'audio/wav' })

    // Create an object URL for the Blob
    let objectURL = URL.createObjectURL(blob)

    console.log('File Blob:', blob)
    console.log('Object URL:', objectURL)

    // Function to get the duration of the audio file
    // getDirection function used from https://stackoverflow.com/a/41245574
    var getDuration = function (url, next) {
      var _player = new Audio(url)
      _player.addEventListener(
        'durationchange',
        function (e) {
          console.log('Duration Change Event:', e)
          if (this.duration !== Infinity) {
            var duration = this.duration
            console.log('Duration:', duration)
            _player.remove()
            next(duration)
          }
        },
        false
      )
      _player.load()
      _player.currentTime = 24 * 60 * 60 // Set a large current time
      _player.volume = 0
      _player.play()
      // Waiting...
    }

    // Call getDuration function with the object URL and handle the duration
    getDuration(objectURL, function (duration) {
      console.log('Received Duration:', duration)
      // Ensure the duration is finite and within the limit
      if (isFinite(duration) && duration <= 60) {
        // Rename the file
        let newName = generateFilename()
        console.log('New Filename:', newName)

        // Display the new filename
        fileName.innerText = newName

        // Send the renamed file to the server
        sendToFastAPI(uploadedFile, newName)
      } else {
        alert('Please upload a .wav file that is no longer than 60 seconds.')
      }
    })
  } else {
    alert('Please upload a .wav file.')
  }
}

function encodeToWav(channelData) {
  const numChannels = 1 // Mono audio
  const sampleRate = 48000 // Same as the AudioContext sample rate
  const bytesPerSample = 2 // 16-bit output
  const bitsPerSample = 16

  const buffer = new ArrayBuffer(channelData.length * numChannels * bytesPerSample)
  const view = new DataView(buffer)

  let offset = 0
  for (let i = 0; i < channelData.length; i++) {
    const sample = channelData[i]
    const value = Math.max(-1, Math.min(1, sample))
    const output = value < 0 ? value * 0x8000 : value * 0x7fff
    view.setInt16(offset, output, true)
    offset += bytesPerSample
  }

  const wavBlob = new Blob([encodeWavHeader(buffer.byteLength, numChannels, sampleRate), buffer], { type: 'audio/wav' })
  sendToFastAPI(wavBlob, generateFilename())
}

function encodeWavHeader(length, numChannels, sampleRate) {
  const dataLength = length - 44 // Length of the raw audio data
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  const writeUint32 = (offset, value) => {
    view.setUint32(offset, value, true)
  }

  const writeUint16 = (offset, value) => {
    view.setUint16(offset, value, true)
  }

  writeString(0, 'RIFF') // ChunkID
  writeUint32(4, 32 + dataLength) // ChunkSize
  writeString(8, 'WAVE') // Format
  writeString(12, 'fmt ') // Subchunk1ID
  writeUint32(16, 16) // Subchunk1Size
  writeUint16(20, 1) // AudioFormat (1 = PCM)
  writeUint16(22, numChannels) // NumChannels
  writeUint32(24, sampleRate) // SampleRate
  writeUint32(28, sampleRate * 2) // ByteRate
  writeUint16(32, 2) // BlockAlign
  writeUint16(34, 16) // BitsPerSample
  writeString(36, 'data') // Subchunk2ID
  writeUint32(40, dataLength) // Subchunk2Size

  return view.buffer
}

document.addEventListener('DOMContentLoaded', function () {
  let input = document.getElementById('upload-wav-button')
  let fileName = document.getElementById('fileName')

  input.addEventListener('change', handleFileUpload)

  const button = document.getElementById('share-audio-button')
  button.addEventListener('click', function () {
    if (isRecording) {
      stopRecording()
    } else {
      isRecording = true
      chunks = []
      document.getElementById('timer').textContent = '0s'
      button.textContent = 'Stop Recording'
      captureTabAudio()
    }
  })
})
