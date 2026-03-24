// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "forge-std/Test.sol";
import "../src/Campaign.sol";
import "../src/CrowdfundFactory.sol";

contract CampaignTest is Test {
    CrowdfundFactory factory;
    Campaign campaign;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    uint256 GOAL     = 10 ether;
    uint256 DEADLINE = block.timestamp + 30 days;

    function setUp() public {
        factory = new CrowdfundFactory();
        vm.prank(owner);
        address addr = factory.createCampaign(
            "Test Campaign",
            "A test campaign description",
            "QmImageHash",
            GOAL,
            DEADLINE
        );
        campaign = Campaign(addr);
    }

    function test_FundSucceeds() public {
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        campaign.fund{value: 2 ether}();
        assertEq(campaign.amountRaised(), 2 ether);
        assertEq(campaign.getContribution(alice), 2 ether);
    }

    function test_FundRevertsAfterDeadline() public {
        vm.deal(alice, 5 ether);
        vm.warp(DEADLINE + 1);
        vm.prank(alice);
        vm.expectRevert(Campaign.DeadlinePassed.selector);
        campaign.fund{value: 1 ether}();
    }

    function test_FundRevertsWhenPaused() public {
        vm.prank(owner);
        campaign.setPaused(true);
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        vm.expectRevert(Campaign.CampaignPaused.selector);
        campaign.fund{value: 1 ether}();
    }

    function test_FundRevertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Campaign.ZeroAmount.selector);
        campaign.fund{value: 0}();
    }

    // ─── Withdraw — now works as soon as goal is met ─────────
    function test_WithdrawSucceedsBeforeDeadline() public {
        vm.deal(alice, 15 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        uint256 balBefore = owner.balance;
        vm.prank(owner);
        campaign.withdraw();

        assertEq(owner.balance, balBefore + 10 ether);
        assertTrue(campaign.claimed());
    }

    function test_WithdrawSucceedsAfterDeadline() public {
        vm.deal(alice, 15 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        vm.warp(DEADLINE + 1);
        uint256 balBefore = owner.balance;
        vm.prank(owner);
        campaign.withdraw();

        assertEq(owner.balance, balBefore + 10 ether);
        assertTrue(campaign.claimed());
    }

    function test_WithdrawRevertsIfGoalNotMet() public {
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        campaign.fund{value: 5 ether}();

        vm.prank(owner);
        vm.expectRevert(Campaign.GoalNotMet.selector);
        campaign.withdraw();
    }

    function test_WithdrawRevertsDoubleWithdraw() public {
        vm.deal(alice, 15 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        vm.prank(owner);
        campaign.withdraw();

        vm.prank(owner);
        vm.expectRevert(Campaign.AlreadyClaimed.selector);
        campaign.withdraw();
    }

    function test_WithdrawRevertsIfNotOwner() public {
        vm.deal(alice, 15 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        vm.prank(alice);
        vm.expectRevert(Campaign.NotOwner.selector);
        campaign.withdraw();
    }

    // ─── Refund — still requires deadline to pass ────────────
    function test_RefundSucceeds() public {
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        vm.warp(DEADLINE + 1);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        campaign.refund();

        assertEq(alice.balance, balBefore + 3 ether);
        assertEq(campaign.getContribution(alice), 0);
    }

    function test_RefundRevertsIfGoalMet() public {
        vm.deal(alice, 15 ether);
        vm.prank(alice);
        campaign.fund{value: 10 ether}();

        vm.warp(DEADLINE + 1);
        vm.prank(alice);
        vm.expectRevert(Campaign.GoalAlreadyMet.selector);
        campaign.refund();
    }

    function test_RefundRevertsBeforeDeadline() public {
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        campaign.fund{value: 3 ether}();

        vm.prank(alice);
        vm.expectRevert(Campaign.DeadlineNotPassed.selector);
        campaign.refund();
    }

    function test_RefundRevertsNothingToRefund() public {
        vm.warp(DEADLINE + 1);
        vm.prank(alice);
        vm.expectRevert(Campaign.NothingToRefund.selector);
        campaign.refund();
    }

    function testFuzz_MultipleFunders(uint96 a, uint96 b) public {
        vm.assume(a > 0 && b > 0);
        vm.assume(uint256(a) + uint256(b) <= 1000 ether);
        vm.deal(alice, a);
        vm.deal(bob,   b);
        vm.prank(alice); campaign.fund{value: a}();
        vm.prank(bob);   campaign.fund{value: b}();
        assertEq(campaign.amountRaised(), uint256(a) + uint256(b));
    }

    function test_FactoryCreatesCampaign() public view {
        assertEq(factory.campaignCount(), 1);
        CrowdfundFactory.CampaignMeta memory meta = factory.getCampaign(0);
        assertEq(meta.owner, owner);
        assertEq(meta.goal,  GOAL);
    }

    function test_FactoryAdminPause() public {
        factory.adminPauseCampaign(0, true);
        assertTrue(campaign.paused());
        factory.adminPauseCampaign(0, false);
        assertFalse(campaign.paused());
    }

    function test_FactoryAdminPauseRevertsIfNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(CrowdfundFactory.NotAdmin.selector);
        factory.adminPauseCampaign(0, true);
    }
}