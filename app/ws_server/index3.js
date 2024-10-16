const https = require("https");
const fs = require("fs");
const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");

// Read certificate and key files
const privateKey = fs.readFileSync(
  "E:/MERN/Projests/FInlaYearProject/server.key",
  "utf8",
);
const certificate = fs.readFileSync(
  "E:/MERN/Projests/FInlaYearProject/server.cert",
  "utf8",
);

const credentials = { key: privateKey, cert: certificate };

// Create an Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create an HTTPS server using the credentials
const server = https.createServer(credentials, app);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocket.Server({ server });

// In-memory storage for meetings
const meetings = {};

// WebSocket connection handler
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    //console.log("Received:", data);

    switch (data.type) {
      case "join":
        handleJoin(ws, data);
        break;
      case "offer":
        handleOffer(ws, data);
        break;
      case "answer":
        handleAnswer(ws, data);
        break;
      case "icecandidate":
        handleIceCandidate(ws, data);
        break;
      default:
        break;
    }
  });

  ws.on("close", () => {
    handleClose(ws);
  });
});

// Define a basic route for testing the Express server
app.get("/", (req, res) => {
  res.send("Welcome to the Secure BlockMeet server!");
});

// Start the HTTPS and WebSocket servers
const port = process.env.PORT || 3001;
server.listen(port, "0.0.0.0", () => {
  console.log(`Secure WebSocket server is listening on port ${port}`);
});

function handleJoin(ws, data) {
  //console.log("Joining:", data);
  const { conferenceId, email, size } = data;

  // Initialize the meeting if it doesn't exist
  if (!meetings[conferenceId]) {
    meetings[conferenceId] = {
      size: size,
      sp_count: Math.ceil(size / 3), // 1 super-peer per 3 participants,
      conferenceId: conferenceId,
      sp: [
        {
          email: email,
          ws: ws,
          np: [], // list to track normal peers assigned to this SP
        },
      ],
      np: [], // list to track normal peers
    };

    // Super-peer sends 'joined' response
    ws.send(
      JSON.stringify({
        type: "joined",
        conferenceId,
        role: "sp",
        from: email,
      }),
    );
  } else {
    const meeting = meetings[conferenceId];

    //dont allow the user to join the meeting if he is already in the meeting
    if (
      meeting.sp.some((sp) => sp.email === email) ||
      meeting.np.some((np) => np.email === email)
    ) {
      console.log("User already in meeting");
      console.log(meetings);
      return;
    }

    // Check if we need more super-peers (SP)
    if (meeting.sp.length < meeting.sp_count) {
      meeting.sp.push({
        email: email,
        ws: ws,
        np: [], // track normal peers assigned to this SP
      });

      // New super-peer sends 'joined' response
      ws.send(
        JSON.stringify({
          type: "joined",
          conferenceId,
          role: "sp",
          from: email,
        }),
      );

      meetings[conferenceId].sp[meetings[conferenceId].sp.length - 2].ws.send(
        JSON.stringify({
          type: "joined",
          conferenceId,
          role: "sp",
          from: meetings[conferenceId].sp[meetings[conferenceId].sp.length - 1]
            .email,
          position: "next",
        }),
      );
    } else {
      // Assign as a normal peer (NP) to a super-peer (SP)
      let assigned = false;

      // Find an SP that has fewer than 3 NPs
      for (let sp of meeting.sp) {
        if (sp.np.length < 1) {
          // Adjust number of NPs per SP as per requirement
          //
          meetings[conferenceId].np.push({
            email: email,
            ws: ws,
          });

          sp.np.push({
            email: email,
            ws: ws,
          });

          // Normal peer sends 'joined' response
          ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId,
              role: "np",
              assignedTo: sp.email,
              postion: "self",
              from: email,
            }),
          );

          sp.ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId,
              role: "sp",
              from: email,
              position: "child",
            }),
          );

          assigned = true;
          break;
        } else if (sp.np.length < 2) {
          // Adjust number of NPs per SP as per requirement
          //
          meetings[conferenceId].np.push({
            email: email,
            ws: ws,
          });

          sp.np.push({
            email: email,
            ws: ws,
          });

          // Normal peer sends 'joined' response
          ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId,
              role: "np",
              assignedTo: sp.email,
              postion: "self",
              from: email,
            }),
          );

          sp.ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId,
              role: "sp",
              from: email,
              position: "child",
            }),
          );

          assigned = true;
          break;
        }
      }

      if (!assigned) {
        // Handle the case where no SP has capacity (shouldn't happen if size is correct)
        console.log("All super-peers are full, no space for NP.");
      }
    }
  }

  //display entire meeting object
  //sp in sp make sure dont neet to displsy the content of ws

  console.log("sp", meetings[conferenceId].sp);
  console.log("np", meetings[conferenceId].np);

  //
}

