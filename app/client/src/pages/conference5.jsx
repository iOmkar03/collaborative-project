import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const Conference = () => {
  const backend = "https://192.168.29.232:5000";
  const wsbackend = "https://192.168.29.232:3001";
  const navigate = useNavigate();
  const { conferenceId } = useParams();
  const [conferenceSize, setConferenceSize] = useState(0);
  const [email, setEmail] = useState("");
  const socket = useRef(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);

  //local stream
  const [localaudio, setLocalAudio] = useState(true);
  const [localvideo, setLocalVideo] = useState(true);
  const localStream = useRef(null);
  const localVideoRef = useRef(null);

  //remote streams
  const remoteStreams = useRef({});

  const peerConnections = useRef({});

  useEffect(() => {
    securitycheck();
    if (email) {
      connectSocket();
    }
    return () => {
      // Cleanup function
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, [email]);

  const securitycheck = async () => {
    try {
      const check = await axios.get(`${backend}/conference/access`, {
        headers: {
          token: localStorage.getItem("token"),
          conferenceId: conferenceId,
        },
      });
      setEmail(check.data.email);
      setConferenceSize(check.data.size);
    } catch (error) {
      console.log("security check error:", error);
      alert("You are not authorized to view this conference");
      navigate("/");
    }
  };

  const connectSocket = () => {
    if (socket.current) {
      if (
        socket.current.readyState === WebSocket.CONNECTING ||
        socket.current.readyState === WebSocket.OPEN
      ) {
        console.log("Using the existing socket");
        return;
      }
    }

    try {
      socket.current = new WebSocket(wsbackend);
      console.log("New socket created");

      socket.current.onopen = () => {
        console.log("WebSocket connection established");
        setIsSocketOpen(true);
        const messages = {
          type: "join",
          conferenceId,
          email: email,
          size: conferenceSize,
        };
        sendWsSignal(messages);
      };

      socket.current.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        setIsSocketOpen(false);
        setTimeout(connectSocket, 5000);
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsSocketOpen(false);
        setTimeout(connectSocket, 5000);
      };

      socket.current.onmessage = (message) => {
        const data = JSON.parse(message.data);
        //console.log("Received message:", data);

        switch (data.type) {
          case "joined":
            console.log("Joined the conference as:", data);
            hadleJoined(data);
            if (data.from !== email) {
              createPeerConnection(data);
              createOffer(data);
              //refire after 5 seconds
              setTimeout(() => {
                createOffer(data);
              }, 5000);
            }
            break;
          case "offer":
            handleOffer(data);
            break;
          case "answer":
            handleAnswer(data);
            break;
          case "icecandidate":
            handleIceCandidate(data);
            break;
          default:
            break;
        }
      };
    } catch (error) {
      console.error("Failed to connect to the WebSocket server:", error);
      setTimeout(connectSocket, 5000);
    }
  };

  const sendWsSignal = (message) => {
    console.log("Sending message:", message);
    socket.current.send(JSON.stringify(message));
  };

  const hadleJoined = (data) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalAudio(true);
        setLocalVideo(true);

        // Add local stream to all existing peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        });
      })
      .catch((error) => {
        console.log("Failed to get local stream:", error);
        alert("Please allow access to the camera and microphone");
      });
  };

  const createPeerConnection = (data) => {
    console.log("Creating peer connection for", data.from);

    const config = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    if (!data.from) {
      console.error("Invalid email:", data);
      return;
    }

    peerConnections.current[data.from] = new RTCPeerConnection(config);

    if (!peerConnections.current[data.from]) {
      console.error("Failed to create RTCPeerConnection for:", data.from);
      return;
    }

    peerConnections.current[data.from].onicecandidate = (event) => {
      if (event.candidate) {
        const message = {
          type: "icecandidate",
          candidate: event.candidate,
          to: data.from,
          from: email,
          conferenceId: conferenceId,
        };
        sendWsSignal(message);
      }
    };

    
peerConnections.current[data.from].ontrack = (event) => {
  console.log("Received remote stream:", event.streams[0]);

  const newStream = event.streams[0];

  // Update remoteStreams useRef with array of streams
  remoteStreams.current[data.from] = remoteStreams.current[data.from] || [];
  remoteStreams.current[data.from].push(newStream);

  // Force update to re-render the remote videos
  forceUpdate();

  // Forward the new stream to all other peer connections if any but not to self
  Object.entries(peerConnections.current).forEach(([email, pc]) => {
    if (email !== data.from) {
      // Log the transfer
      console.log(`Forwarding stream of ${data.from} to ${email}`);
      newStream.getTracks().forEach((track) => {
        pc.addTrack(track, newStream);
      });
    }
  });

  // Forward existing streams to the new peer
  Object.entries(remoteStreams.current).forEach(([email, streams]) => {
    if (email !== data.from) {
      // Check if streams is an array
      if (Array.isArray(streams)) {
        streams.forEach((existingStream) => {
          if (existingStream instanceof MediaStream) {
            // Log the transfer
            console.log(`Forwarding stream of ${email} to ${data.from}`);
            existingStream.getTracks().forEach((track) => {
              peerConnections.current[data.from].addTrack(track, existingStream);
            });
          } else {
            console.error(`Invalid stream for ${email}:`, existingStream);
          }
        });
      } else {
        console.error(`Invalid streams array for ${email}:`, streams);
      }
    }
  });
};

    // Add local stream to the new peer connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnections.current[data.from].addTrack(track, localStream.current);
      });
    }
  };

  const createOffer = (data) => {
    console.log("Creating offer");
    peerConnections.current[data.from]
      .createOffer()
      .then((offer) => {
        return peerConnections.current[data.from].setLocalDescription(offer);
      })
      .then(() => {
        const message = {
          type: "offer",
          offer: peerConnections.current[data.from].localDescription,
          from: email,
          to: data.from,
          conferenceId: conferenceId,
        };
        sendWsSignal(message);
      })
      .catch((error) => {
        console.log("Failed to create offer:", error);
      });
  };

  const handleOffer = (data) => {
    console.log("Received offer:", data);

    // Ensure peer connection exists
    if (!peerConnections.current[data.from]) {
      console.log(`Creating new RTCPeerConnection for ${data.from}`);
      createPeerConnection(data); // This function should create a new peer connection
    }

    // Proceed with setting the remote description and creating an answer
    peerConnections.current[data.from]
      .setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => {
        return peerConnections.current[data.from].createAnswer();
      })
      .then((answer) => {
        return peerConnections.current[data.from].setLocalDescription(answer);
      })
      .then(() => {
        const message = {
          type: "answer",
          answer: peerConnections.current[data.from].localDescription,
          from: email,
          to: data.from,
          conferenceId: conferenceId,
        };
        sendWsSignal(message);
      })
      .catch((error) => {
        console.log("Failed to create answer:", error);
      });
  };

  const handleAnswer = (data) => {
    console.log("Received answer:", data);
    peerConnections.current[data.from]
      .setRemoteDescription(new RTCSessionDescription(data.answer))
      .catch((error) => {
        console.log("Failed to set remote description:", error);
      });
  };

  const handleIceCandidate = (data) => {
    console.log("Received ICE candidate:", data);
    const pc = peerConnections.current[data.from];
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((error) =>
        console.error("Error adding ICE candidate:", error),
      );
    }
  };

  // Force update function
  const [, updateState] = useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  return (
    <div>
      <h2>Conference: {conferenceId}</h2>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted />
      </div>
      <div id="remote-videos-container">
        {Object.entries(remoteStreams.current).map(([email, stream]) => (
          <video
            key={email}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && stream) el.srcObject = stream[0];
            }}
            style={{ width: "200px", margin: "10px" }}
          />
        ))}
      </div>
    </div>
  );
};

export default Conference;
