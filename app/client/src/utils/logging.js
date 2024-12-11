import { ethers } from "ethers";
import axiox from "axios";

const PRIVATE_KEY = import.meta.env.VITE_WALLET_PRIVATE_KEY; // Replace with your private key
//console.log(PRIVATE_KEY);
const CONTRACT_ADDRESS = "0x4aa9eE201166775A82F2D89F24a3858D9a6E2914";
const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "meetingId", type: "string" },
      { internalType: "string", name: "action", type: "string" },
    ],
    name: "logAction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const provider = new ethers.JsonRpcProvider(
  `https://polygon-amoy.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`,
);
//console.log(`https://polygon-amoy.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

async function logActionFrontend(meetingId, action, backend) {
  try {
    //add "by+user" to actons
    const actionforbc = action + " by " + localStorage.getItem("email");
    const tx = await contract.logAction(meetingId, actionforbc);
    await tx.wait();
    console.log("Action logged successfully:", tx.hash);
    //link to see
    console.log(`https://amoy.polygonscan.com/tx/${tx.hash}`);
    //storing to to db
    const log = await axiox.post(
      `${backend}/conference/log`,
      {
        meetingId: meetingId,
        action: action,
        by: localStorage.getItem("email"),
        link: `https://polygonscan.com/tx/${tx.hash}`,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          token: localStorage.getItem("token"),
        },
      },
    );
    return tx.hash;
  } catch (error) {
    console.error("Error logging action:", error);
    throw error;
  }
}

export { logActionFrontend };
