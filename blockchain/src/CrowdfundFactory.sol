// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "./Campaign.sol";

/**
 * @title CrowdfundFactory
 * @notice Deploys and tracks Campaign contracts.
 * The deployer becomes the admin who can pause any campaign.
 */
contract CrowdfundFactory {

    /* ══════════════════════════════════════════════════════════════════════
       ERRORS & EVENTS
    ══════════════════════════════════════════════════════════════════════ */
    error NotAdmin();
    error InvalidIndex();
    error InvalidDeadline();
    error InvalidGoal();

    event CampaignCreated(
        uint256 indexed index,
        address indexed campaignAddress,
        address indexed owner,
        string  title,
        uint256 goal,
        uint256 deadline
    );

    /* ══════════════════════════════════════════════════════════════════════
       STATE
    ══════════════════════════════════════════════════════════════════════ */
    address public immutable admin;

    struct CampaignMeta {
        address campaignAddress;
        address owner;
        string  title;
        string  description;
        string  imageHash;
        uint256 goal;
        uint256 deadline;
        uint256 index;
    }

    CampaignMeta[] private _campaigns;

    /* ══════════════════════════════════════════════════════════════════════
       CONSTRUCTOR
    ══════════════════════════════════════════════════════════════════════ */
    constructor() {
        admin = msg.sender;
    }

    /* ══════════════════════════════════════════════════════════════════════
       CREATE
    ══════════════════════════════════════════════════════════════════════ */
    function createCampaign(
        string  memory _title,
        string  memory _description,
        string  memory _imageHash,
        uint256 _goal,
        uint256 _deadline
    ) external returns (address) {
        if (_goal == 0)                        revert InvalidGoal();
        if (_deadline <= block.timestamp)      revert InvalidDeadline();

        Campaign c = new Campaign(
            msg.sender,
            _title,
            _description,
            _imageHash,
            _goal,
            _deadline
        );

        uint256 idx = _campaigns.length;
        _campaigns.push(CampaignMeta({
            campaignAddress: address(c),
            owner:           msg.sender,
            title:           _title,
            description:     _description,
            imageHash:       _imageHash,
            goal:            _goal,
            deadline:        _deadline,
            index:           idx,
        }));

        emit CampaignCreated(idx, address(c), msg.sender, _title, _goal, _deadline);
        return address(c);
    }

    /* ══════════════════════════════════════════════════════════════════════
       ADMIN
    ══════════════════════════════════════════════════════════════════════ */
    function adminPauseCampaign(uint256 index, bool _paused) external {
        if (msg.sender != admin) revert NotAdmin();
        if (index >= _campaigns.length) revert InvalidIndex();
        Campaign(_campaigns[index].campaignAddress).setPaused(_paused);
    }

    /* ══════════════════════════════════════════════════════════════════════
       VIEWS
    ══════════════════════════════════════════════════════════════════════ */
    function campaignCount() external view returns (uint256) {
        return _campaigns.length;
    }

    function getCampaign(uint256 index) external view returns (CampaignMeta memory) {
        if (index >= _campaigns.length) revert InvalidIndex();
        return _campaigns[index];
    }

    function getCampaigns() external view returns (CampaignMeta[] memory) {
        return _campaigns;
    }
}
