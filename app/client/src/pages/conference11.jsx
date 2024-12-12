import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
} from "lucide-react";
import {logActionFrontend} from "./../utils/logging.js";

const Conference = ({baseip}) => {
  //const backend = "https://192.168.29.232:5000";
  //const wsbackend = "https://192.168.29.232:3001";
//const backend ="https://192.168.33.109:5000";
//const wsbackend ="https://192.168.33.109:3001"
  //const backend = baseip+":5000";
  //const wsbackend = baseip+":3001";
  const backend = import.meta.env.VITE_BACKEND;
  const wsbackend = import.meta.env.VITE_WSBACKEND;
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
  const [remoteStreamsList, setRemoteStreamsList] = useState([]);

  const peerConnections = useRef({});
  const addedTracks = useRef({});
  const peerStates = useRef({});

  // Video fit states
  const [videoFitStates, setVideoFitStates] = useState({});

  // Update remote streams list when streams change
  useEffect(() => {
    const updateStreamsList = () => {
      const streamsList = [];
      Object.entries(remoteStreams.current).forEach(([userEmail, streams]) => {
        streams.forEach((stream, index) => {
          streamsList.push({
            id: `${userEmail}-${stream.id}`,
            userEmail,
            stream,
          });
        });
      });
      setRemoteStreamsList(streamsList);
    };

    // Set up an interval to check for stream changes
    const intervalId = setInterval(updateStreamsList, 1000);
    return () => clearInterval(intervalId);
  }, []);

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
        setLocalAudio(true);
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
    
    // Check if we already have this stream
    const existingStreamIndex = remoteStreams.current[fromEmail].findIndex(
      stream => stream.id === newStream.id
    );

    if (existingStreamIndex === -1) {
      // If we don't have this stream, add it
      remoteStreams.current[fromEmail].push(newStream);
    } else {
      // If we already have this stream, replace it
      remoteStreams.current[fromEmail][existingStreamIndex] = newStream;
    }

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
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((error) =>
        console.error("Error adding ICE candidate:", error),
      );
    }
  };

  const getGridClassName = () => {
    const streamCount = remoteStreamsList.length;

    if (streamCount <= 1) return "grid-cols-1";
    if (streamCount === 2) return "grid-cols-1 md:grid-cols-2";
    if (streamCount <= 4) return "grid-cols-2";
    if (streamCount <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  const toggleVideoFit = (streamId) => {
    setVideoFitStates((prev) => ({
      ...prev,
      [streamId]: !prev[streamId],
    }));
  };

  const handleMute = () => {
    setLocalAudio(!localaudio);
    localStream.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = !localaudio));
  };

  const handleCameraToggle = () => {
    setLocalVideo(!localvideo);
    localStream.current
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = !localvideo));
  };

  const handleLeave =async () => {
    // Clean up streams before navigating
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
   
    //close the mic and camera 
    setLocalAudio(false);
    setLocalVideo(false);

      window.open("/", "_blank");
 alert("This window will be closed in few seconds,pls do not close it manually"); 
 await logActionFrontend(conferenceId, "left", backend);

    //give allert saying this window will be closed in 10 sec dont give an ok options
     


    //open home tab in new window 
  
    setTimeout(() => {
 window.close();
        }, 30000);
   
  };

  // Handle video metadata loaded to detect orientation
  const handleVideoMetadata = (event, streamId) => {
    const video = event.target;
    const isPortrait = video.videoHeight > video.videoWidth;
    setVideoFitStates((prev) => ({
      ...prev,
      [streamId]: isPortrait, // Default to contain for portrait videos
    
    }));
  };

  return (
    <div className="relative min-h-screen bg-gray-900 p-4">
      {/* Main video grid */}
      <div
        className={`grid ${getGridClassName()} gap-4 p-2 mb-20`}
        style={{ minHeight: "calc(100vh - 8rem)" }}
      >
        {remoteStreamsList.map(({ id, userEmail, stream }) => (
          <div
            key={id}
            className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg"
          >
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el && el.srcObject !== stream) {
                  el.srcObject = stream;
                }
              }}
              onLoadedMetadata={(e) => handleVideoMetadata(e, id)}
              className={`w-full h-full ${
                videoFitStates[id] ? "object-contain" : "object-cover"
              }`}
            />
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => toggleVideoFit(id)}
                className="p-1.5 rounded-lg bg-gray-900/50 hover:bg-gray-900/70 transition-colors duration-200"
              >
                {videoFitStates[id] ? (
                  <Maximize2 className="w-4 h-4 text-white" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-white text-sm font-medium px-2">{userEmail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Local video preview */}
      <div className="absolute bottom-24 right-4 w-48 h-36 md:w-56 md:h-40 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          onLoadedMetadata={(e) => handleVideoMetadata(e, "local")}
        />
        <div className="absolute top-2 right-2">
          <button
            onClick={() => toggleVideoFit("local")}
            className="p-1.5 rounded-lg bg-gray-900/50 hover:bg-gray-900/70 transition-colors duration-200"
          >
            {videoFitStates["local"] ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm font-medium px-2">You ({email})</p>
        </div>
      </div>

      {/* Control bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gray-800 border-t border-gray-700">
        <div className="max-w-3xl mx-auto h-full flex items-center justify-center space-x-4">
          <button
            onClick={handleMute}
            className={`p-4 rounded-full ${
              localaudio
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            } transition-colors duration-200`}
          >
            {localaudio ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={handleCameraToggle}
            className={`p-4 rounded-full ${
              localvideo
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            } transition-colors duration-200`}
          >
            {localvideo ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={handleLeave}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Conference;
