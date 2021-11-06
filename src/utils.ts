import { getJsonRpcUrl } from 'forta-agent';
import { Contract, providers } from 'ethers';
import { GET_FALLBACK_ORACLE_FUNCTION_ABI, PRICE_ORACLE_ADDRESS } from './constants';

export class AaveUtils {
  private contract: Contract;

  constructor() {
    const provider = new providers.JsonRpcProvider(getJsonRpcUrl());

    // simplified contract for the agent purposes
    this.contract = new Contract(PRICE_ORACLE_ADDRESS, GET_FALLBACK_ORACLE_FUNCTION_ABI, provider);
  }

  public async getFallbackOracle(): Promise<string> {
    return this.contract.getFallbackOracle();
  }
}
