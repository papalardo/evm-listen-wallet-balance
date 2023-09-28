import { ethers } from 'ethers';
import type { Wallet } from 'ethers';
import { BigNumberish } from 'ethers/src.ts/utils';
import { PROVIDER_URL, RECIPIENT } from './config';
import wallets from './wallets';

const provider = new ethers.WebSocketProvider(PROVIDER_URL);

const walletsAddresses = wallets.map((wallet) => {
  return new ethers.Wallet(wallet.privateKey, provider);
});

const createTx = (value: BigNumberish) => ({
  to: RECIPIENT,
  value
});

const estimateTransferGasPrice = async (amountInEther: BigNumberish) => {
  const [wallet] = walletsAddresses;
  
  const [feeData, txGas] = await Promise.all([
    provider.getFeeData(),
    wallet.estimateGas(createTx(amountInEther))
  ])

  return txGas * feeData.maxFeePerGas! + 1n;
}

const walletBalance = (wallet: Wallet) => provider.getBalance(wallet.address);

const canWithdraw = (walletBalance: bigint, transferGasPrice: bigint) => walletBalance > transferGasPrice;

const withdrawAmount = (walletBalance: bigint, transferGasPrice: bigint) => walletBalance - transferGasPrice;

const createPromiseFlow = async (wallet: Wallet) => {
  const balance = await walletBalance(wallet);
  const gas = await estimateTransferGasPrice(balance)
    .catch(() => null);

  if (gas === null) return;

  if (canWithdraw(balance, gas)) {
    const amount = withdrawAmount(balance, gas);
    const txReceipt = await wallet.sendTransaction(createTx(amount));

    console.log(`TRANSFERED [${wallet.address}]: ${ethers.formatEther(amount)}ETH ${txReceipt.hash}`);
  }
}

provider.on('block', async (n) => {
  console.log(`BLOCK: ${n}`);

  Promise.all(walletsAddresses.map((wallet) => createPromiseFlow(wallet)));
})