import { Finding, FindingSeverity, FindingType } from 'forta-agent';
import agent, {
  GET_FALLBACK_ADDRESS_ALERT_ID,
  GET_FALLBACK_PRICE_ALERT_ID,
  PROTOCOL
} from '../agent';
import { GET_ASSET_PRICE_FUNCTION_ABI, GET_FALLBACK_ORACLE_FUNCTION_ABI } from '../constants';
import { TestUtils } from './utils';

const { provideHandleTransaction } = agent;

const utils = new TestUtils();

describe('aave fallback oracle agent', () => {
  describe('handleTransaction', () => {
    it('returns empty findings if oracle contract is not involved', async () => {
      const handleTransaction = provideHandleTransaction({} as any);

      const txEvent = utils.createTxEvent([]);

      const findings = await handleTransaction(txEvent);

      expect(findings).toStrictEqual([]);
    });

    it('returns empty findings if neither getFallbackOracle() nor getAssetPrice() is called', async () => {
      const [oracleAddress, fallbackOracleAddress] = ['0x01', '0x02'];

      const aaveUtilsMock = {
        oracleAddress: oracleAddress,
        getFallbackOracleAddress: jest.fn().mockReturnValue(fallbackOracleAddress)
      };

      const handleTransaction = provideHandleTransaction(aaveUtilsMock as any);

      const trace1 = utils.createTrace('function test1()', [], oracleAddress);
      const trace2 = utils.createTrace('function test2()', [], fallbackOracleAddress);

      const txEvent = utils.createTxEvent([trace1, trace2]);

      const findings = await handleTransaction(txEvent);

      expect(aaveUtilsMock.getFallbackOracleAddress.mock.calls.length).toBe(0);

      expect(findings).toStrictEqual([]);
    });

    it('returns a finding if getFallbackOracle() is called', async () => {
      const [oracleAddress, fallbackOracleAddress, fromAddress] = ['0x01', '0x02', '0x0666'];

      const aaveUtilsMock = {
        oracleAddress: oracleAddress,
        getFallbackOracleAddress: jest.fn().mockReturnValue(fallbackOracleAddress)
      };

      const handleTransaction = provideHandleTransaction(aaveUtilsMock as any);

      const trace = utils.createTrace(GET_FALLBACK_ORACLE_FUNCTION_ABI, [], oracleAddress);

      const txEvent = utils.createTxEvent([trace], fromAddress);

      const findings = await handleTransaction(txEvent);

      expect(aaveUtilsMock.getFallbackOracleAddress.mock.calls.length).toBe(0);

      const finding = Finding.fromObject({
        name: 'Aave getFallbackOracle() Function Call',
        description: `External getFallbackOracle() function is called by ${fromAddress}`,
        alertId: GET_FALLBACK_ADDRESS_ALERT_ID,
        protocol: PROTOCOL,
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: {
          from: fromAddress
        }
      });

      expect(findings).toStrictEqual([finding]);
    });

    it('returns a finding if fallback getAssetPrice() is called', async () => {
      const assetAddress = '0x7C1e2f858d25D56fA9e33Eb55a24485D08868192';
      const [oracleAddress, fallbackOracleAddress, fromAddress] = ['0x01', '0x02', '0x0666'];

      const aaveUtilsMock = {
        oracleAddress: oracleAddress,
        getFallbackOracleAddress: jest.fn().mockReturnValue(fallbackOracleAddress)
      };

      const handleTransaction = provideHandleTransaction(aaveUtilsMock as any);

      const trace1 = utils.createTrace(GET_ASSET_PRICE_FUNCTION_ABI, [assetAddress], oracleAddress);
      const trace2 = utils.createTrace(
        GET_ASSET_PRICE_FUNCTION_ABI,
        [assetAddress],
        fallbackOracleAddress
      );

      const txEvent = utils.createTxEvent([trace1, trace2], fromAddress);

      const findings = await handleTransaction(txEvent);

      expect(aaveUtilsMock.getFallbackOracleAddress.mock.calls.length).toBe(1);

      const finding = Finding.fromObject({
        name: 'Aave Fallback Price Oracle Usage',
        description: `Fallback oracle was used to get the price of the asset at address ${assetAddress}`,
        alertId: GET_FALLBACK_PRICE_ALERT_ID,
        protocol: PROTOCOL,
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          asset: assetAddress,
          from: fromAddress
        }
      });

      expect(findings).toStrictEqual([finding]);
    });
  });
});