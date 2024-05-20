let intervalId
let recorder
let isRecording = false // Track recording state
let chunks = []
let stream // Keep track of the captured stream

function sendToFastAPI(blob) {
  const formData = new FormData()
  formData.append('file', blob, 'test.wav')

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
    sendToFastAPI(new Blob(chunks))
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      stream = null
    }
  }
  recorder.start()
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
