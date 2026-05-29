// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RescueExecutor
/// @notice Runs UNDER EIP-7702 delegation: the owner signs an authorization that
///         lets THEIR OWN wallet execute this code for a single transaction. Because
///         it runs as the owner, the lock's `refundUniLP()` (which only obeys the
///         owner) succeeds — and in the same atomic tx a hardcoded 15% of the
///         unlocked LP is taken as the service fee. The owner keeps the rest.
///
/// @dev Trust properties, all verifiable on-chain:
///      - FEE_BPS is a `constant` 15% — it can NEVER be changed or exceeded.
///      - The contract moves NOTHING except that fee; the remaining 85% is untouchable.
///      - Funds never leave the owner's own account (7702) — non-custodial.
///      - The owner can always ignore this and call `refundUniLP()` directly for free.
///
/// @dev SECURITY: handles user funds. MUST be audited and tested on testnet before
///      being pointed at real locks. Not yet audited.
interface ILock { function refundUniLP() external; }

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract RescueExecutor {
    /// @notice Service fee, in basis points. Hardcoded — immutable by design.
    uint256 public constant FEE_BPS = 1_500;        // 15.00%
    /// @notice Referrer's share OF THE FEE, in basis points. Hardcoded.
    uint256 public constant REFERRAL_BPS = 1_000;   // 10% of the 15% fee (= 1.5% of the LP)

    /// @notice Where the (non-referral part of the) fee goes. Set once at deploy.
    address public immutable feeWallet;

    event Rescued(
        address indexed owner,
        address indexed lock,
        address lpToken,
        uint256 received,
        uint256 fee,
        address referrer,
        uint256 referrerCut
    );

    constructor(address _feeWallet) {
        require(_feeWallet != address(0), "feeWallet=0");
        feeWallet = _feeWallet;
    }

    /// @notice Unlock the lock and split a hardcoded 15% fee. Run via 7702 delegation,
    ///         so `address(this)` is the owner's own account.
    /// @param lock      the DXsale lock contract
    /// @param lpToken   the LP token the lock releases
    /// @param referrer  optional; receives 10% of the fee. address(0) = no referrer.
    function rescue(address lock, address lpToken, address referrer) external {
        // Self-call only. Under 7702, address(this) IS the owner's account, so a
        // tx the owner sends to themselves has msg.sender == address(this). This
        // blocks any third party from triggering the unlock on a still-delegated
        // account and redirecting the referral cut to themselves. (A relayer/
        // sponsored-tx model would need a signed-intent check instead.)
        require(msg.sender == address(this), "self only");

        IERC20 lp = IERC20(lpToken);

        uint256 balBefore = lp.balanceOf(address(this));
        ILock(lock).refundUniLP();                 // runs as the owner -> passes
        uint256 received = lp.balanceOf(address(this)) - balBefore;

        uint256 fee = (received * FEE_BPS) / 10_000;
        uint256 referrerCut = referrer != address(0) ? (fee * REFERRAL_BPS) / 10_000 : 0;

        if (referrerCut > 0) require(lp.transfer(referrer, referrerCut), "ref xfer");
        uint256 toService = fee - referrerCut;
        if (toService > 0) require(lp.transfer(feeWallet, toService), "fee xfer");

        // The remaining `received - fee` stays in the owner's account, untouched.
        emit Rescued(address(this), lock, lpToken, received, fee, referrer, referrerCut);
    }
}
