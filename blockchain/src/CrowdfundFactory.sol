// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "./Campaign.sol";

contract CrowdfundFactory {
    address public immutable admin;
    Campaign[] public campaigns;

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

    event CampaignCreated(
        uint256 indexed index,
        address indexed campaignAddress,
        address indexed owner,
        string title,
        uint256 goal,
        uint256 deadline
    );

    error NotAdmin();
    error InvalidIndex();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createCampaign(
        string  memory _title,
        string  memory _description,
        string  memory _imageHash,
        uint256 _goal,
        uint256 _deadline
    ) external returns (address) {
        Campaign campaign = new Campaign(
            msg.sender,
            _title,
            _description,
            _imageHash,
            _goal,
            _deadline
        );
        campaigns.push(campaign);
        uint256 index = campaigns.length - 1;
        emit CampaignCreated(index, address(campaign), msg.sender, _title, _goal, _deadline);
        return address(campaign);
    }

    function getCampaigns() external view returns (CampaignMeta[] memory) {
        CampaignMeta[] memory meta = new CampaignMeta[](campaigns.length);
        for (uint256 i = 0; i < campaigns.length; i++) {
            Campaign c = campaigns[i];
            meta[i] = CampaignMeta({
                campaignAddress: address(c),
                owner:           c.owner(),
                title:           c.title(),
                description:     c.description(),
                imageHash:       c.imageHash(),
                goal:            c.goal(),
                deadline:        c.deadline(),
                index:           i
            });
        }
        return meta;
    }

    function getCampaign(uint256 index) external view returns (CampaignMeta memory) {
        if (index >= campaigns.length) revert InvalidIndex();
        Campaign c = campaigns[index];
        return CampaignMeta({
            campaignAddress: address(c),
            owner:           c.owner(),
            title:           c.title(),
            description:     c.description(),
            imageHash:       c.imageHash(),
            goal:            c.goal(),
            deadline:        c.deadline(),
            index:           index
        });
    }

    function adminPauseCampaign(uint256 index, bool _paused) external onlyAdmin {
        if (index >= campaigns.length) revert InvalidIndex();
        campaigns[index].setPaused(_paused);
    }

    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}
