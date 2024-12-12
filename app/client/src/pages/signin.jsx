import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Signin = ({ baseip }) => {
  //const backend = baseip + ":5000";
  const backend=import.meta.env.VITE_BACKEND;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); 
  const navigate = useNavigate();


  const handleOnSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    const body = {
      email,
      password,
    };

    try {
      const signinres = await axios(`${backend}/users/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(body),
      });

      // Store the token in local storage
      localStorage.setItem("token", signinres.data.token);
      localStorage.setItem("email", email);
      navigate("/");
      // Redirect to the dashboard page
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false); // Stop loader
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to BlockMeet</h1>
      <h2 className="text-2xl font-semibold mb-6">Sign in</h2>

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
          disabled={loading} // Disable button while loading
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {loading && (
        <div className="mt-4 text-blue-500">Signing in, please wait...</div>
      )}

      <p className="mt-4">
        Don't have an account?{" "}
        <span
          onClick={() => navigate("/signup")}
          className="text-blue-500 cursor-pointer"
        >
          Signup
        </span>
      </p>
    </div>
  );
};

export default Signin;
