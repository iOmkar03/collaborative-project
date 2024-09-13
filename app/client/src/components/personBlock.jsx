import React from "react";

const PersonBlock = ({ name }) => {
	return (
		<div className="bg-red-600 rounded-lg shadow-lg overflow-hidden relative h-48 w-full m-1">
			<div className="w-full h-full bg-gray-300 flex items-center justify-center">
				{/* <p className="text-gray-500 text-xl">Video Placeholder</p> */}
				<video
					src="..\public\tester_video_1.mp4"
					className="w-full h-full object-cover"
					autoPlay
					loop
					muted
					playsInline
				/>
			</div>

			<div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white p-2 flex items-center justify-between">
				<span className="text-sm">Person Name: {name}</span>
				<div className="flex space-x-2">
					<button className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center">
						🔴
					</button>
					<button className="bg-green-500 w-8 h-8 rounded-full flex items-center justify-center">
						🔊
					</button>
				</div>
			</div>
		</div>
	);
};

export default PersonBlock;
