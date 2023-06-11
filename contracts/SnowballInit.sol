// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "./vendor/libraries/LibDiamond.sol";
import {IDiamondCut} from "./vendor/interfaces/IDiamondCut.sol";
import {IERC165} from "./vendor/interfaces/IERC165.sol";
import {IDiamondLoupe} from "./vendor/interfaces/IDiamondLoupe.sol";
import {IERC173} from "./vendor/interfaces/IERC173.sol";

import {WithStorage, GameStorage} from "./libraries/LibStorage.sol";

import {IERC721} from "@solidstate/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@solidstate/contracts/token/ERC721/metadata/IERC721Metadata.sol";
import {IERC721Enumerable} from "@solidstate/contracts/token/ERC721/enumerable/IERC721Enumerable.sol";

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
        ds.supportedInterfaces[type(IERC721).interfaceId] = true;
        ds.supportedInterfaces[type(IERC721Metadata).interfaceId] = true;
        ds.supportedInterfaces[type(IERC721Enumerable).interfaceId] = true;

        GameStorage storage store = gs();

        store.diamondAddress = address(this);

        store.name = _args.name;
        store.symbol = _args.symbol;
        store.baseURI = _args.baseURI;
    }
}