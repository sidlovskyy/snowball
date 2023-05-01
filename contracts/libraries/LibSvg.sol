// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SVGStorage} from "./SVGStorage.sol";
import {SvgLayer} from "../SnowballTypes.sol";

import {LibStorage, GameStorage} from "./LibStorage.sol";

library LibSvg {
    using SVGStorage for SVGStorage.SVG;

    function gs() internal pure returns (GameStorage storage) {
        return LibStorage.gameStorage();
    }

    event StoreSvg(uint256 _tokenId);
    event DeleteSvg(uint256 _tokenId);

    struct SvgTypeAndSizes {
        bytes32 svgType;
        uint256[] sizes;
    }

    struct SvgTypeAndIdsAndSizes {
        bytes32 svgType;
        uint256[] ids;
        uint256[] sizes;
    }

    function getSvg(uint256 _tokenId) internal view returns (string memory svg_) {
        SVGStorage.SVG storage svg = gs().svgs[_tokenId];
        svg_ = svg.getSVG();
    }

    function storeSvg(uint256 _tokenId, SVGStorage.SVG calldata _svg) internal {
        gs().svgs[_tokenId].storeSVG(_svg.width, _svg.height, _svg.data);
        emit StoreSvg(_tokenId);
    }

    function deleteSvg(uint256 _tokenId) internal {
        delete gs().svgs[_tokenId];
        emit DeleteSvg(_tokenId);
    }
}