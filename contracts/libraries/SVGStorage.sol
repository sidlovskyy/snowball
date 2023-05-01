// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibStrings} from "./LibStrings.sol";

library SVGStorage {
    struct SVG {
        bytes data;
        uint16 width;
        uint16 height;
    }

    function storeSVG(SVG storage svg, uint16 width, uint16 height, bytes memory data) internal {
        svg.width = width;
        svg.height = height;
        svg.data = data;
    }

    function getSVG(SVG storage svg) internal view returns (string memory svg_) {
        svg_ = string(
            abi.encodePacked(
                // width
                LibStrings.strWithUint('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ', svg.width),
                // height
                LibStrings.strWithUint(" ", svg.height),
                '">',
                svg.data,
                "</svg>"
            )
        );
    }
}