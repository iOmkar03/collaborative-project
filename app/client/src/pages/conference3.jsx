import react from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const Conference = () => {
  const backend = "http://localhost:5000";
  const wsbackend = "ws://localhost:3001";
  const navigate = useNavigate();
  const { conferenceId } = useParams();
  const [conferenceSize, setConferenceSize] = useState(0);
  const [email, setEmail] = useState("");
  const socket = useRef(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);

  //local sream
  const [localaudio, setLocalAudio] = useState(true);
  const [localvideo, setLocalVideo] = useState(true);
  const localStream = useRef(null);

  //remotes streams
  const remoteStreams = useRef({});
  const peerConnections = useRef({});

  useEffect(() => {
    securitycheck();
    if (email) {
      connectSocket();
    }
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
        console.log("Received message:", data);

        switch (data.type) {
          case "joined":
            console.log("Joined the conference as:", data.role);
            hadleJoined(data.role);
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

  const hadleJoined = (role) => {
    //get the local stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream.current.srcObject = stream;
        setLocalAudio(true);
        setLocalVideo(true);
      })
      .catch((error) => {
        console.log("Failed to get local stream:", error);
        alert("Please allow access to the camera and microphone");
      });

    createPeerConnection();
  };

  const createPeerConnection = () => {
    console.log("Creating peer connection");
  };

  return (
    <div>
      Conference: {conferenceId}
      <div>
        <video ref={localStream} autoPlay playsInline />{" "}
      </div>
    </div>
  );
};

export default Conference;
