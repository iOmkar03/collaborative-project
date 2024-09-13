const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // Configure CORS before defining any routes
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory storage for meetings
const meetings = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    //console.log("Received message:", data.email);
    if (data.type === "join") {
      if (!meetings[data.conferenceId]) {
        meetings[data.conferenceId] = {
          sp: [
            {
              ws: ws,
              email: data.email,
            },
          ],
        };
      } else {
        // Check if user is already in the meeting
        if (
          meetings[data.conferenceId].sp.some(
            (peer) => peer.email === data.email,
          )
        ) {
          console.log("User already in meeting");
          console.log(meetings);
          return;
        }
        meetings[data.conferenceId].sp.push({
          ws: ws,
          email: data.email,
        });
      }
      //console.log(`User joined meeting ${data.conferenceId}`);
      console.log(meetings);

      // Notify other users in the meeting that a new super-peer has joined
      meetings[data.conferenceId].sp.forEach((client) => {
        if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(
            JSON.stringify({
              type: "sp-joined",
              conferenceId: data.conferenceId,
            }),
          );
        }
      });
    } else if (
      data.type === "offer" ||
      data.type === "answer" ||
      data.type === "candidate"
    ) {
      //console.log(
      //  `Received ${data.type} message for meeting ${data.conferenceId}`,
      //);
      if (meetings[data.conferenceId]) {
        const allClients = meetings[data.conferenceId].sp;
        allClients.forEach((client) => {
          if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
            try {
              client.ws.send(JSON.stringify(data));
              //console.log(`Forwarded ${data.type} message to client`);
            } catch (error) {
              console.error(
               `Error sending ${data.type} message to client:`,
                error,
              );
            }
          }
        });
      } else {
        console.error(`Meeting ${data.conferenceId} not found`);
      }
    }
  });

  ws.on("close", () => {
    // Remove the WebSocket connection from the meeting
    for (const meetingId in meetings) {
      const meeting = meetings[meetingId];
      const clientIndex = meeting.sp.findIndex((client) => client.ws === ws);
      if (clientIndex !== -1) {
        const leaving_user = meeting.sp[clientIndex];
        meeting.sp.splice(clientIndex, 1); // Remove the user from super-peer list
        //console.log(`User ${leaving_user} meeting ${meetingId}`);

        // Notify other users that the user has left
        meeting.sp.forEach((client) => {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(
              JSON.stringify({
                type: "sp-left",
                conferenceId: meetingId,
                email: leaving_user.email,
              }),
            );
          }
        });

        // Cleanup if the meeting is empty
        if (meeting.sp.length === 0) {
          delete meetings[meetingId];
          console.log(`Meeting ${meetingId} has been deleted`);
        }
        console.log(meetings);
      }
    }
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`WebSocket server is listening on port ${port}`);
});
