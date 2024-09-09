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

    if (data.type === "join") {
      if (!meetings[data.conferenceId]) {
        meetings[data.conferenceId] = {
          sp: [ws], // Array of super-peers
        };
      } else {
        meetings[data.conferenceId].sp.push(ws);
      }
      console.log(`User joined meeting ${data.conferenceId}`);

      // Notify other users in the meeting that a new super-peer has joined
      meetings[data.conferenceId].sp.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(
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
      console.log(
        `Received ${data.type} message for meeting ${data.conferenceId}`,
      );
      if (meetings[data.conferenceId]) {
        const allClients = meetings[data.conferenceId].sp;
        allClients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(data));
              console.log(`Forwarded ${data.type} message to client`);
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
      if (meetings[meetingId].sp.includes(ws)) {
        meetings[meetingId].sp = meetings[meetingId].sp.filter(
          (client) => client !== ws,
        );
        console.log(`User left meeting ${meetingId}`);

        // Cleanup if the meeting is empty
        if (meetings[meetingId].sp.length === 0) {
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
