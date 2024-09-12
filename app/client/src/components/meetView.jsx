import React from "react";
import PersonBlock from "./personBlock";
import Navbar from "./navbar";
import ControlBar from "./controlBar";

const calculateColumns = (numPersons) => {
	return Math.ceil(Math.sqrt(numPersons)); // Columns based on square root of person count
};

const MeetView = () => {
	const persons = [
		{ name: "Person 1" },
		{ name: "Person 2" },
		{ name: "Person 3" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
		{ name: "Person 4" },
	];

	const numColumns =
		calculateColumns(persons.length) > 4
			? 4
			: calculateColumns(persons.length);

	// Construct a Tailwind class for the grid columns
	const gridColumnsClass = `grid-cols-${numColumns}`;
	// console.log(gridColumnsClass);

	return (
		<div className="">
			<div
				className={`grid ${gridColumnsClass} gap-6 h-full w-full p-4 m-0`}
			>
				{persons.map((person, index) => (
					<div key={index} className="flex flex-col">
						<PersonBlock name={person.name} />
					</div>
				))}
			</div>
			<div className="flex-none mx-2">
				<ControlBar />
			</div>
		</div>
	);
};

export default MeetView;
