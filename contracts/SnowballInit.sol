// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "./vendor/libraries/LibDiamond.sol";
import {IDiamondCut} from "./vendor/interfaces/IDiamondCut.sol";
import {IERC165} from "./vendor/interfaces/IERC165.sol";
import {IDiamondLoupe} from "./vendor/interfaces/IDiamondLoupe.sol";
import {IERC173} from "./vendor/interfaces/IERC173.sol";

import {WithStorage, GameStorage} from "./libraries/LibStorage.sol";

contract SnowballInit is WithStorage {
    struct Args {
        string name;
        string symbol;
        string baseURI;
    }

    function init(Args memory _args) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // adding ERC165 data
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // TODO: Add more support interfaces

        GameStorage storage store = gs();

        store.diamondAddress = address(this);

        store.name = _args.name;
        store.symbol = _args.symbol;
        store.baseURI = _args.baseURI;
    }
}