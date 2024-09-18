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

  // Remote streams
  const remoteStreams = useRef({});

  const peerConnections = useRef({});
  const addedTracks = useRef({});
  const peerStates = useRef({});

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
      check.data.participants.forEach((participant) => {
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

        if (data.from !== email) {
          // This is a new user joining
          createPeerConnection(data);

          // Forward all existing streams to the new user
          forwardExistingStreamsToNewUser(data.from);

          // Create an offer to send our stream to the new user
          createOffer(data);

          setTimeout(() => {
            createOffer(data);
          }, 5000);
        } else {
          // This is the current user joining
          // Add local stream to all existing peer connections
          Object.values(peerConnections.current).forEach((pc) => {
            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });
          });
        }
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

    if (!data.from || peerConnections.current[data.from]) {
      console.log(
        "Invalid email or peer connection already exists:",
        data.from,
      );
      return;
    }

    peerConnections.current[data.from] = new RTCPeerConnection(config);
    addedTracks.current[data.from] = new Set();
    peerStates.current[data.from] = "new";

    peerConnections.current[data.from].onicecandidate = (event) => {
      if (event.candidate) {
        sendWsSignal({
          type: "icecandidate",
          candidate: event.candidate,
          to: data.from,
          from: email,
          conferenceId: conferenceId,
        });
      }
    };

    peerConnections.current[data.from].ontrack = (event) => {
      handleNewTrack(event, data.from);
    };

    peerConnections.current[data.from].onsignalingstatechange = () => {
      peerStates.current[data.from] =
        peerConnections.current[data.from].signalingState;
      console.log(
        `Signaling state changed for ${data.from}:`,
        peerStates.current[data.from],
      );
    };

    // Add local stream to the new peer connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnections.current[data.from].addTrack(track, localStream.current);
      });
    }
  };

  const handleNewTrack = (event, fromEmail) => {
    console.log("Received new track from:", fromEmail);

    const newStream = event.streams[0];
    if (!remoteStreams.current[fromEmail]) {
      remoteStreams.current[fromEmail] = [];
    }
    remoteStreams.current[fromEmail].push(newStream);

    forceUpdate();

    // Forward the new stream to all other peer connections
    Object.entries(peerConnections.current).forEach(([peerEmail, pc]) => {
      if (peerEmail !== fromEmail && peerEmail !== email) {
        forwardStreamToPeer(newStream, pc, peerEmail, fromEmail);
      }
    });
  };

  const forwardExistingStreamsToNewUser = (newUserEmail) => {
    Object.entries(remoteStreams.current).forEach(
      ([existingUserEmail, streams]) => {
        if (existingUserEmail !== newUserEmail) {
          streams.forEach((stream) => {
            forwardStreamToPeer(
              stream,
              peerConnections.current[newUserEmail],
              newUserEmail,
              existingUserEmail,
            );
          });
        }
      },
    );
  };

  const forwardStreamToPeer = (stream, peerConnection, toPeer, fromPeer) => {
    if (!addedTracks.current[toPeer]) {
      addedTracks.current[toPeer] = new Set();
    }

    let tracksAdded = false;
    stream.getTracks().forEach((track) => {
      if (!addedTracks.current[toPeer].has(track.id)) {
        peerConnection.addTrack(track, stream);
        addedTracks.current[toPeer].add(track.id);
        tracksAdded = true;
      }
    });

    if (tracksAdded) {
      negotiateConnection(peerConnection, toPeer, fromPeer);
    }
  };

  const negotiateConnection = (peerConnection, toPeer, streamOf) => {
    //if (peerStates.current[toPeer] !== "stable") {
    //  console.log(
    //    `Peer ${toPeer} is not in stable state. Current state:`,
    //    peerStates.current[toPeer],
    //  );
    //  setTimeout(
    //    () => negotiateConnection(peerConnection, toPeer, streamOf),
    //    1000,
    //  );
    //  return;
    //}

    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => {
        sendWsSignal({
          type: "offer",
          offer: peerConnection.localDescription,
          from: email,
          to: toPeer,
          conferenceId: conferenceId,
          streamOf: streamOf,
        });
      })
      .catch((error) => {
        console.error(`Failed to negotiate with ${toPeer}:`, error);
        // Retry after a delay
        setTimeout(
          () => negotiateConnection(peerConnection, toPeer, streamOf),
          2000,
        );
      });
  };

  const createOffer = (data) => {
    console.log("Creating offer for", data.from);
    negotiateConnection(peerConnections.current[data.from], data.from, email);
  };

  const handleOffer = (data) => {
    console.log("Received offer:", data);

    if (!peerConnections.current[data.from]) {
      createPeerConnection(data);
    }

    const pc = peerConnections.current[data.from];

    //if (peerStates.current[data.from] !== "stable") {
    //  console.log(
    //    `Cannot handle offer. Peer ${data.from} is not in stable state.`,
    //  );
    //  return;
    //}

    pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => pc.createAnswer())
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => {
        sendWsSignal({
          type: "answer",
          answer: pc.localDescription,
          from: email,
          to: data.from,
          conferenceId: conferenceId,
          streamOf: data.streamOf,
        });
      })
      .catch((error) => {
        console.log("Error handling offer:", error);
      });
  };

  const handleAnswer = (data) => {
    console.log("Received answer:", data);
    const pc = peerConnections.current[data.from];
    if (pc && peerStates.current[data.from] === "have-local-offer") {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(
        (error) => {
          console.log("Failed to set remote description:", error);
        },
      );
    } else {
      console.log(
        `Cannot set remote description. Invalid state for peer ${data.from}`,
      );
    }
  };

  const handleIceCandidate = (data) => {
    console.log("Received ICE candidate:", data);
    const pc = peerConnections.current[data.from];
    //if (pc) {
    //  pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((error) =>
    //    console.error("Error adding ICE candidate:", error),
    //  );
    //}
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
