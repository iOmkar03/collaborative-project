import React, { useState } from "react";
import axios from "axios";

const UploadToIpfs = ({
  conferenceId,
  backend,
  fetchConferenceData,
  handleUploadClick,
}) => {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState("");
  const [isUploading, setIsUploading] = useState(false); // State to track uploading status

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true); // Set uploading to true
    try {
      console.log("Starting IPFS upload...");
      const fileData = new FormData();
      fileData.append("file", file);

      const toIpfs = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: fileData,
        headers: {
          pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
          pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_API_KEY,
          "Content-Type": "multipart/form-data",
        },
      });

      const url = "https://gateway.pinata.cloud/ipfs/" + toIpfs.data.IpfsHash;
      console.log("File uploaded to IPFS:", url);

      const body = {
        conferenceId,
        fileName,
        url,
      };

      const toDb = await axios({
        method: "post",
        url: `${backend}/ipfs/add`,
        headers: {
          token: localStorage.getItem("token"),
          "Content-Type": "application/json",
        },
        data: body,
      });

      if (toDb.status === 200) {
        console.log("File successfully saved to DB");
        fetchConferenceData(); // Update conference data after upload
        handleUploadClick(); // Close the form
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false); // Reset uploading state
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <form
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Upload File</h2>
          <button
            type="button"
            onClick={handleUploadClick}
            className="text-red-500 font-bold hover:underline"
          >
            ❌
          </button>
        </div>
        <input
          type="text"
          placeholder="File Name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className={`${
            isUploading ? "bg-blue-300" : "bg-blue-500"
          } text-white font-bold py-2 px-4 rounded-lg`}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
};

export default UploadToIpfs;
