const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/auth.js");
const { Conference } = require("../db/schema.js");
const { User } = require("../db/schema.js");

router.post("/add", verifyUser, async (req, res) => {
  try {
    const { conferenceId, fileName, url } = req.body;

    // Validate the input
    if (!conferenceId || !fileName || !url) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the conference by ID
    const conferenceToAdd = await Conference.findOne({ _id: conferenceId });

    if (!conferenceToAdd) {
      return res.status(404).json({ message: "Conference not found" });
    }

    // Add the file details to the conference's files array
    conferenceToAdd.files.push({ name: fileName, url });

    // Save the updated conference
    await conferenceToAdd.save();

    res.status(200).json({
      message: "File added successfully",
      updatedConference: conferenceToAdd,
    });
  } catch (error) {
    console.error("Error adding file to conference:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
