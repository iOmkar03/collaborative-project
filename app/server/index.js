const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const connectDB = require("./db/connections.js");
const userRouter = require("./routes/users.js");
const conferenceRouter = require("./routes/conference.js");
const ipfsRouter = require("./routes/ipfs.js");

const app = express();
const port = 5000;

// Read your certificate and key files
const httpsOptions = {
  key: fs.readFileSync("E:/MERN/Projests/FInlaYearProject/server.key"),
  cert: fs.readFileSync("E:/MERN/Projests/FInlaYearProject/server.cert"),
};

app.use(express.json());
app.use(cors());

async function startServer() {
  try {
    connectDB();

    app.get("/", (req, res) => {
      console.log("Reach");
      res.send("Welcome to BlockMeet server");
    });

    // Routes
    app.use("/users", userRouter);
    app.use("/conference", conferenceRouter);
    app.use("/ipfs", ipfsRouter);

    // Create HTTPS server
    https.createServer(httpsOptions, app).listen(port, "0.0.0.0", () => {
      console.log(`Blockmeet Server is running on https://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startServer();
