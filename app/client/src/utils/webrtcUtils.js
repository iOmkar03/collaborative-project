
// utils/webrtcUtils.js


// Create and configure a new RTCPeerConnection
export function createPeerConnection(config, onICECandidate, onTrack) {
    const peerConnection = new RTCPeerConnection(config);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            onICECandidate(event.candidate);
        }
    };

    // Handle incoming tracks (media streams)
    peerConnection.ontrack = (event) => {
        onTrack(event.streams[0]);
    };

    return peerConnection;
}

// Add media tracks to the peer connection
export function addLocalTracks(peerConnection, stream) {
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });
}

// Create an SDP offer and set it as the local description
export async function createOffer(peerConnection) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
}

// Create an SDP answer and set it as the local description
export async function createAnswer(peerConnection) {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
}

// Handle remote description (offer/answer) and set it on the peer connection
export async function handleRemoteDescription(peerConnection, description) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
}

