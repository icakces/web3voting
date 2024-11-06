// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    address public owner;
    mapping(string => uint256) public votes;
    mapping(address => bool) public hasVoted;

    string[] public candidates;
    event VoteCast(address indexed voter, string candidate);
    event NewCandidate(string candidate);

    constructor(string[] memory _candidates) {
        owner = msg.sender;
        for (uint i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
            emit NewCandidate(_candidates[i]);
        }
    }

    function vote(string memory candidate) public {
        require(!hasVoted[msg.sender], "You have already voted");
        bool validCandidate = false;
        for (uint i = 0; i < candidates.length; i++) {
            if (keccak256(abi.encodePacked(candidates[i])) == keccak256(abi.encodePacked(candidate))) {
                validCandidate = true;
                break;
            }
        }
        require(validCandidate, "Invalid candidate");
        votes[candidate]++;
        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender, candidate);
    }

    function getVotes(string memory candidate) public view returns (uint256) {
        return votes[candidate];
    }

    function getCandidates() public view returns (string[] memory) {
        return candidates;
    }

    function hasUserVoted(address user) public view returns (bool) {
        return hasVoted[user];
    }
}
