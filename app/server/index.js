const express = require("express");
const port = 5000;
const cors = require("cors");
const connectDB = require('./db/connections.js');
const userRouter = require("./routes/users.js");
const conferenceRouter = require("./routes/conference.js");
const app = express();
app.use(express.json());
app.use(cors());

async function startServer() {
  try {

    connectDB();


    app.get("/", (req, res) => {
      console.log("Reach");
      res.send("Welcome to BlockMeet server");
    });

    //routes
    app.use("/users", userRouter);
    app.use("/conference", conferenceRouter);

    app.listen(port, () => {
      console.log(`Blockmeet Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startServer();
