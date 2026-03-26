// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "forge-std/Test.sol";
import "../src/Campaign.sol";
import "../src/CrowdfundFactory.sol";

contract RefundExpiryTest is Test {
    CrowdfundFactory factory;
    Campaign campaign;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant GOAL     = 10 ether;
    uint256 constant DEADLINE = 30 days;   // relative — added to block.timestamp in setUp

    uint256 deadlineTs;

    function setUp() public {
        factory    = new CrowdfundFactory();
        deadlineTs = block.timestamp + DEADLINE;

        vm.prank(owner);
        address addr = factory.createCampaign(
            "Refund Test Campaign",
            "Testing refund and expiry behaviour",
            "QmImageHash",
            GOAL,
            deadlineTs
        );
        campaign = Campaign(addr);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HAPPY PATH — single funder gets full refund after expiry
    // ─────────────────────────────────────────────────────────────────────────

    function test_RefundAfterExpiry_SingleFunder() public {
        // Alice funds 3 ETH (goal not met)
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        assertEq(campaign.amountRaised(),         3 ether, "amount raised before expiry");
        assertEq(campaign.getContribution(alice), 3 ether, "alice contribution before refund");

        // Fast-forward past deadline
        vm.warp(deadlineTs + 1);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        campaign.refund();

        // Alice gets every wei back
        assertEq(alice.balance,                   balBefore + 3 ether, "alice balance after refund");
        assertEq(campaign.getContribution(alice), 0,                   "alice contribution zeroed");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HAPPY PATH — multiple funders all get exact refunds after expiry
    // ─────────────────────────────────────────────────────────────────────────

    function test_RefundAfterExpiry_MultipleFunders() public {
        vm.deal(alice, 3 ether);
        vm.deal(bob,   4 ether);
        vm.deal(carol, 2 ether);

        vm.prank(alice); campaign.fund{value: 3 ether}();
        vm.prank(bob);   campaign.fund{value: 4 ether}();
        vm.prank(carol); campaign.fund{value: 2 ether}();

        // Total = 9 ETH — goal not met
        assertEq(campaign.amountRaised(), 9 ether);

        vm.warp(deadlineTs + 1);

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore   = bob.balance;
        uint256 carolBefore = carol.balance;

        vm.prank(alice); campaign.refund();
        vm.prank(bob);   campaign.refund();
        vm.prank(carol); campaign.refund();

        assertEq(alice.balance, aliceBefore + 3 ether, "alice refund exact");
        assertEq(bob.balance,   bobBefore   + 4 ether, "bob refund exact");
        assertEq(carol.balance, carolBefore + 2 ether, "carol refund exact");

        // Contract balance should be zero
        assertEq(address(campaign).balance, 0, "contract drained");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HAPPY PATH — partial funder (contributed twice) gets total back
    // ─────────────────────────────────────────────────────────────────────────

    function test_RefundAfterExpiry_FunderContributedTwice() public {
        vm.deal(alice, 5 ether);

        vm.prank(alice); campaign.fund{value: 2 ether}();
        vm.prank(alice); campaign.fund{value: 1 ether}();

        assertEq(campaign.getContribution(alice), 3 ether, "cumulative contribution");

        vm.warp(deadlineTs + 1);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        campaign.refund();

        assertEq(alice.balance, balBefore + 3 ether, "full cumulative refund");
        assertEq(campaign.getContribution(alice), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVERTS — cannot refund before deadline (campaign still active)
    // ─────────────────────────────────────────────────────────────────────────

    function test_Refund_RevertsBeforeDeadline() public {
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        // Still before deadline — refund must revert
        vm.prank(alice);
        vm.expectRevert(Campaign.DeadlineNotPassed.selector);
        campaign.refund();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BOUNDARY — refund is allowed at exactly the deadline timestamp
    //  Contract uses: block.timestamp >= deadline  (not strictly >)
    //  So the deadline second itself counts as "passed"
    // ─────────────────────────────────────────────────────────────────────────

    function test_Refund_AllowedAtExactDeadline() public {
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        vm.warp(deadlineTs); // exactly at deadline

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        campaign.refund(); // succeeds — contract treats deadline timestamp as expired

        assertEq(alice.balance,                   balBefore + 3 ether, "refund at exact deadline");
        assertEq(campaign.getContribution(alice), 0,                   "contribution zeroed");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVERTS — cannot refund if goal was met (owner can withdraw instead)
    // ─────────────────────────────────────────────────────────────────────────

    function test_Refund_RevertsIfGoalMet() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        vm.warp(deadlineTs + 1);

        vm.prank(alice);
        vm.expectRevert(Campaign.GoalAlreadyMet.selector);
        campaign.refund();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVERTS — non-funder cannot claim refund
    // ─────────────────────────────────────────────────────────────────────────

    function test_Refund_RevertsNonFunder() public {
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        vm.warp(deadlineTs + 1);

        // Bob never funded — should revert
        vm.prank(bob);
        vm.expectRevert(Campaign.NothingToRefund.selector);
        campaign.refund();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVERTS — double refund attempt
    // ─────────────────────────────────────────────────────────────────────────

    function test_Refund_RevertsDoubleRefund() public {
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        vm.warp(deadlineTs + 1);

        vm.prank(alice);
        campaign.refund(); // first refund — OK

        vm.prank(alice);
        vm.expectRevert(Campaign.NothingToRefund.selector);
        campaign.refund(); // second refund — must revert
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVERTS — cannot fund after deadline
    // ─────────────────────────────────────────────────────────────────────────

    function test_Fund_RevertsAfterDeadline() public {
        vm.warp(deadlineTs + 1);

        vm.deal(alice, 3 ether);
        vm.prank(alice);
        vm.expectRevert(Campaign.DeadlinePassed.selector);
        campaign.fund{value: 1 ether}();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERACTION — owner cannot withdraw after expiry if goal not met
    // ─────────────────────────────────────────────────────────────────────────

    function test_Withdraw_RevertsAfterExpiryGoalNotMet() public {
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        campaign.fund{value: 5 ether}(); // only 5/10 ETH

        vm.warp(deadlineTs + 1);

        vm.prank(owner);
        vm.expectRevert(Campaign.GoalNotMet.selector);
        campaign.withdraw();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERACTION — goal met before expiry: owner withdraws, funders cannot refund
    // ─────────────────────────────────────────────────────────────────────────

    function test_GoalMetBeforeExpiry_FunderCannotRefund() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        // Owner withdraws before deadline
        vm.prank(owner);
        campaign.withdraw();
        assertTrue(campaign.claimed());

        vm.warp(deadlineTs + 1);

        // Alice cannot refund — goal was met
        vm.prank(alice);
        vm.expectRevert(Campaign.GoalAlreadyMet.selector);
        campaign.refund();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUZZ — any amount below goal gets refunded in full after expiry
    // ─────────────────────────────────────────────────────────────────────────

    function testFuzz_RefundExactAmount(uint96 amount) public {
        // Bound: > 0 and strictly below goal so refund is valid
        vm.assume(amount > 0 && amount < GOAL);

        vm.deal(alice, amount);
        vm.prank(alice);
        campaign.fund{value: amount}();

        vm.warp(deadlineTs + 1);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        campaign.refund();

        assertEq(alice.balance,                   balBefore + amount, "full refund");
        assertEq(campaign.getContribution(alice), 0,                  "contribution zeroed");
        assertEq(address(campaign).balance,       0,                  "contract empty");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUZZ — multiple independent funders all get exact amounts back
    // ─────────────────────────────────────────────────────────────────────────

    function testFuzz_RefundMultipleFunders(uint64 a, uint64 b) public {
        // Both > 0, combined < goal so neither hits GoalAlreadyMet
        vm.assume(a > 0 && b > 0);
        vm.assume(uint256(a) + uint256(b) < GOAL);

        vm.deal(alice, a);
        vm.deal(bob,   b);

        vm.prank(alice); campaign.fund{value: a}();
        vm.prank(bob);   campaign.fund{value: b}();

        vm.warp(deadlineTs + 1);

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore   = bob.balance;

        vm.prank(alice); campaign.refund();
        vm.prank(bob);   campaign.refund();

        assertEq(alice.balance, aliceBefore + a, "alice exact refund");
        assertEq(bob.balance,   bobBefore   + b, "bob exact refund");
        assertEq(address(campaign).balance, 0,   "contract fully drained");
    }
}
