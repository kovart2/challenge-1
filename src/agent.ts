import { TransactionEvent, Finding, FindingSeverity, FindingType } from 'forta-agent';
import { AaveUtils } from './utils';
import {
  GET_ASSET_PRICE_FUNCTION_ABI,
  GET_FALLBACK_ORACLE_FUNCTION_ABI,
  PRICE_ORACLE_ADDRESS
} from './constants';

export const PROTOCOL = 'aave';
export const GET_FALLBACK_ADDRESS_ALERT_ID = 'AAVE-FALLBACK-ORACLE-CALL-0';
export const GET_FALLBACK_PRICE_ALERT_ID = 'AAVE-FALLBACK-ORACLE-CALL-1';

const aaveUtils = new AaveUtils(PRICE_ORACLE_ADDRESS);

function provideHandleTransaction(aaveUtils: AaveUtils) {
  return async function handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = [];

    // looking for traces of getFallbackOracle() function on Price Oracle contract
    const getFallbackFunctionCalls = txEvent.filterFunction(
      GET_FALLBACK_ORACLE_FUNCTION_ABI,
      PRICE_ORACLE_ADDRESS
    );

    // fire alert if we find getFallbackOracle() call
    if (getFallbackFunctionCalls.length > 0) {
      findings.push(
        Finding.fromObject({
          name: 'Aave getFallbackOracle() Function Call',
          description: `External getFallbackOracle() function is called by ${txEvent.from}`,
          alertId: GET_FALLBACK_ADDRESS_ALERT_ID,
          protocol: PROTOCOL,
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            from: txEvent.from
          }
        })
      );
    }

    // looking for traces of getAssetPrice() function on Price Oracle contract
    const getAssetPriceCalls = txEvent.filterFunction(
      GET_ASSET_PRICE_FUNCTION_ABI,
      PRICE_ORACLE_ADDRESS
    );

    // fallback oracle can only be invoked inside getAssetPrice() of the aave oracle
    if (!getAssetPriceCalls.length) return findings;

    // get current contract address of the fallback price oracle (could be changed by contract owner)
    const fallbackOracleAddress = await aaveUtils.getFallbackOracle(txEvent);

    // looking for traces of getAssetPrice() function on Fallback Price Oracle contract
    const getFallbackAssetPriceCalls = txEvent.filterFunction(
      GET_ASSET_PRICE_FUNCTION_ABI,
      fallbackOracleAddress
    );

    // fire alerts for each getAssetPrice() fallback call
    for (const transaction of getFallbackAssetPriceCalls) {
      const { asset: assetAddress } = transaction.args;
      findings.push(
        Finding.fromObject({
          name: 'Aave Fallback Price Oracle Usage',
          description: `Fallback oracle was used to get the price of ${assetAddress} asset`,
          alertId: GET_FALLBACK_PRICE_ALERT_ID,
          protocol: PROTOCOL,
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          metadata: {
            asset: assetAddress,
            from: txEvent.from
          }
        })
      );
    }

    return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(aaveUtils)
};
