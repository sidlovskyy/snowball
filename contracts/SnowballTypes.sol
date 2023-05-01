// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct Snowball {
    uint256 id;
    address owner;
    uint256 gen;
    bytes svg;
}

struct SvgLayer {
    address svgLayersContract;
    uint16 offset;
    uint16 size;
}

struct Dimensions {
    uint8 x;
    uint8 y;
    uint8 width;
    uint8 height;
}