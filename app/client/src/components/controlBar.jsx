import React, { useState } from "react";

const ControlBar = () => {
	// State for toggling microphone and camera
	const [isMuted, setIsMuted] = useState(false);
	const [isCameraOn, setIsCameraOn] = useState(true);

	// Handlers for toggling microphone and camera
	const toggleMute = () => setIsMuted(!isMuted);
	const toggleCamera = () => setIsCameraOn(!isCameraOn);

	// Handler for ending the call
	const endCall = () => {
		alert("Call ended!");
	};

	return (
		<div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-2 flex justify-center space-x-4 rounded-full shadow-lg w-3/4">
			{/* Mute/Unmute button */}
			<button
				onClick={toggleMute}
				className={`bg-gray-800 hover:bg-gray-700 p-3 rounded-full ${
					isMuted ? "text-red-500" : "text-green-500"
				}`}
			>
				{isMuted ? "🔇" : "🎤"}
			</button>

			{/* Camera on/off button */}
			<button
				onClick={toggleCamera}
				className={`bg-gray-800 hover:bg-gray-700 p-3 rounded-full ${
					isCameraOn ? "text-green-500" : "text-red-500"
				}`}
			>
				{isCameraOn ? "📷" : "📴"}
			</button>

			{/* Screen sharing */}
			<button className="bg-gray-800 hover:bg-gray-700 p-3 rounded-full">
				🖥️
			</button>

			{/* Chat button */}
			<button className="bg-gray-800 hover:bg-gray-700 p-3 rounded-full">
				💬
			</button>

			{/* End Call button */}
			<button
				onClick={endCall}
				className="bg-red-600 hover:bg-red-500 p-3 rounded-full"
			>
				❌ End Call
			</button>
		</div>
	);
};

export default ControlBar;
