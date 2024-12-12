import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import UploadToIpfs from "./../components/uploadToIpfs.jsx";
import {logActionFrontend} from "./../utils/logging.js";

const IpfsFiles = ({ baseip }) => {
  const conferenceId = useParams().conferenceId;
  //const backend = baseip + ":5000";
  const backend = import.meta.env.VITE_BACKEND;
  const [conferenceData, setConferenceData] = useState([]);
  const [uploadclicked, setUploadClicked] = useState(false);

  useEffect(() => {
    fetchConferenceData();
  }, []);

  const fetchConferenceData = async () => {
    try {
      const response = await axios.get(`${backend}/conference/access`, {
        headers: {
          conferenceid: conferenceId,
          token: localStorage.getItem("token"),
        },
      });
      console.log(response.data);
      setConferenceData(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleUploadClick = async () => {
    console.log("upload clicked");
    setUploadClicked(!uploadclicked);
    if (uploadclicked === false) {
      fetchConferenceData();
    }
  };

  const handleFileOpen = async (e) => {
    console.log("file opened:"+e.target.href);
    logActionFrontend(conferenceId, "File opened:"+e.target.href, backend);
  }

  return (
    <div className="flex flex-col gap-6 p-4 bg-blue-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-blue-500 text-white p-4 rounded-lg shadow-md">
        {/* Meet Name */}
        <h1 className="text-2xl font-bold">{conferenceData.name}</h1>
        {/* Upload Button */}
        <button
          className="bg-white text-blue-500 font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-100 transition"
          onClick={handleUploadClick} // Replace with your upload handler
        >
          ⬆️ Upload
        </button>
      </div>

      {/* Files Section */}
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-3xl mx-auto">
        <h1 className="text-lg font-semibold mb-4 text-blue-700">Files:</h1>

        {/* Display Files */}
        {conferenceData.files && conferenceData.files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {conferenceData.files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-blue-100 p-4 rounded-lg hover:bg-blue-200 transition"
              >
                <span className="text-blue-700 font-medium">{file.name}</span>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                  onClick={handleFileOpen}
                  
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        ) : (
          // No Files Message
          <div className="text-blue-500 font-medium text-center">
            No files uploaded
          </div>
        )}
      </div>
      {uploadclicked && (
        <UploadToIpfs
          conferenceId={conferenceId}
          backend={backend}
          fetchConferenceData={fetchConferenceData}
          handleUploadClick={handleUploadClick}
        />
      )}
    </div>
  );
};
export default IpfsFiles;
