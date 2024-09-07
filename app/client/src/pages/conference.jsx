import react from 'react';
import {useParams} from 'react-router-dom';
import {useNavigate} from 'react-router-dom';
import {useEffect} from 'react';
import axios from 'axios';

const Conference = () => {
  const navigate=useNavigate();
  const backend="http://localhost:5000";
  const conferenceId=useParams().id;
  useEffect(() => {
    securitycheck();
  }, []);

  const securitycheck=async()=>{
      try {
        const check=await axios.get(`${backend}/conference/access`,{
          headers:{
            "token":localStorage.getItem("token"),
            "conferenceId":conferenceId
          }
        });
      } catch (error) {
        alert("You are not authorized to view this conference"); 
        navigate("/");
      }
  }
  return (
    <div>
      <h1>Conference  {conferenceId}</h1>
    </div>
  );
}

export default Conference;
