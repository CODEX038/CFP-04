// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

contract Campaign {
    address public immutable owner;
    address public immutable factory;
    string  public title;
    string  public description;
    string  public imageHash;
    uint256 public immutable goal;
    uint256 public immutable deadline;
    uint256 public amountRaised;
    bool    public claimed;
    bool    public paused;

    mapping(address => uint256) public contributions;

    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event Refunded(address indexed funder, uint256 amount);
    event Paused(bool paused);

    error NotOwner();
    error CampaignPaused();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error GoalNotMet();
    error GoalAlreadyMet();
    error AlreadyClaimed();
    error NothingToRefund();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier notPaused() {
        if (paused) revert CampaignPaused();
        _;
    }
    modifier beforeDeadline() {
        if (block.timestamp >= deadline) revert DeadlinePassed();
        _;
    }
    modifier afterDeadline() {
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        _;
    }

    constructor(
        address _owner,
        string  memory _title,
        string  memory _description,
        string  memory _imageHash,
        uint256 _goal,
        uint256 _deadline
    ) {
        require(_goal > 0,                   "Goal must be > 0");
        require(_deadline > block.timestamp, "Deadline must be future");
        require(bytes(_title).length > 0,    "Title required");
        owner       = _owner;
        factory     = msg.sender;
        title       = _title;
        description = _description;
        imageHash   = _imageHash;
        goal        = _goal;
        deadline    = _deadline;
    }

    // ─── Fund ────────────────────────────────────────────────
    function fund() external payable notPaused beforeDeadline {
        if (msg.value == 0) revert ZeroAmount();
        contributions[msg.sender] += msg.value;
        amountRaised += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    // ─── Withdraw — as soon as goal is met, no deadline required
    function withdraw() external onlyOwner {
        if (amountRaised < goal)  revert GoalNotMet();
        if (claimed)              revert AlreadyClaimed();
        claimed = true;
        uint256 amount = amountRaised;
        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    // ─── Refund — only after deadline if goal not met
    function refund() external afterDeadline {
        if (amountRaised >= goal)         revert GoalAlreadyMet();
        uint256 contributed = contributions[msg.sender];
        if (contributed == 0)            revert NothingToRefund();
        contributions[msg.sender] = 0;
        amountRaised -= contributed;
        (bool ok, ) = msg.sender.call{value: contributed}("");
        if (!ok) revert TransferFailed();
        emit Refunded(msg.sender, contributed);
    }

    // ─── Pause
    function setPaused(bool _paused) external {
        if (msg.sender != owner && msg.sender != factory) revert NotOwner();
        paused = _paused;
        emit Paused(_paused);
    }

    // ─── View helpers
    function getContribution(address funder) external view returns (uint256) {
        return contributions[funder];
    }

    function isGoalMet() external view returns (bool) {
        return amountRaised >= goal;
    }

    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
}