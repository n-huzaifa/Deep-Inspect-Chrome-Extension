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
