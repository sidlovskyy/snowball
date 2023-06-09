// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Dimensions} from "../SnowballTypes.sol";

// Type import
import {LibSvgStorage} from "../libraries/LibSvgStorage.sol";

// Library imports
import {LibSvg} from "../libraries/LibSvg.sol";

// Storage imports
import {Modifiers, WithStorage, SvgLayer} from "../libraries/LibStorage.sol";

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

    function storeSvg(uint256 _tokenId, LibSvgStorage.Svg calldata _svg) external onlyOwner {
        LibSvg.storeSvg(_tokenId, _svg);
    }

    function storeSvgs(uint256[] calldata _tokenIds, LibSvgStorage.Svg[] calldata _svgs) external onlyOwner {
        require(_tokenIds.length == _svgs.length, "SvgFacet: _tokenIds length not the same as _svgs length");

        uint256 length = _tokenIds.length;
        for (uint256 i; i < length; i++) {
            LibSvg.storeSvg(_tokenIds[i], _svgs[i]);
        }
    }

    function deleteSvg(uint256 _tokenId) external onlyOwner {
        LibSvg.deleteSvg(_tokenId);
    }

    function deleteSvgs(uint256[] calldata _tokenIds) external onlyOwner {
        uint256 length = _tokenIds.length;
        for (uint256 i; i < length; i++) {
            LibSvg.deleteSvg(_tokenIds[i]);
        }
    }
}