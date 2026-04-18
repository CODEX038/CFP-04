// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

/**
 * @title Campaign
 * @notice Individual crowdfunding campaign with ETH funding, withdrawal, and refund.
 *
 * Rules:
 *  - Anyone can fund() before the deadline (and while not paused)
 *  - Owner can withdraw() once goal is met (before OR after deadline)
 *  - Funders can refund() after deadline IF goal was NOT met
 *  - Factory admin can setPaused() at any time
 */
contract Campaign {

    /* ══════════════════════════════════════════════════════════════════════
       ERRORS
    ══════════════════════════════════════════════════════════════════════ */
    error NotOwner();
    error NotFactory();
    error ZeroAmount();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error GoalNotMet();
    error GoalAlreadyMet();
    error AlreadyClaimed();
    error NothingToRefund();
    error CampaignPaused();
    error TransferFailed();

    /* ══════════════════════════════════════════════════════════════════════
       EVENTS
    ══════════════════════════════════════════════════════════════════════ */
    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event RefundIssued(address indexed donor, uint256 amount);
    event Paused(bool paused);

    /* ══════════════════════════════════════════════════════════════════════
       STATE
    ══════════════════════════════════════════════════════════════════════ */
    address public immutable factory;
    address public immutable owner;

    string  public title;
    string  public description;
    string  public imageHash;
    uint256 public immutable goal;
    uint256 public immutable deadline;

    uint256 public amountRaised;
    bool    public claimed;
    bool    public paused;

    mapping(address => uint256) public contributions;

    /* ══════════════════════════════════════════════════════════════════════
       CONSTRUCTOR
    ══════════════════════════════════════════════════════════════════════ */
    constructor(
        address _owner,
        string  memory _title,
        string  memory _description,
        string  memory _imageHash,
        uint256 _goal,
        uint256 _deadline
    ) {
        factory     = msg.sender;
        owner       = _owner;
        title       = _title;
        description = _description;
        imageHash   = _imageHash;
        goal        = _goal;
        deadline    = _deadline;
    }

    /* ══════════════════════════════════════════════════════════════════════
       MODIFIERS
    ══════════════════════════════════════════════════════════════════════ */
    modifier onlyOwner()   { if (msg.sender != owner)   revert NotOwner();   _; }
    modifier onlyFactory() { if (msg.sender != factory) revert NotFactory(); _; }

    /* ══════════════════════════════════════════════════════════════════════
       FUND
    ══════════════════════════════════════════════════════════════════════ */
    /**
     * @notice Donate ETH to this campaign.
     * Reverts if: paused, deadline passed, or zero value sent.
     */
    function fund() external payable {
        if (paused)                          revert CampaignPaused();
        if (block.timestamp >= deadline)     revert DeadlinePassed();
        if (msg.value == 0)                  revert ZeroAmount();

        contributions[msg.sender] += msg.value;
        amountRaised              += msg.value;

        emit Funded(msg.sender, msg.value);
    }

    /* ══════════════════════════════════════════════════════════════════════
       WITHDRAW  (owner, goal met)
    ══════════════════════════════════════════════════════════════════════ */
    /**
     * @notice Owner withdraws all funds once the goal is met.
     * Can be called before or after the deadline as long as goal >= amountRaised.
     */
    function withdraw() external onlyOwner {
        if (amountRaised < goal) revert GoalNotMet();
        if (claimed)             revert AlreadyClaimed();

        claimed = true;
        uint256 amount = address(this).balance;

        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(owner, amount);
    }

    /* ══════════════════════════════════════════════════════════════════════
       REFUND  (funders, after deadline, goal NOT met)
    ══════════════════════════════════════════════════════════════════════ */
    /**
     * @notice Funder reclaims their exact contribution.
     *
     * Requirements:
     *  1. block.timestamp >= deadline  (deadline has passed)
     *  2. amountRaised < goal          (goal was NOT met)
     *  3. contributions[msg.sender] > 0 (caller actually funded)
     *
     * Effects:
     *  - Sets contributions[msg.sender] = 0 BEFORE transfer (reentrancy safe)
     *  - Sends exact contribution back to caller
     *
     * Emits: RefundIssued
     */
    function refund() external {
        if (block.timestamp < deadline)      revert DeadlineNotPassed();
        if (amountRaised >= goal)            revert GoalAlreadyMet();

        uint256 amount = contributions[msg.sender];
        if (amount == 0)                     revert NothingToRefund();

        /* CEI: zero out BEFORE transfer to prevent reentrancy */
        contributions[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit RefundIssued(msg.sender, amount);
    }

    /* ══════════════════════════════════════════════════════════════════════
       PAUSE  (factory admin only)
    ══════════════════════════════════════════════════════════════════════ */
    function setPaused(bool _paused) external onlyFactory {
        paused = _paused;
        emit Paused(_paused);
    }

    /* ══════════════════════════════════════════════════════════════════════
       VIEW HELPERS
    ══════════════════════════════════════════════════════════════════════ */
    function getContribution(address funder) external view returns (uint256) {
        return contributions[funder];
    }

    function isGoalMet() external view returns (bool) {
        return amountRaised >= goal;
    }

    function isExpired() external view returns (bool) {
        return block.timestamp >= deadline;
    }

    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    function canRefund(address funder) external view returns (bool) {
        return (
            block.timestamp >= deadline &&
            amountRaised < goal &&
            contributions[funder] > 0
        );
    }
}
