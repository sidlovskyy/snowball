// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SvgLayer} from "../libraries/LibStorage.sol";
import {Modifiers, WithStorage} from "../libraries/LibStorage.sol";
import {LibSvg} from "../libraries/LibSvg.sol";
import {LibStrings} from "../libraries/LibStrings.sol";
import {Dimensions} from "../SnowballTypes.sol";

contract SvgFacet is WithStorage, Modifiers {
    /***********************************|
   |             Read Functions         |
   |__________________________________*/

    function getSvg(bytes32 _svgType, uint256 _itemId) external view returns (string memory svg_) {
        svg_ = string(LibSvg.getSvg(_svgType, _itemId));
    }

    function getSvgs(bytes32 _svgType, uint256[] calldata _itemIds) external view returns (string[] memory svgs_) {
        uint256 length = _itemIds.length;
        svgs_ = new string[](length);
        for (uint256 i; i < length; i++) {
            svgs_[i] = string(LibSvg.getSvg(_svgType, _itemIds[i]));
        }
    }

    function getItemSvg(uint256 _itemId) external view returns (string memory ag_) {
        require(_itemId < gs().itemTypes.length, "ItemsFacet: _id not found for item");
        bytes memory svg;
        svg = LibSvg.getSvg("wearables", _itemId);
        Dimensions storage dimensions = gs().itemTypes[_itemId].dimensions;
        ag_ = string(
            abi.encodePacked(
            // width
                LibStrings.strWithUint('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ', dimensions.width),
            // height
                LibStrings.strWithUint(" ", dimensions.height),
                '">',
                svg,
                "</svg>"
            )
        );
    }

    /***********************************|
   |             Write Functions        |
   |__________________________________*/

    function storeSvg(string calldata _svg, LibSvg.SvgTypeAndSizes[] calldata _typesAndSizes) external onlyOwner {
        LibSvg.storeSvg(_svg, _typesAndSizes);
    }

    function updateSvg(string calldata _svg, LibSvg.SvgTypeAndIdsAndSizes[] calldata _typesAndIdsAndSizes) external onlyOwner {
        LibSvg.updateSvg(_svg, _typesAndIdsAndSizes);
    }

    function deleteLastSvgLayers(bytes32 _svgType, uint256 _numLayers) external onlyOwner {
        for(uint256 i; i < _numLayers; i++){
            gs().svgLayers[_svgType].pop();
        }
    }

    function setItemsDimensions(uint256[] calldata _itemIds, Dimensions[] calldata _dimensions) external onlyOwner {
        require(_itemIds.length == _dimensions.length, "SvgFacet: _itemIds not same length as _dimensions");
        for (uint256 i; i < _itemIds.length; i++) {
            gs().itemTypes[_itemIds[i]].dimensions = _dimensions[i];
        }
    }
}