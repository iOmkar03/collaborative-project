
import { ethers } from "ethers";

const PRIVATE_KEY = import.meta.env.VITE_WALLET_PRIVATE_KEY; // Replace with your private key
//console.log(PRIVATE_KEY);
const CONTRACT_ADDRESS = "0x4aa9eE201166775A82F2D89F24a3858D9a6E2914";
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "meetingId", "type": "string" },
      { "internalType": "string", "name": "action", "type": "string" }
    ],
    "name": "logAction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const provider = new ethers.JsonRpcProvider(`https://polygon-amoy.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`);
//console.log(`https://polygon-amoy.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

async function logActionFrontend(meetingId, action) {
  try {
    const tx = await contract.logAction(meetingId, action);
    await tx.wait();
    console.log("Action logged successfully:", tx.hash);
    return tx.hash;
  } catch (error) {
    console.error("Error logging action:", error);
    throw error;
  }
}

export { logActionFrontend };
