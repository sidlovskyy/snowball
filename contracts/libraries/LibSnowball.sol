// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Type imports
import {LibERC721} from "./LibERC721.sol";

// Storage imports
import {GameStorage, LibStorage} from "./LibStorage.sol";

library LibSnowball {
    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    function transfer(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal {
        GameStorage storage s = gs();
        // remove
        uint256 index = s.ownerTokenIdIndexes[_from][_tokenId];
        uint256 lastIndex = s.ownerTokenIds[_from].length - 1;
        if (index != lastIndex) {
            uint32 lastTokenId = s.ownerTokenIds[_from][lastIndex];
            s.ownerTokenIds[_from][index] = lastTokenId;
            s.ownerTokenIdIndexes[_from][lastTokenId] = index;
        }
        s.ownerTokenIds[_from].pop();
        delete s.ownerTokenIdIndexes[_from][_tokenId];
        if (s.approved[_tokenId] != address(0)) {
            delete s.approved[_tokenId];
            emit LibERC721.Approval(_from, address(0), _tokenId);
        }
        // add
        s.snowballs[_tokenId].owner = _to;
        s.ownerTokenIdIndexes[_to][_tokenId] = s.ownerTokenIds[_to].length;
        s.ownerTokenIds[_to].push(uint32(_tokenId));
        emit LibERC721.Transfer(_from, _to, _tokenId);
    }
}