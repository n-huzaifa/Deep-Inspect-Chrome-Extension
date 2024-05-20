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

function captureTabAudio() {
  chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
    // these lines enable the audio to continue playing while capturing
    context = new AudioContext()
    var newStream = context.createMediaStreamSource(stream)
    newStream.connect(context.destination)

    const recorder = new MediaRecorder(stream)
    const chunks = []
    recorder.ondataavailable = (e) => {
      chunks.push(e.data)
    }
    recorder.onstop = (e) => {
      const blob = new Blob(chunks)
      sendToFastAPI(blob)
    }
    recorder.start()
    setTimeout(() => recorder.stop(), 5000)
  })
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('share-audio-button').addEventListener('click', function () {
    captureTabAudio()
  })
})
