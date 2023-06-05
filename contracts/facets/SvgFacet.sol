// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SvgStorage} from "../libraries/SvgStorage.sol";
import {SvgLayer} from "../libraries/LibStorage.sol";
import {Modifiers, WithStorage} from "../libraries/LibStorage.sol";
import {LibSvg} from "../libraries/LibSvg.sol";
import {LibStrings} from "../libraries/LibStrings.sol";
import {Dimensions} from "../SnowballTypes.sol";

contract SvgFacet is WithStorage, Modifiers {
    /***********************************|
   |             Read Functions         |
   |__________________________________*/

    function svgExists(uint256 _tokenId) external view returns (bool exists_) {
        exists_ = LibSvg.svgExists(_tokenId);
    }

    function getSvg(uint256 _tokenId) external view returns (string memory svg_) {
        svg_ = string(LibSvg.getSvg(_tokenId));
    }

    function getSvgs(uint256[] calldata _tokenIds) external view returns (string[] memory svgs_) {
        uint256 length = _tokenIds.length;
        svgs_ = new string[](length);
        for (uint256 i; i < length; i++) {
            svgs_[i] = string(LibSvg.getSvg(_tokenIds[i]));
        }
    }

    /***********************************|
   |             Write Functions        |
   |__________________________________*/

    function storeSvgs(uint256[] calldata _tokenIds, SvgStorage.Svg[] calldata _svgs) external onlyOwner {
        require(_tokenIds.length == _svgs.length, "SvgFacet: _tokenIds length not the same as _svgs length");

        uint256 length = _tokenIds.length;
        for (uint256 i; i < length; i++) {
            LibSvg.storeSvg(_tokenIds[i], _svgs[i]);
        }
    }

    function deleteSvgs(uint256[] calldata _tokenIds) external onlyOwner {
        uint256 length = _tokenIds.length;
        for (uint256 i; i < length; i++) {
            LibSvg.deleteSvg(_tokenIds[i]);
        }
    }
}