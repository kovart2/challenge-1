import { getJsonRpcUrl, TransactionEvent } from 'forta-agent';
import { Contract, ethers } from 'ethers';
import { GET_FALLBACK_ORACLE_FUNCTION_ABI, FALLBACK_ORACLE_UPDATED_EVENT_ABI } from './constants';

export class AaveUtils {
  public oracleAddress: string;
  private fallbackOracleAddress: string | null = null;

  constructor(oracleAddress: string) {
    this.oracleAddress = oracleAddress;
  }

  public processTransaction(txEvent: TransactionEvent) {
    // The method optimizes contract calls to a minimum
    // by detecting state changes in transaction logs.

    const logs = txEvent.filterLog(FALLBACK_ORACLE_UPDATED_EVENT_ABI, this.oracleAddress);
    if (logs.length > 0) {
      const lastUpdateLog = logs[logs.length - 1];
      this.fallbackOracleAddress = lastUpdateLog.args.fallbackOracle;
    }
  }

  public async getFallbackOracleAddress(): Promise<string> {
    if (!this.fallbackOracleAddress) {
      const iface = new ethers.utils.Interface([GET_FALLBACK_ORACLE_FUNCTION_ABI]);
      const provider = new ethers.providers.StaticJsonRpcProvider(getJsonRpcUrl());
      const contract = new Contract(this.oracleAddress, iface, provider);

      this.fallbackOracleAddress = await contract.getFallbackOracle();
    }

    return this.fallbackOracleAddress!;
  }
}
