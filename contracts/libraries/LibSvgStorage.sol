// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Library imports
import {LibStrings} from "./LibStrings.sol";

library LibSvgStorage {
    struct Svg {
        bytes data;
        uint16 width;
        uint16 height;
    }

    function storeSvg(Svg storage _svg, uint16 _width, uint16 _height, bytes memory _data) internal {
        _svg.width = _width;
        _svg.height = _height;
        _svg.data = _data;
    }

    function getSvg(Svg storage _svg) internal view returns (string memory svg_) {
        svg_ = string(
            abi.encodePacked(
                // width
                LibStrings.strWithUint('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ', _svg.width),
                // height
                LibStrings.strWithUint(" ", _svg.height),
                '">',
                _svg.data,
                "</svg>"
            )
        );
    }
}