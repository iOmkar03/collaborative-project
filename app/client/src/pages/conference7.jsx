import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  // Local stream
  const [localaudio, setLocalAudio] = useState(true);
  const [localvideo, setLocalVideo] = useState(true);
  const localStream = useRef(null);
  const localVideoRef = useRef(null);
  const streamOfRef = useRef(undefined);
  const streamOfRef2 = useRef(undefined);
  // Remote streams
  const remoteStreams = useRef({});

  const peerConnections = useRef({});

  useEffect(() => {
    securitycheck();
    if (email) {
      connectSocket();
    }
    return () => {
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
      //initiate participants as we get participants from the backend
      check.data.participants.forEach((participant) => {
        //initialze as empty ref
        remoteStreams.current[participant] = [];
      });
    } catch (error) {
      console.log("security check error:", error);
      alert("You are not authorized to view this conference");
      navigate("/");
    }
  };

  const connectSocket = () => {
    if (
      socket.current &&
      (socket.current.readyState === WebSocket.CONNECTING ||
        socket.current.readyState === WebSocket.OPEN)
    ) {
      console.log("Using the existing socket");
      return;
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
        handleSocketMessage(data);
      };
    } catch (error) {
      console.error("Failed to connect to the WebSocket server:", error);
      setTimeout(connectSocket, 5000);
    }
  };

  const handleSocketMessage = (data) => {
    switch (data.type) {
      case "joined":
        console.log("Joined the conference as:", data);
        handleJoined(data);
        if (data.from !== email) {
          createPeerConnection(data);
          createOffer(data);
          setTimeout(() => createOffer(data), 5000);
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

  const sendWsSignal = (message) => {
    console.log("Sending message:", message);
    socket.current.send(JSON.stringify(message));
  };

  const handleJoined = (data) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalAudio(false);
        setLocalVideo(true);

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

    if (peerConnections.current[data.from]) {
      console.log("Peer connection already exists for", data.from);
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
      console.log("Received remote stream:", event.streams);

      const newStream = event.streams[0];

      const temp = [];
      temp.push(newStream);

      // Update remoteStreams useRef with the new stream, using email as the key
      //
      //

      console.log(
        "data.from:",
        data.from,
        "streamOfRef.current:",
        streamOfRef.current,
      );
      //
      console.log("magaical", streamOfRef.current);
      if (streamOfRef.current === undefined) {
        remoteStreams.current[data.from] = temp;
      } else {
        remoteStreams.current[streamOfRef.current] = temp;
        streamOfRef.current = undefined;
      }
      // remoteStreams.current["deep5@gmail.com"] = temp;

      console.log("Remote streams:", remoteStreams.current);

      // Force update to re-render the remote videos
      forceUpdate();

      // Forward the new stream to all other peer connections except to self
      Object.entries(peerConnections.current).forEach(([peerEmail, pc]) => {
        if (peerEmail !== data.from) {
          console.log(`Forwarding stream of ${data.from} to ${peerEmail}`);
          newStream.getTracks().forEach((track) => {
            console.log("Adding track to", peerEmail);
            pc.addTrack(track, remoteStreams.current[data.from][0]);
          });

          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              // Send the offer to the peer
              const message = {
                type: "offer",
                offer: pc.localDescription,
                from: email, //current user's email
                to: peerEmail,
                conferenceId: conferenceId,
                streamOf: data.from,
              };
              sendWsSignal(message);
            })
            .catch((error) => {
              console.error(`Failed to renegotiate with ${peerEmail}:`, error);
            });
        }
      });

      //forward all the streams to the new peer connection usign similar logic
      //as above
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

    streamOfRef.current = data.streamOf;

    if (!peerConnections.current[data.from]) {
      console.log(`Creating new RTCPeerConnection for ${data.from}`);
      createPeerConnection(data);
    }

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
          streamOf: data.streamOf,
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
  const forceUpdate = useCallback(() => updateState({}), []);

  return (
    <div>
      <h2>Conference: {conferenceId}</h2>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted />
      </div>
      <div id="remote-videos-container">
        {Object.entries(remoteStreams.current).map(([userEmail, streams]) =>
          streams.map((stream, index) => (
            <div key={`${userEmail}-${index}`}>
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) el.srcObject = stream;
                }}
                style={{ width: "200px", margin: "10px" }}
              />
              <p>{userEmail}</p>
            </div>
          )),
        )}
      </div>
    </div>
  );
};

export default Conference;
