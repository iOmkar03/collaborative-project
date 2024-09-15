import React, { useState, useEffect, useRef } from "react";
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
  const [localAudio, setLocalAudio] = useState(false);
  const [localVideo, setLocalVideo] = useState(true);
  const localStream = useRef(null);
  const localVideoRef = useRef(null);

  // Remote streams
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef({});

  useEffect(() => {
    securityCheck();
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

  useEffect(() => {
    if (Object.keys(remoteStreams).length > 0) {
      console.log("Remote streams updated, forwarding streams...");
      forwardStreams();
    }
  }, [remoteStreams]);

  const securityCheck = async () => {
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
      console.log("Security check error:", error);
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

        switch (data.type) {
          case "joined":
            console.log("Joined the conference as:", data);
            handleJoined(data);
            if (data.from !== email) {
              createPeerConnection(data);
              createOffer(data);
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

  const handleJoined = (data) => {
    navigator.mediaDevices
      .getUserMedia({ video: localVideo, audio: localAudio })
      .then((stream) => {
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalAudio(false);
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

      setRemoteStreams((prevStreams) => {
        const updatedStreams = {
          ...prevStreams,
          [data.from]: event.streams,
        };

        console.log("Updated remote streams state:", updatedStreams);

        // Forward the stream after updating the state
        setTimeout(() => forwardStreams(), 7000);

        return updatedStreams;
      });
    };

    // Add local stream to the new peer connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnections.current[data.from].addTrack(track, localStream.current);
      });
    }

    // Forward all existing remote streams to the new peer
    forwardStreams();
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

  const forwardStreams = () => {
    // Loop through all remote streams
    Object.entries(remoteStreams).forEach(([remotePeerEmail, streams]) => {
      console.log(`Forwarding remote streams from ${remotePeerEmail}`);

      // Loop through all peer connections
      Object.keys(peerConnections.current).forEach((peerEmail) => {
        console.log(`Forwarding to ${peerEmail}`);

        // Ensure we're not adding the stream back to the same peer that sent it
        if (peerEmail !== remotePeerEmail) {
          streams[0].getTracks().forEach((track) => {
            const senders = peerConnections.current[peerEmail].getSenders();
            const trackAlreadySent = senders.find(
              (sender) => sender.track && sender.track.id === track.id,
            );

            if (!trackAlreadySent) {
              try {
                peerConnections.current[peerEmail].addTrack(track, streams[0]);
                console.log(
                  `Track forwarded from ${remotePeerEmail} to ${peerEmail}`,
                );
              } catch (error) {
                console.error(
                  `Failed to forward track to ${peerEmail}:`,
                  error,
                );
              }
            }
          });
        }
      });
    });
  };

  const handleLocalVideoChange = (e) => {
    setLocalVideo(e.target.checked);
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = e.target.checked;
      });
    }
  };

  const handleLocalAudioChange = (e) => {
    setLocalAudio(e.target.checked);
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = e.target.checked;
      });
    }
  };

  return (
    <div>
      <h1>Conference ID: {conferenceId}</h1>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "200px", margin: "10px" }}
      />
      <label>
        <input
          type="checkbox"
          checked={localVideo}
          onChange={handleLocalVideoChange}
        />
        Video
      </label>
      <label>
        <input
          type="checkbox"
          checked={localAudio}
          onChange={handleLocalAudioChange}
        />
        Audio
      </label>
      <div>
        {Object.entries(remoteStreams).map(([email, streams]) => (
          <video
            key={email}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && streams) el.srcObject = streams[0];
            }}
            style={{ width: "200px", margin: "10px" }}
          />
        ))}
      </div>
    </div>
  );
};

export default Conference;
