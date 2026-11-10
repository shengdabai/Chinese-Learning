// SpeechRecognition opens its own input. Release this permission-check stream.
export async function checkMicrophonePermission(mediaDevices) {
  const stream = await mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
