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
    })
    .catch((error) => {
      console.error('Error uploading file:', error)
    })
    .finally(() => {
      // Restore button text
      button.textContent = originalText
      button.disabled = false
    })
}

function generateFilename() {
  const date = new Date()
  const dateString = date.toISOString().replace(/:/g, '-')
  const randomHash = Math.random().toString(36).substring(2, 15)
  return `recording_${dateString}_${randomHash}.wav`
}

function startRecording(stream) {
  const context = new AudioContext()
  const newStream = context.createMediaStreamSource(stream)
  newStream.connect(context.destination)

  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (e) => {
    chunks.push(e.data)
  }
  recorder.onstop = () => {
    clearInterval(intervalId)
    clearTimeout(recordingTimeout) // Clear the timeout if recording stops before the limit
    const filename = generateFilename()
    sendToFastAPI(new Blob(chunks), filename)

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      stream = null
    }
  }
  recorder.start()

  // Set a timeout to automatically stop the recording after 60 seconds
  recordingTimeout = setTimeout(() => {
    stopRecording()
  }, 60000) // 60000 milliseconds = 60 seconds
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

document.addEventListener('DOMContentLoaded', function () {
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
