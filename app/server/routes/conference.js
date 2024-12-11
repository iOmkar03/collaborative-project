const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/auth.js");
const { Conference } = require("../db/schema.js");
const { User } = require("../db/schema.js");

router.post("/create", verifyUser, async (req, res) => {
  try {
    //console.log(req.body);
    const { name, participants } = req.body;
    //console.log(name,participants);
    const newConference = new Conference({
      name: name,
      participants: participants,
    });
    const addedmeet = await newConference.save();
    const meetId = addedmeet._id.toString();
    //console.log(req.user);

    for (let participant of participants) {
      const creator = await User.findOne({ email: participant });
      //console.log(creator);
      creator.conferences.push({
        conferenceId: meetId,
        conferenceName: name,
        timestamp: new Date(),
      });
      await creator.save();
    }
    res.status(200).json({
      message: "Meet Created",
      meetId: meetId
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/ofuser", verifyUser, async (req, res) => {
  try {
    const email = req.user;
    //console.log(email);
    const user = await User.findOne({ email: email });
    //console.log(user);
    const conferences = user.conferences;
    //console.log(conferences);
    res.status(200).json({
      conferences: conferences,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/access", verifyUser, async (req, res) => {
  try {
    const email = req.user;
    const conferenceId = req.headers.conferenceid;
    //console.log(email);
    //console.log(conferenceId);
    const conference = await Conference.findOne({ _id: conferenceId });
    //console.log(conference);
    const participants = conference.participants;
    const size = participants.length;
    const files = conference.files;

    if (participants.includes(email)) {
      res.status(200).json({
        message: "Authorized",
        name: conference.name,
        size: size,
        email: email,
        participants: participants,
        files: files,
      });
    } else {
      res.status(401).json({
        message: "Unauthorized",
      });
    }
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized",
      error: error,
    });
  }
});

router.post("/log", verifyUser, async (req, res) => {
  try {
    const { meetingId, action, by, link, timestamp } = req.body;
    const conference = await Conference.findOne({ _id: meetingId });
    conference.logs.push({
      action: action,
      by: by,
      link: link,
      timestamp: timestamp,
    });
    await conference.save();
    res.status(200).json({
      message: "Logged",
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/log", verifyUser, async (req, res) => {
  try {
    const meetingId = req.headers.meetingid;
    const conference = await Conference.findOne({ _id: meetingId });
    const logs = conference.logs;
    console.log(logs);
    res.status(200).json({
      logs: logs,
    });
  } catch (error) {
    console.log(error);
  }
}
);

module.exports = router;
