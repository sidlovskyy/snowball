// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Library imports
import {LibMeta} from "../libraries/LibMeta.sol";
import {LibStrings} from "../libraries/LibStrings.sol";
import {LibERC721} from "../libraries/LibERC721.sol";
import {LibSnowball} from "../libraries/LibSnowball.sol";

// Storage imports
import {LibStorage, WithStorage, Modifiers} from "../libraries/LibStorage.sol";

contract SnowballFacet is WithStorage, Modifiers {

    function totalSupply() external view returns (uint256 totalSupply_) {
        totalSupply_ = gs().tokenIds.length;
    }

    function balanceOf(address _owner) external view returns (uint256 balance_) {
        require(_owner != address(0), "SnowballFacet: _owner can't be address(0)");
        balance_ = gs().ownerTokenIds[_owner].length;
    }

    function tokenByIndex(uint256 _index) external view returns (uint256 tokenId_) {
        require(_index < gs().tokenIds.length, "SnowballFacet: index beyond supply");
        tokenId_ = gs().tokenIds[_index];
    }

    function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256 tokenId_) {
        require(_index < gs().ownerTokenIds[_owner].length, "SnowballFacet: index beyond owner balance");
        tokenId_ = gs().ownerTokenIds[_owner][_index];
    }

    function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory tokenIds_) {
        tokenIds_ = gs().ownerTokenIds[_owner];
    }

    /// @notice Find the owner of an NFT
    /// @dev NFTs assigned to zero address are considered invalid, and queries
    ///  about them do throw.
    /// @param _tokenId The identifier for an NFT
    /// @return owner_ The address of the owner of the NFT
    function ownerOf(uint256 _tokenId) external view returns (address owner_) {
        owner_ = gs().snowballs[_tokenId].owner;
        require(owner_ != address(0), "SnowballFacet: invalid _tokenId");
    }

    /// @notice Get the approved address for a single NFT
    /// @dev Throws if `_tokenId` is not a valid NFT.
    /// @param _tokenId The NFT to find the approved address for
    /// @return approved_ The approved address for this NFT, or the zero address if there is none
    function getApproved(uint256 _tokenId) external view returns (address approved_) {
        require(_tokenId < gs().tokenIds.length, "ERC721: tokenId is invalid");
        approved_ = gs().approved[_tokenId];
    }

    /// @notice Query if an address is an authorized operator for another address
    /// @param _owner The address that owns the NFTs
    /// @param _operator The address that acts on behalf of the owner
    /// @return approved_ True if `_operator` is an approved operator for `_owner`, false otherwise
    function isApprovedForAll(address _owner, address _operator) external view returns (bool approved_) {
        approved_ = gs().operators[_owner][_operator];
    }

    /// @notice Transfers the ownership of an NFT from one address to another address
    /// @dev Throws unless `LibMeta.msgSender()` is the current owner, an authorized
    ///  operator, or the approved address for this NFT. Throws if `_from` is
    ///  not the current owner. Throws if `_to` is the zero address. Throws if
    ///  `_tokenId` is not a valid NFT. When transfer is complete, this function
    ///  checks if `_to` is a smart contract (code size > 0). If so, it calls
    ///  `onERC721Received` on `_to` and throws if the return value is not
    ///  `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    /// @param _data Additional data with no specified format, sent in call to `_to`
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes calldata _data
    ) external {
        address sender = LibMeta.msgSender();
        internalTransferFrom(sender, _from, _to, _tokenId);
        LibERC721.checkOnERC721Received(sender, _from, _to, _tokenId, _data);
    }

    /// @notice Transfers the ownership of an NFT from one address to another address
    /// @dev This works identically to the other function with an extra data parameter,
    ///  except this function just sets data to "".
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {
        address sender = LibMeta.msgSender();
        internalTransferFrom(sender, _from, _to, _tokenId);
        LibERC721.checkOnERC721Received(sender, _from, _to, _tokenId, "");
    }

    /// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
    ///  TO CONFIRM THAT `_to` IS CAPABLE OF RECEIVING NFTS OR ELSE
    ///  THEY MAY BE PERMANENTLY LOST
    /// @dev Throws unless `LibMeta.msgSender()` is the current owner, an authorized
    ///  operator, or the approved address for this NFT. Throws if `_from` is
    ///  not the current owner. Throws if `_to` is the zero address. Throws if
    ///  `_tokenId` is not a valid NFT.
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {
        internalTransferFrom(LibMeta.msgSender(), _from, _to, _tokenId);
    }

    // This function is used by transfer functions
    function internalTransferFrom(
        address _sender,
        address _from,
        address _to,
        uint256 _tokenId
    ) internal {
        require(_to != address(0), "SnowballFacet: Can't transfer to 0 address");
        require(_from != address(0), "SnowballFacet: _from can't be 0 address");
        require(_from == gs().snowballs[_tokenId].owner, "SnowballFacet: _from is not owner, transfer failed");
        require(
            _sender == _from || gs().operators[_from][_sender] || _sender == gs().approved[_tokenId],
            "SnowballFacet: Not owner or approved to transfer"
        );
        LibSnowball.transfer(_from, _to, _tokenId);
    }

    /// @notice Change or reaffirm the approved address for an NFT
    /// @dev The zero address indicates there is no approved address.
    ///  Throws unless `LibMeta.msgSender()` is the current NFT owner, or an authorized
    ///  operator of the current owner.
    /// @param _approved The new approved NFT controller
    /// @param _tokenId The NFT to approve
    function approve(address _approved, uint256 _tokenId) external {
        address owner = gs().snowballs[_tokenId].owner;
        require(owner == LibMeta.msgSender() || gs().operators[owner][LibMeta.msgSender()], "ERC721: Not owner or operator of token.");
        gs().approved[_tokenId] = _approved;
        emit LibERC721.Approval(owner, _approved, _tokenId);
    }

    /// @notice Enable or disable approval for a third party ("operator") to manage
    ///  all of `LibMeta.msgSender()`'s assets
    /// @dev Emits the ApprovalForAll event. The contract MUST allow
    ///  multiple operators per owner.
    /// @param _operator Address to add to the set of authorized operators
    /// @param _approved True if the operator is approved, false to revoke approval
    function setApprovalForAll(address _operator, bool _approved) external {
        gs().operators[LibMeta.msgSender()][_operator] = _approved;
        emit LibERC721.ApprovalForAll(LibMeta.msgSender(), _operator, _approved);
    }

    function mint(address _to, uint256 _tokenId) external onlyOwner {
        require(_to != address(0), "SnowballFacet: Can't mint to 0 address");
        LibSnowball.mint(_to, _tokenId);
    }

    function name() external view returns (string memory) {
        return gs().name;
    }

    /// @notice An abbreviated name for NFTs in this contract
    function symbol() external view returns (string memory) {
        return gs().symbol;
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
    /// @dev Throws if `_tokenId` is not a valid NFT. URIs are defined in RFC
    ///  3986. The URI may point to a JSON file that conforms to the "ERC721
    ///  Metadata JSON Schema".
    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        return LibStrings.strWithUint(gs().baseURI, _tokenId);
    }
}