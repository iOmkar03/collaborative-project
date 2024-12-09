const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const MeetingLog = await hre.ethers.getContractFactory("MeetingLog");

  // Deploy the contract
  const meetingLog = await MeetingLog.deploy();

  // Wait for deployment to complete
  await meetingLog.waitForDeployment();

  // Get the deployed contract address
  const address = meetingLog.target;
  console.log("MeetingLog deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
