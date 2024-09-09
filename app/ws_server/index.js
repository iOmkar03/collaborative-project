const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // Configure CORS before defining any routes

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory storage for meetings
const meetings = {};

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  let meetingId;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "join") {
        meetingId = data.meetingId;

        if (!meetings[meetingId]) {
          meetings[meetingId] = {
            sp: [ws], // Initialize super-peer list with current WebSocket
            p: [], // Initialize peer list
            size: data.size,
          };
        } else {
          meetings[meetingId].sp.push(ws); // Add to super-peer list
        }

        console.log(`User joined meeting ${meetingId}`);
        console.log(meetings);
      } else if (data.type === "message" && meetingId && meetings[meetingId]) {
        meetings[meetingId].sp.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

else if (data.type === "offer" || data.type === "answer" || data.type === "candidate") {
    if (meetings[meetingId]) {
        // Forward the message to all clients (super-peers and peers)
        const allClients = [...meetings[meetingId].sp, ...meetings[meetingId].p];
        allClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    console.log(`Forwarded ${data.type} message to client`);
                } catch (error) {
                    console.error(`Error sending ${data.type} message to client:`, error);
                }
            }
        });
    } else {
        console.warn(`Meeting ${meetingId} does not exist`);
    }
}
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  ws.on("close", () => {
    if (meetingId && meetings[meetingId]) {
      meetings[meetingId].sp = meetings[meetingId].sp.filter(
        (client) => client !== ws,
      );
      console.log(`User left meeting ${meetingId}`);

      // Clean up meeting if no clients left
      if (
        meetings[meetingId].sp.length === 0 &&
        meetings[meetingId].p.length === 0
      ) {
        delete meetings[meetingId];
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`WebSocket server is listening on port ${port}`);
});
