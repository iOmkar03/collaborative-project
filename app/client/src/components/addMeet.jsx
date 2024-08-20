import React from 'react';

const AddMeet = ({ onHandleAdd }) => {
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
        <form>
          {/* Your form fields go here */}
                    <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMeet;

