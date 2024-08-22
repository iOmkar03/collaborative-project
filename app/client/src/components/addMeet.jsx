import React from "react";
import { useState } from "react";
import axios from "axios";
const AddMeet = ({ onHandleAdd }) => {
  const backend = "http://localhost:5000";
  const [meetName, setMeetName] = useState("");
  const [meetParticipants, setMeetParticipants] = useState([]);
  const [ParticipantToAdd, setParticipantToAdd] = useState("");

  const AddParticipant = async () => {
    try {
      console.log(ParticipantToAdd);
      const checkAccount = await axios.get(
        `${backend}/users/check?email=${ParticipantToAdd}`
      );

      setMeetParticipants([...meetParticipants, ParticipantToAdd]);
      setParticipantToAdd("");
    } catch (error) {
      alert("User does not exist");
    }
  };

  const HandleSubmit = async (e) => {
    e.preventDefault();

    try{
      
        const createMeet = await axios.post(
          `${backend}/conference/create`, 
              {
                name: meetName,
                participants: meetParticipants,
              },
              {
                headers: {
                token: localStorage.getItem("token"),
                }
              }
        );
        alert("Meet Created");
    }catch(error){
        alert("Error in creating meet");
    }
    onHandleAdd();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <button
          className="mb-4 text-blue-500 font-bold hover:underline"
          onClick={onHandleAdd}
        >
          Back
        </button>
        <h2 className="text-center text-2xl font-bold mb-6">Add Meet</h2>
        <form onSubmit={HandleSubmit}>
          <input
            type="text"
            placeholder="Meet Name"
            value={meetName}
            onChange={(e) => setMeetName(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />

          <div>
            <input
              type="email"
              placeholder="participant@email.com"
              value={ParticipantToAdd}
              onChange={(e) => setParticipantToAdd(e.target.value)}
              className="w-full border p-2 mb-4 rounded"
            />
            <button
              type="button"
              onClick={AddParticipant}
              className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600"
            >
              Add
            </button>

            <div className="flex flex-row items-center border p-2 mb-4 rounded overflow-x-auto">
              {meetParticipants.map((participant, index) => (
                <div key={index} className="flex flex-row">
                  <span>{participant}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setMeetParticipants(
                        meetParticipants.filter((_, i) => i !== index)
                      )
                    }
                    className="text-red-500 mx-2 font-bold"
                  >
                    X,
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
          >
            Create Meet
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMeet;
