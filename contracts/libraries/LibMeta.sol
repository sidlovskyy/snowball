// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibMeta {
    function msgSender() internal view returns (address _sender) {
        _sender = msg.sender;
    }
}