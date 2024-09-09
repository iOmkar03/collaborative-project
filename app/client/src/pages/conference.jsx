
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
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const socket = useRef(null);
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const backend = "http://localhost:5000";
  const wsbackend = "ws://localhost:3001";
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const [meetSize, setMeetSize] = useState(2); // Default size, adjust as needed

  const initializeWebSocket = () => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      console.log("WebSocket is already open");
      return;
    }

    console.log("Initializing WebSocket connection");

    try {
      socket.current = new WebSocket(wsbackend);

      console.log("WebSocket object created");

      socket.current.onopen = () => {
        console.log("WebSocket connection opened successfully");
        setIsSocketOpen(true);
        socket.current.send(
          JSON.stringify({
            type: "join",
            meetingId,
            size: meetSize,
          })
        );
      };

      socket.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        if (!peerConnection) {
          console.warn("PeerConnection not initialized yet");
          return;
        }

        try {
          if (data.type === "offer") {
            console.log("Processing offer");
            await handleRemoteDescription(peerConnection, data.offer);
            const answer = await createAnswer(peerConnection);
            await peerConnection.setLocalDescription(answer);
            sendSignalingData(socket.current, "answer", answer);
          } else if (data.type === "answer") {
            console.log("Processing answer");
            await handleRemoteDescription(peerConnection, data.answer);
          } else if (data.type === "candidate") {
            console.log("Processing ICE candidate");
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsSocketOpen(false);
      };

      socket.current.onclose = (event) => {
        console.log("WebSocket connection closed", event);
        setIsSocketOpen(false);

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          initializeWebSocket();
        }, 5000);
      };

      // Add a timeout to check if the connection is established
      setTimeout(() => {
        if (socket.current.readyState !== WebSocket.OPEN) {
          console.log("WebSocket connection failed to open within 5 seconds");
        }
      }, 5000);

    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  };

  useEffect(() => {
    console.log("Starting WebSocket initialization");
    initializeWebSocket();

    return () => {
      console.log("Cleaning up WebSocket connection");
      if (socket.current) {
        socket.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        console.log("Initializing media and peer connection");
        const localStream = await getUserMedia({ video: true, audio: true });
        attachStreamToVideoElement(localVideoRef.current, localStream);

        const newPeerConnection = createPeerConnection(
          { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
          (candidate) => {
            if (isSocketOpen && socket.current) {
              sendSignalingData(socket.current, "candidate", candidate);
            } else {
              console.warn("WebSocket not open, can't send candidate");
            }
          },
          (event) => {
            console.log("Track received", event);
            if (remoteVideoRef.current && event.streams && event.streams[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          }
        );

        newPeerConnection.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", newPeerConnection.iceConnectionState);
        };

        newPeerConnection.onsignalingstatechange = () => {
          console.log("Signaling state:", newPeerConnection.signalingState);
        };

        addLocalTracks(newPeerConnection, localStream);
        setPeerConnection(newPeerConnection);

        // Create and send offer
        const offer = await createOffer(newPeerConnection);
        await newPeerConnection.setLocalDescription(offer);
        if (isSocketOpen && socket.current) {
          sendSignalingData(socket.current, "offer", offer);
          console.log("Offer created and sent");
        }

        console.log("Peer connection initialized");
      } catch (error) {
        console.error("Error initializing connection:", error);
      }
    };

    if (isSocketOpen) {
      initializeConnection();
    }
  }, [isSocketOpen]);

  const securityCheck = async () => {
    try {
      const check = await axios.get(`${backend}/conference/access`, {
        headers: {
          token: localStorage.getItem("token"),
          conferenceId: meetingId,
        },
      });

      const size = check.data.size;
      setMeetSize(size);
    } catch (error) {
      console.error("Authorization error:", error);
      alert("You are not authorized to view this conference");
      navigate("/");
    }
  };

  return (
    <div>
      <h1>Conference {meetingId}</h1>
      <div>
        <video ref={localVideoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
};

export default Conference;

