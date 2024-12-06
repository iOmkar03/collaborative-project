import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const Signup = ({baseip}) => {
 //const backend ="https://192.168.132.109:5000";
  //const backend = "https://192.168.33.109:5000";
  const backend = baseip+":5000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Logic for signupg in
  const handleOnSubmit = async (e) => {
    e.preventDefault();
    const body = {
      email: email,
      password: password,
    };
    console.log(JSON.stringify(body));

    try {
      const signupres = await axios(`${backend}/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(body),
      });
      console.log(signupres); // Log the response data
      alert(signupres.data.message);
      navigate("/signin");

      // Handle the response data as needed
    } catch (error) {
      console.error("Error:", error);
      alert(error.response.data.error);
      // Handle errors, such as network issues or server errors
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to BlockMeet</h1>
      <h2 className="text-2xl font-semibold mb-6">Sign up</h2>

      <form onSubmit={handleOnSubmit} className="w-80">
        <input
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-4 py-2 mb-4 focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-4 py-2 mb-6 focus:outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white rounded-md py-2 font-semibold transition duration-300 ease-in-out hover:bg-blue-600"
        >
          Sign up
        </button>
      </form>
      <p className="mt-4">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/signin")}
          className="text-blue-500 cursor-pointer"
        >
          Signin
        </span>
      </p>
    </div>
  );
};

export default Signup;
