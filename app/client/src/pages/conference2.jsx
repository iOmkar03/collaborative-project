
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  createPeerConnection,
  addLocalTracks,
  handleRemoteDescription,
  createOffer,
  createAnswer,
} from "../utils/webrtcUtils";
import { getUserMedia, attachStreamToVideoElement } from "../utils/mediaUtils";
import { sendSignalingData } from "../utils/signalingUtils";

const Conference = () => {
  const navigate = useNavigate();
  const backend = "http://localhost:5000";
  const wsbackend = "ws://localhost:3001";
  const conferenceId = useParams().id;
  const socket = useRef(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(
    new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },
        { urls: "stun:stun1.l.google.com:5349" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:5349" },
        { urls: "stun:stun3.l.google.com:3478" },
        { urls: "stun:stun3.l.google.com:5349" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:5349" },
      ],
    }),
  );

  useEffect(() => {
    securitycheck();
    connectSocket();
    if (isSocketOpen) {
      getlocalStream();
    }
  }, [isSocketOpen]);

  const securitycheck = async () => {
    try {
      const check = await axios.get(`${backend}/conference/access`, {
        headers: {
          token: localStorage.getItem("token"),
          conferenceId: conferenceId,
        },
      });
    } catch (error) {
      alert("You are not authorized to view this conference");
      navigate("/");
    }
  };

  const connectSocket = () => {
    if (socket.current) {
      // Check if the socket is connecting or already open
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
        // Send a message to join the conferenceId
        const messages = {
          type: "join",
          conferenceId,
        };
        sendSignal(messages);
      };

      socket.current.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        // Attempt to reconnect after the connection is closed
        setIsSocketOpen(false);
        setTimeout(connectSocket, 5000);
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Attempt to reconnect after an error
        setIsSocketOpen(false);
        setTimeout(connectSocket, 5000);
      };

      socket.current.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.type === "sp-joined") {
          peerConnection.current.createOffer().then((offer) => {
            peerConnection.current.setLocalDescription(offer);
            sendSignal({
              type: "offer",
              conferenceId:conferenceId,
              offer:offer,
            });
          });
        } else if (data.type === "offer") {
          peerConnection.current.setRemoteDescription(data.offer);
          peerConnection.current.createAnswer().then((answer) => {
            peerConnection.current.setLocalDescription(answer);
            sendSignal({
              type: "answer",
              conferenceId:conferenceId,
              answer:answer,
            });
          });
        } else if (data.type === "answer") {
          peerConnection.current.setRemoteDescription(data.answer);
        } else if (data.type === "candidate") {
          peerConnection.current.addIceCandidate(data.candidate);
        }
      };

      // Handle remote tracks
      peerConnection.current.ontrack = (event) => {
        console.log("Remote track received");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

    } catch (error) {
      console.error("Failed to connect to the WebSocket server:", error);
      // Attempt to reconnect after a failure
      setTimeout(connectSocket, 5000);
    }
  };

  const sendSignal = (message) => {
    socket.current.send(JSON.stringify(message));
  };

  const getlocalStream = async () => {
    try {
      const localStream = await getUserMedia({ video: true, audio: true });
      attachStreamToVideoElement(localVideoRef.current, localStream);
      // Add local tracks to the peer connection
      addLocalTracks(peerConnection.current, localStream);
    } catch (error) {
      console.error("Failed to get local stream:", error);
    }
  };

  return (
    <div>
      <h1>Conference {conferenceId}</h1>
      <div>
        <video ref={localVideoRef} autoPlay playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
};

export default Conference;

