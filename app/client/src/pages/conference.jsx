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
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const [remoteVideoRef, setRemoteVideoRef] = useState(null); // Use state to trigger re-render
  const peerConnection = useRef(null);

  useEffect(() => {
    securitycheck();
    connectSocket();
  }, []);

  useEffect(() => {
    if (isSocketOpen) {
      getlocalStream();
    }
  }, [isSocketOpen]);

  useEffect(() => {
    // Ensure the video element is updated with the remote stream
    if (remoteStream && remoteVideoRef) {
      attachStreamToVideoElement(remoteVideoRef, remoteStream);
    }
  }, [remoteStream, remoteVideoRef]);

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
        };
        sendSignal(messages);
      };

      socket.current.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        peerConnection.current.close();
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
          case "sp-joined":
            handlePeerConnection();
            createOfferAndSend();
            break;
          case "offer":
            handleRemoteOffer(data.offer);
            console.log("Received remote offer");
            break;
          case "answer":
            handleRemoteAnswer(data.answer);
            console.log("Received remote answer");
            break;
          case "candidate":
            handleNewICECandidate(data.candidate);
            console.log("Received new ICE candidate");
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

  const handlePeerConnection = () => {
    if (
      !peerConnection.current ||
      peerConnection.current.connectionState === "closed"
    ) {
      console.log("Creating a new RTCPeerConnection");
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.l.google.com:5349" },
          // Add additional STUN/TURN servers if needed
        ],
      });

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("ICE candidate gathered:", event.candidate);
          sendSignal({
            type: "candidate",
            conferenceId: conferenceId,
            candidate: event.candidate,
          });
        } else {
          console.log("All ICE candidates have been sent");
        }
      };

      peerConnection.current.ontrack = (event) => {
        console.log("Received remote track");
        setRemoteStream(event.streams[0]);
      };
    }
  };

  const createOfferAndSend = async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log("Sending offer:", offer);
      sendSignal({
        type: "offer",
        conferenceId: conferenceId,
        offer: offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };
  const handleRemoteOffer = async (offer) => {
    if (
      !peerConnection.current ||
      peerConnection.current.connectionState === "closed"
    ) {
      handlePeerConnection();
    }

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      sendSignal({
        type: "answer",
        conferenceId: conferenceId,
        answer: answer,
      });
    } catch (error) {
      console.error("Error handling remote offer:", error);
    }
  };

  const handleRemoteAnswer = async (answer) => {
    try {
      await peerConnection.current.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  };

  const handleNewICECandidate = async (candidate) => {
    console.log("Received new ICE candidate", candidate);
    try {
      await peerConnection.current.addIceCandidate(candidate);
      console.log("ICE candidate added successfully");
    } catch (error) {
      console.error("Error adding new ICE candidate:", error);
    }
  };

  const sendSignal = (message) => {
    socket.current.send(JSON.stringify(message));
  };

  const getlocalStream = async () => {
    try {
      const localStream = await getUserMedia({ video: true, audio: true });
      attachStreamToVideoElement(localVideoRef.current, localStream);
      if (peerConnection.current) {
        addLocalTracks(peerConnection.current, localStream);
        console.log("Local stream added to peer connection");
        // Only after local tracks are added, create the offer
        createOfferAndSend();
      }
    } catch (error) {
      console.error("Failed to get local stream:", error);
    }
  };
  return (
    <div>
      <h1>Conference {conferenceId}</h1>
      <div>
        <video ref={localVideoRef} autoPlay playsInline />
        <video
          ref={(ref) => setRemoteVideoRef(ref)} // Use callback ref to trigger state update
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
};

export default Conference;
