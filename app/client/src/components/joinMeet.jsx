import React from 'react';


const JoinMeet = ({onHandleJoin}) => {
  return (
     <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <button
          className="mb-4 text-blue-500 font-bold hover:underline"
          onClick={onHandleJoin}
        >
          Back
        </button>
        <h2 className="text-center text-2xl font-bold mb-6">Join Meet</h2>
          </div>
    </div>
  )
}

export default JoinMeet;
