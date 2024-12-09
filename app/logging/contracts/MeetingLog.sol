
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MeetingLog {
    event ActionLogged(
        string meetingId,
        address indexed user,
        string action,
        uint256 timestamp
    );

    function logAction(string memory meetingId, string memory action) public {
        emit ActionLogged(meetingId, msg.sender, action, block.timestamp);
    }
}