function handleClose(ws) {
  //console.log("Closing:", ws);

  //find the meeting the user is in
  let meeting = Object.values(meetings).find((meeting) => {
    return (
      meeting.sp.some((sp) => sp.ws === ws) ||
      meeting.np.some((np) => np.ws === ws)
    );
  });

  if (!meeting) {
    console.log("Meeting not found for user");
    return;
  }

  //find the email of the user
  let email =
    meeting.sp.find((sp) => sp.ws === ws)?.email ||
    meeting.np.find((np) => np.ws === ws)?.email;

  if (!email) {
    console.log("Email not found for user");
    return;
  }

  //find if the user is a super-peer
  let spIndex = meeting.sp.findIndex((sp) => sp.email === email);
  if (spIndex !== -1) {
    console.log("Super-peer leaving the meeting");
    //get ws of the super-peer
    const sp = meeting.sp[spIndex];
    //remove the super-peer from the meeting and make its normal peers super-peers
    meeting.sp.splice(spIndex, 1);

    //if sp has np then select 1, remove it from np and make it super-peer;
    //and add sp's remaining np to the new super-peer
    if (sp.np.length > 0) {
      let newsp = sp.np[0];
      //remove the np from the np list of the meeting
      let npIndex = meeting.np.findIndex((np) => np.email === newsp.email);
      meeting.np.splice(npIndex, 1);

      //remove the np from the np list of the sp
      if (sp.np.length > 1) {
        meeting.sp[spIndex] = {
          email: newsp.email,
          ws: newsp.ws,
          np: [sp.np[1]],
        };
      } else {
        meeting.sp[spIndex] = {
          email: newsp.email,
          ws: newsp.ws,
          np: [],
        };
      }
      // Let others know about this change
      if (spIndex === 0) {
        if (meeting.sp.length === 1) {
          meeting.sp[spIndex].ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId: meeting.conferenceId,
              role: "sp",
              from: newsp.email,
              position: "self",
            }),
          );
        } else {
          meeting.sp[spIndex + 1].ws.send(
            JSON.stringify({
              type: "joined",
              conferenceId: meeting.conferenceId,
              role: "sp",
              from: newsp.email,
              position: "prev",
            }),
          );
        }
      } else if (spIndex + 1 === meeting.sp.length) {
        meeting.sp[spIndex - 1].ws.send(
          JSON.stringify({
            type: "joined",
            conferenceId: meeting.conferenceId,
            role: "sp",
            from: newsp.email,
            position: "next",
          }),
        );

        //all send message to the np of this new sp if any
      } else {
        meeting.sp[spIndex - 1].ws.send(
          JSON.stringify({
            type: "joined",
            conferenceId: meeting.conferenceId,
            role: "sp",
            from: newsp.email,
            position: "next",
          }),
        );
        meeting.sp[spIndex + 1].ws.send(
          JSON.stringify({
            type: "joined",
            conferenceId: meeting.conferenceId,
            role: "sp",
            from: newsp.email,
            position: "prev",
          }),
        );
      }
    }
  } else {
    //remove the np from the list of np
    let npIndex = meeting.np.findIndex((np) => np.email === email);
    meeting.np.splice(npIndex, 1);

    //remove the np from the list of np of the sp
    for (let sp of meeting.sp) {
      let npIndex = sp.np.findIndex((np) => np.email === email);
      if (npIndex !== -1) {
        sp.np.splice(npIndex, 1);
        break;
      }
    }
  }

  //if the meeting is empty then delete the meeting
  if (meeting.sp.length === 0 && meeting.np.length === 0) {
    delete meetings[meeting.conferenceId];
    console.log("Meeting has been deleted");
  }

  console.log("meetings", meetings);
} // Close if (sp.np.length > 0) block

function handleOffer(ws, data) {
  //console.log("offer:", data);
  const { conferenceId, to, from, offer } = data;

  // Find the WebSocket connection for the recipient
  // and send the offer message

  let meeting = Object.values(meetings).find(
    (meeting) =>
      meeting.sp.some((sp) => sp.email === to) ||
      meeting.np.some((np) => np.email === to),
  );

  if (!meeting) {
    console.log("Meeting not found for user");
    return;
  }

  let recipient = meeting.sp.find((sp) => sp.email === to);

  if (!recipient) {
    recipient = meeting.np.find((np) => np.email === to);
  }

  if (!recipient) {
    console.log("Recipient not found");
    return;
  }

  recipient.ws.send(
    JSON.stringify({
      type: "offer",
      conferenceId,
      from,
      offer,
      streamOf: data.streamOf,
      streamOf2: data.streamOf2,
    }),
  );

  console.log("Offer sent to:", recipient.email, "from", from);
}

function handleAnswer(ws, data) {
  //console.log("answer:", data);
  const { conferenceId, to, from, answer } = data;

  // Find the WebSocket connection for the recipient
  // and send the answer message

  let meeting = Object.values(meetings).find(
    (meeting) =>
      meeting.sp.some((sp) => sp.email === to) ||
      meeting.np.some((np) => np.email === to),
  );

  if (!meeting) {
    console.log("Meeting not found for user");
    return;
  }

  let recipient = meeting.sp.find((sp) => sp.email === to);

  if (!recipient) {
    recipient = meeting.np.find((np) => np.email === to);
  }

  if (!recipient) {
    console.log("Recipient not found");
    return;
  }

  recipient.ws.send(
    JSON.stringify({
      type: "answer",
      conferenceId,
      from,
      answer,
    }),
  );

  console.log("Answer sent to:", recipient.email, "from", from);
}

function handleIceCandidate(ws, data) {
  //console.log("ICE candidate:", data);
  const { conferenceId, to, from, candidate } = data;

  let meeting = meetings[conferenceId];
  if (!meeting) {
    console.log("Meeting not found");
    return;
  }

  let recipient = meeting.sp.find((sp) => sp.email === to);
  if (!recipient) {
    recipient = meeting.np.find((np) => np.email === to);
  }

  if (!recipient) {
    console.log("Recipient not found");
    return;
  }

  recipient.ws.send(
    JSON.stringify({
      type: "icecandidate",
      conferenceId,
      from,
      candidate,
    }),
  );

  console.log("ICE candidate sent to:", recipient.email, "from", from);
}
