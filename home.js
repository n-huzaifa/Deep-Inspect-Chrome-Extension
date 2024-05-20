function saveToFile(blob, name) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.style = 'display: none'
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  a.remove()
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
    recorder.onstop = (e) => saveToFile(new Blob(chunks), 'test.wav')
    recorder.start()
    setTimeout(() => recorder.stop(), 10000)
  })
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('share-audio-button').addEventListener('click', function () {
    captureTabAudio()
  })
})
