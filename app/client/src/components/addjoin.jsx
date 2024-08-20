import React, { useState } from 'react';
import AddMeet from './addMeet';
import JoinMeet from './joinMeet';

const Addjoin=()=>{
    const [addClicked, setAddClicked] = useState(false);
    const [joinClicked, setJoinClicked] = useState(false);

    const HandleAdd = () => {
      setAddClicked(!addClicked);
    };
    const HandleJoin = () => {
      setJoinClicked(!joinClicked);
    };
  
    return (
    <>
     <div className="flex min-h-[70vh] justify-center items-center" >
      <div className="flex space-x-4">
        <button className="bg-blue-500 rounded  m-8 p-5  text-white font-bold w-20 h-20 flex justify-center items-center" onClick={HandleAdd}>
          Add Meet
        </button>
        <button className="bg-green-500 rounded m-8 p-5 text-white font-bold w-20 h-20 flex justify-center items-center" onClick={HandleJoin}>
          Join Meet
        </button>
      </div>
    </div>
      {addClicked && <AddMeet onHandleAdd={HandleAdd}/>}
      {joinClicked && <JoinMeet  onHandleJoin={HandleJoin}/>}
    </>
    )
}

export default Addjoin;
