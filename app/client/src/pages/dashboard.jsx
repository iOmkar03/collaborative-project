import React from "react";
import Navbar from "../components/navbar";
import Addjoin from "../components/addjoin";

const dashboard = () => {
    return (
        <div className="min-h-[80vh]">
            <Navbar/>
            <Addjoin/>
        </div>
    )
}

export default dashboard
