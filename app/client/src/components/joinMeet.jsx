import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {logActionFrontend } from "./../utils/logging.js"

const JoinMeet = ({ onHandleJoin, baseip }) => {
  const navigate = useNavigate();
  //const backend ="https://192.168.33.109:5000";
  //const backend = "https://192.168.29.232:5000";
  const backend = baseip + ":5000";
  const [consferances, setConsferances] = useState([]);
  useEffect(() => {
    getConferences();
  }, []);

  const getConferences = async () => {
    try {
      const conferencesData = await axios.get(`${backend}/conference/ofuser`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });
      //console.log(conferencesData.data.conferences);
      //sorting the conferences based on date
      //log the token
      console.log(localStorage.getItem("token"));

      const Obtainedconferences = conferencesData.data.conferences;
      //console.log(Obtainedconferences);

      //console.log(Obtainedconferences);

      setConsferances(Obtainedconferences);
      //console.log(consferances);
    } catch (error) {
      console.log(error);
    }
  };

  const JoinSelected = async (e) => {
    try {
      e.preventDefault();
      const selectedConference = e.target.id;
      //console.log(selectedConference);
      //log the log action 
       logActionFrontend(selectedConference, "join");



      //navigate(`/conference/${selectedConference}`);
      window.open(`/conference/${selectedConference}`, "_blank");
    } catch (error) {
      console.log(error);
    }
  };

  const addfileSelected = async (e) => {
    //console.log("add file selected");
    try {
      e.preventDefault();
      const selectedConference = e.target.id;
      console.log(selectedConference);
      window.open(`/files/${selectedConference}`, "_blank");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <button
          className="mb-4 text-blue-500 font-bold hover:underline"
          onClick={onHandleJoin}
        >
          Back
        </button>
        <div className="flex flex-col gap-4">
          {consferances.map((conference, index) => (
            <div
              key={conference.conferenceId}
              className="flex justify-between items-center gap-4"
            >
              <button
                id={conference.conferenceId}
                className="flex-grow bg-blue-500 text-white font-bold py-2 px-4 rounded-lg"
                onClick={JoinSelected}
              >
                {conference.conferenceName}
              </button>
              <button
                id={conference.conferenceId}
                className="bg-gray-200 text-blue-500 font-bold py-2 px-4 rounded-lg"
                onClick={addfileSelected}
              >
                📁
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JoinMeet;
