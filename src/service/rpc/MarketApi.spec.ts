import 'mocha';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { expect } from 'chai';
import { croMarketPriceApi } from './MarketApi';
import {
  allTokensSlug,
  croToFiatRateStub,
  ethToFiatRateStub,
  usdToFiatConversionRate,
  vvsFinancePrice,
} from './test/mock.marketapi';
import { CRONOS_EVM_ASSET } from '../../config/StaticAssets';
import { DefaultWalletConfigs } from '../../config/StaticConfig';
import { UserAsset, UserAssetType } from '../../models/UserAsset';

describe('MarketApi', () => {
  let axiosMock: MockAdapter;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios, { onNoMatch: 'throwException' });
  });

  afterEach(() => {
    axiosMock.reset();
  });
  it('should return the `ETH` fiat rate from coinbase', async () => {
    axiosMock
      .onGet('/exchange-rates', {
        params: {
          currency: 'ETH',
        },
      })
      .replyOnce(200, ethToFiatRateStub);

    const ethToFiatPrice = await croMarketPriceApi.getCryptoToFiatRateFromCoinbase('ETH', 'SGD');
    expect(ethToFiatPrice).to.deep.equal('4604.13319145');
  });
  it('should return the `CRO` fiat rate from coinbase', async () => {
    axiosMock
      .onGet('/exchange-rates', {
        params: {
          currency: 'CRO',
        },
      })
      .replyOnce(200, croToFiatRateStub);

    const croToFiatRate = await croMarketPriceApi.getCryptoToFiatRateFromCoinbase('CRO', 'SGD');
    expect(croToFiatRate).to.deep.equal('4604.13319145');
  });

  it('should throw on legacy `CRO` and `USD` rate from coinbase', async () => {
    axiosMock.onGet().replyOnce(200, croToFiatRateStub);

    const croToFiatRate = await croMarketPriceApi.getCryptoToFiatRateFromCoinbase('CRO', 'USD');
    expect(croToFiatRate).to.eq('3427.505');
  });

  it('should return token price from Crypto.com Price API', async () => {
    axiosMock
      .onGet('/all-tokens')
      .replyOnce(200, allTokensSlug)
      .onGet('/all-tokens')
      .replyOnce(200, allTokensSlug);

    axiosMock
      .onGet('/tokens/vvs-finance')
      .replyOnce(200, vvsFinancePrice)
      .onGet('/tokens/vvs-finance')
      .replyOnce(200, vvsFinancePrice);

    axiosMock
      .onGet('/exchange-rates', {
        params: {
          currency: 'USD',
        },
      })
      .replyOnce(200, usdToFiatConversionRate);

    const vvsAsset: UserAsset = {
      ...CRONOS_EVM_ASSET(DefaultWalletConfigs.MainNetConfig),
      mainnetSymbol: 'VVS',
      symbol: 'VVS',
      assetType: UserAssetType.CRC_20_TOKEN,
      walletId: '',
    };

    const { fiatPrice: vvsTokenPriceSGD, dailyChange: vvsTokenPriceDailyChange } = await croMarketPriceApi.getTokenPriceFromCryptoCom(vvsAsset, 'SGD');
    expect(vvsTokenPriceSGD).to.equals('0.00060383095694892');
    expect(vvsTokenPriceDailyChange).to.equals('-0.012577');

    const { fiatPrice: vvsTokenPriceUSD } = await croMarketPriceApi.getTokenPriceFromCryptoCom(vvsAsset, 'USD');
    expect(vvsTokenPriceUSD).to.equals('0.000442751368');
  });
});
