// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "./vendor/libraries/LibDiamond.sol";
import {IDiamondCut} from "./vendor/interfaces/IDiamondCut.sol";
import {IERC165} from "./vendor/interfaces/IERC165.sol";
import {IDiamondLoupe} from "./vendor/interfaces/IDiamondLoupe.sol";
import {IERC173} from "./vendor/interfaces/IERC173.sol";

import {WithStorage} from "./libraries/LibStorage.sol";

contract SnowballInit is WithStorage {
    struct Args {
        string name;
        string symbol;
    }

    function init(Args memory _args) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // adding ERC165 data
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        gs().diamondAddress = address(this);

        gs().name = _args.name;
        gs().symbol = _args.symbol;
    }
}