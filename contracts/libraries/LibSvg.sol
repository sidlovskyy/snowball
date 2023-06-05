// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SvgStorage} from "./SvgStorage.sol";
import {SvgLayer} from "../SnowballTypes.sol";

import {LibStorage, GameStorage} from "./LibStorage.sol";

library LibSvg {
    using SvgStorage for SvgStorage.Svg;

    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    event StoreSvg(uint256 tokenId);
    event DeleteSvg(uint256 tokenId);

    struct SvgTypeAndSizes {
        bytes32 svgType;
        uint256[] sizes;
    }

    struct SvgTypeAndIdsAndSizes {
        bytes32 svgType;
        uint256[] ids;
        uint256[] sizes;
    }

    function svgExists(uint256 _tokenId) internal view returns (bool exists_) {
        SvgStorage.Svg storage svg = gs().svgs[_tokenId];
        exists_ = svg.data.length > 0;
    }

    function getSvg(uint256 _tokenId) internal view returns (string memory svg_) {
        SvgStorage.Svg storage svg = gs().svgs[_tokenId];
        svg_ = svg.getSvg();
    }

    function storeSvg(uint256 _tokenId, SvgStorage.Svg calldata _svg) internal {
        gs().svgs[_tokenId].storeSvg(_svg.width, _svg.height, _svg.data);
        emit StoreSvg(_tokenId);
    }

    function deleteSvg(uint256 _tokenId) internal {
        delete gs().svgs[_tokenId];
        emit DeleteSvg(_tokenId);
    }
}