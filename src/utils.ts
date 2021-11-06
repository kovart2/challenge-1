import { getJsonRpcUrl, TransactionEvent } from 'forta-agent';
import { Contract, providers } from 'ethers';
import {
  GET_FALLBACK_ORACLE_FUNCTION_ABI,
  PRICE_ORACLE_ADDRESS,
  FALLBACK_ORACLE_UPDATED_EVENT_SIGNATURE
} from './constants';

export class AaveUtils {
  public oracleAddress: string;
  private fallbackOracleAddress: string | null = null;

  constructor(oracleAddress: string) {
    this.oracleAddress = oracleAddress;
  }

  public async getFallbackOracleAddress(txEvent?: TransactionEvent): Promise<string> {
    // The method optimizes contract calls to a minimum

    if (txEvent) {
      const logs = txEvent.filterLog(FALLBACK_ORACLE_UPDATED_EVENT_SIGNATURE, this.oracleAddress);

      if (logs.length > 0) {
        const lastUpdateLog = logs[logs.length - 1];
        this.fallbackOracleAddress = lastUpdateLog.args.fallbackOracle;
      }
    }

    if (!this.fallbackOracleAddress || !txEvent) {
      const provider = new providers.StaticJsonRpcProvider(getJsonRpcUrl());
      const contract = new Contract(
        PRICE_ORACLE_ADDRESS,
        GET_FALLBACK_ORACLE_FUNCTION_ABI,
        provider
      );

      this.fallbackOracleAddress = await contract.getFallbackOracle();
    }

    return this.fallbackOracleAddress!;
  }
}
