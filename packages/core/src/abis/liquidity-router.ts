// AUTO-GENERATED — do not edit manually.
// Source: obi.router/out/LiquidityRouter.sol/LiquidityRouter.json
// Router path: /home/harry-riddle/dev/github.com/obidot/obi.router
// Synced: 2026-03-28T07:01:46.125Z
//
// LiquidityRouter — add/remove liquidity entrypoint for hub-side LP operations.

export const LIQUIDITY_ROUTER_ABI = [
  {
    type: 'function',
    name: 'addLiquidity',
    inputs: [
      {
        name: 'pair',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amountADesired',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountBDesired',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountAMin',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountBMin',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountA',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountB',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'liquidity',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'quote',
    inputs: [
      {
        name: 'amountA',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'reserveA',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'reserveB',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountB',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'removeLiquidity',
    inputs: [
      {
        name: 'pair',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'liquidity',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountAMin',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountBMin',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'deadline',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amountA',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'amountB',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
] as const;
