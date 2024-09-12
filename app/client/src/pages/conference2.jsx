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
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  let originalMLineOrder = [];
  const hasRefreshed = useRef(false); // Track if the page has already been refreshed

  useEffect(() => {
    securitycheck();
    connectSocket();
  }, []);

  useEffect(() => {
    if (isSocketOpen) {
      getlocalStream();
      brute();
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
  const handleNewJoin = () => {
    // Refresh only once when a new participant joins
    if (!hasRefreshed.current) {
      console.log("New participant joined, refreshing page once...");
      hasRefreshed.current = true; // Mark as refreshed
      window.location.reload(); // Trigger hard refresh
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
            //setTimeout(handleNewJoin, 5000);

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
        attachStreamToVideoElement(remoteVideoRef.current, event.streams[0]);
      };

      peerConnection.current.onnegotiationneeded = async () => {
        try {
          // Only create an offer if signaling state is 'stable'
          if (peerConnection.current.signalingState === "stable") {
            await createOfferAndSend();
          } else {
            console.log("Negotiation needed but signaling state is not stable");
          }
        } catch (error) {
          console.error("Error during renegotiation:", error);
        }
      };
    }
  };

  // Function to parse the m-line order from an SDP

  const createOfferAndSend = async () => {
    try {
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      };

      // Only proceed if the signaling state is 'have-local-offer' or 'have-remote-offer'
      if (peerConnection.current.signalingState !== "stable") {
        console.log("Signaling state is not stable, skipping offer creation");
        return;
      }

      const offer = await peerConnection.current.createOffer(offerOptions);

      // Ensure audio comes before video in the SDP
      offer.sdp = ensureAudioBeforeVideo(offer.sdp);

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

  const ensureAudioBeforeVideo = (sdp) => {
    const sdpLines = sdp.split("\r\n");
    const audioIndex = sdpLines.findIndex((line) => line.startsWith("m=audio"));
    const videoIndex = sdpLines.findIndex((line) => line.startsWith("m=video"));

    if (audioIndex !== -1 && videoIndex !== -1 && videoIndex < audioIndex) {
      // Swap audio and video sections
      const audioSection = sdpLines.splice(audioIndex, videoIndex - audioIndex);
      sdpLines.splice(videoIndex, 0, ...audioSection);
    }

    return sdpLines.join("\r\n");
  };

  const handleRemoteOffer = async (offer) => {
    if (
      !peerConnection.current ||
      peerConnection.current.connectionState === "closed"
    ) {
      handlePeerConnection();
    }

    try {
      // Ensure SDP order
      offer.sdp = ensureAudioBeforeVideo(offer.sdp);

      // Handle signaling state
      console.log("Signaling state:", peerConnection.current.signalingState);
      if (peerConnection.current.signalingState === "stable") {
        // Directly set the remote description if signaling state is stable
        console.log("Setting remote description directly");
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer),
        );
        console.log("Remote description set successfully");

        // Create and set local answer
        const answer = await peerConnection.current.createAnswer();
        answer.sdp = ensureAudioBeforeVideo(answer.sdp);
        await peerConnection.current.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          conferenceId: conferenceId,
          answer: answer,
        });
        //console.log("test");
        //refresh the page
        //window.location.reload();
      } else {
        // Rollback and retry if the signaling state is not stable
        console.log("Signaling state is not stable. Rolling back...");
        await Promise.all([
          peerConnection.current.setLocalDescription({ type: "rollback" }),
          peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(offer),
          ),
        ]);
        console.log("Retrying with new offer...");

        const answer = await peerConnection.current.createAnswer();
        answer.sdp = ensureAudioBeforeVideo(answer.sdp);
        await peerConnection.current.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          conferenceId: conferenceId,
          answer: answer,
        });
      }
    } catch (error) {
      console.error("Error handling remote offer:", error);
    }
  };

  const handleRemoteAnswer = async (answer) => {
    try {
      if (peerConnection.current.signalingState === "have-local-offer") {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
      } else {
        console.warn(
          "Received answer in unexpected state:",
          peerConnection.current.signalingState,
        );
      }
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

  const brute = () => {
    handlePeerConnection();
    createOfferAndSend();
    console.log("brute fired");
  };

  const getlocalStream = async () => {
    try {
      const constraints = { audio: true, video: true };
      const localStream = await getUserMedia(constraints);
      attachStreamToVideoElement(localVideoRef.current, localStream);
      if (peerConnection.current) {
        addLocalTracks(peerConnection.current, localStream);
        console.log("Local stream added to peer connection");
        // Remove this line:
        // createOfferAndSend();
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
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
};

export default Conference;
