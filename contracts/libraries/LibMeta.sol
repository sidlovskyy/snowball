// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibMeta {
    function msgSender() public view returns (address sender_) {
        sender_ = msg.sender;
    }
}