
import { handleRemoteDescription, createAnswer } from './webrtcUtils';

// Function to send signaling data (like ICE candidates, offers, answers) to the server
export function sendSignalingData(socket, type, data) {
    socket.send(JSON.stringify({ type, data }));
}

// Function to handle incoming signaling messages
export function handleSignalingMessage(peerConnection, socket, message) {
    const { type, data } = JSON.parse(message);

    switch (type) {
        case 'offer':
            handleRemoteDescription(peerConnection, data)
                .then(() => createAnswer(peerConnection))
                .then(answer => sendSignalingData(socket, 'answer', answer));
            break;
        case 'answer':
            handleRemoteDescription(peerConnection, data);
            break;
        case 'candidate':
            peerConnection.addIceCandidate(new RTCIceCandidate(data));
            break;
        default:
            break;
    }
}

