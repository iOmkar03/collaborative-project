import React from "react";
import Navbar from "../components/navbar";
import Addjoin from "../components/addjoin";

const dashboard = ({baseip}) => {
    return (
        <div className="min-h-[80vh] ">
            <Navbar/>
            <Addjoin baseip={baseip}/>
        </div>
    )
}

export default dashboard
