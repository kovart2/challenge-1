import { getJsonRpcUrl, TransactionEvent } from 'forta-agent';
import { Contract, ethers } from 'ethers';
import ILendingPoolAddressesProvider from '@aave/protocol-v2/artifacts/contracts/interfaces/ILendingPoolAddressesProvider.sol/ILendingPoolAddressesProvider.json';
import {
  PRICE_ORACLE_UPDATED_EVENT_ABI,
  FALLBACK_ORACLE_UPDATED_EVENT_ABI,
  GET_FALLBACK_ORACLE_FUNCTION_ABI,
  LENDING_POOL_ADDRESSES_PROVIDER_ADDRESS
} from './constants';

export class AaveUtils {
  public oracleAddress: string | undefined;
  public fallbackOracleAddress: string | undefined;

  public async fetchConfigs() {
    const jsonRpcProvider = new ethers.providers.StaticJsonRpcProvider(getJsonRpcUrl());

    // This contract is immutable and the address will never change
    const lendingPoolAddressesProvider = new Contract(
      LENDING_POOL_ADDRESSES_PROVIDER_ADDRESS,
      ILendingPoolAddressesProvider.abi,
      jsonRpcProvider
    );

    this.oracleAddress = await lendingPoolAddressesProvider.getPriceOracle();

    const priceOracleIface = new ethers.utils.Interface([GET_FALLBACK_ORACLE_FUNCTION_ABI]);
    const priceOracle = new Contract(this.oracleAddress!, priceOracleIface, jsonRpcProvider);

    this.fallbackOracleAddress = await priceOracle.getFallbackOracle();
  }

  public handleTransaction(txEvent: TransactionEvent) {
    // This method optimizes contract calls to a minimum
    // by detecting state changes in transaction logs.

    let logs = null;

    // "Price Oracle Updated" events
    logs = txEvent.filterLog(
      PRICE_ORACLE_UPDATED_EVENT_ABI,
      LENDING_POOL_ADDRESSES_PROVIDER_ADDRESS
    );
    if (logs.length > 0) {
      const lastUpdateLog = logs[logs.length - 1];
      this.oracleAddress = lastUpdateLog.args.newAddress;
    }

    // "Fallback Oracle Updated" events
    logs = txEvent.filterLog(FALLBACK_ORACLE_UPDATED_EVENT_ABI, this.oracleAddress);
    if (logs.length > 0) {
      const lastUpdateLog = logs[logs.length - 1];
      this.fallbackOracleAddress = lastUpdateLog.args.fallbackOracle;
    }
  }
}
