
// Get the user's media stream (video and audio)
export async function getUserMedia(constraints) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
        throw error;
    }
}

// Attach the media stream to a video element
export function attachStreamToVideoElement(videoElement, stream) {
    videoElement.srcObject = stream;
}
