import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Dashboard from "./pages/dashboard";
import Conference from "./pages/conference11";
import IpfsFiles from "./pages/ipfsFiles";
import Logs from "./pages/logs";
const App = () => {
  const baseip = "https://192.168.140.109";
  return (
    <>
      <Router>
        <Routes>
          //pass ip as props to all the components
          <Route path="/signin" element={<Signin baseip={baseip} />} />
          <Route path="/signup" element={<Signup baseip={baseip} />} />
          <Route path="/" element={<Dashboard baseip={baseip} />} />
          <Route
            path="/conference/:conferenceId"
            element={<Conference baseip={baseip} />}
          />
          <Route
            path="/files/:conferenceId"
            element={<IpfsFiles baseip={baseip} />}
          />
          <Route path="logs/:conferenceId" element={<Logs baseip={baseip} />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
