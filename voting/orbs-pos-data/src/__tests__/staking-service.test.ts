/**
 * Copyright 2019 the staking-dashboard authors
 * This file is part of the staking-dashboard library in the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
import { StakingService } from '../StakingService';
import * as IStakingContractABI from 'orbs-staking-contract/build/abi/IStakingContract.json';
import contractsInfo from '../contracts-info';
import { IStakingStatus } from '../interfaces/IStakingService';

class Web3Mock {
  methodParams = (methodName: string) => this.eth.Contract.mock.results[0].value.methods[methodName].mock.calls[0];
  getStakeBalanceOfResult: string = null;
  getTotalStakedTokensResult: string = null;
  getUnstakeStatusResult: { cooldownAmount: string; cooldownEndTime: string } = null;

  eth = {
    Contract: jest.fn().mockImplementation((abi, address) => {
      return {
        methods: {
          stake: jest.fn(amount => ({ send: jest.fn() })),
          unstake: jest.fn(amount => ({ send: jest.fn() })),
          restake: jest.fn(() => ({ send: jest.fn() })),
          withdraw: jest.fn(() => ({ send: jest.fn() })),
          getStakeBalanceOf: jest.fn(stakeOwner => ({
            call: jest.fn(() => this.getStakeBalanceOfResult),
          })),
          getTotalStakedTokens: jest.fn(() => ({
            call: jest.fn(() => this.getTotalStakedTokensResult),
          })),
          getUnstakeStatus: jest.fn(stakeOwner => ({
            call: jest.fn(() => this.getUnstakeStatusResult),
          })),
        },
      };
    }),
  };
}

describe('Staking service', () => {
  let stakingService: StakingService;
  let web3Mock: Web3Mock;

  beforeEach(() => {
    web3Mock = new Web3Mock();
    stakingService = new StakingService(web3Mock as any);
  });

  it('should initialize the contract with the right abi and the contract address', async () => {
    expect(web3Mock.eth.Contract).toBeCalledWith(IStakingContractABI, contractsInfo.StakingContract.address);
  });

  it('should call "stake" with the amount', async () => {
    const result = await stakingService.stake(1_000_000);
    expect(web3Mock.methodParams('stake')).toEqual([1_000_000]);
  });

  it('should call "unstake" with the amount', async () => {
    await stakingService.unstake(2_000_000);
    expect(web3Mock.methodParams('unstake')).toEqual([2_000_000]);
  });

  it('should call "restake"', async () => {
    await stakingService.restake();
    expect(web3Mock.methodParams('restake')).toEqual([]);
  });

  it('should call "withdraw"', async () => {
    await stakingService.withdraw();
    expect(web3Mock.methodParams('withdraw')).toEqual([]);
  });

  it('should call "getStakeBalanceOf" with the owner address', async () => {
    web3Mock.getStakeBalanceOfResult = '123';
    const actual = await stakingService.getStakeBalanceOf('DUMMY_ADDRESS');

    expect(web3Mock.methodParams('getStakeBalanceOf')).toEqual(['DUMMY_ADDRESS']);
    expect(actual).toEqual('123');
  });

  it('should call "getTotalStakedTokens"', async () => {
    web3Mock.getTotalStakedTokensResult = '123456';
    const actual = await stakingService.getTotalStakedTokens();

    expect(web3Mock.methodParams('getTotalStakedTokens')).toEqual([]);
    expect(actual).toEqual('123456');
  });

  it('should call "getUnstakeStatus"', async () => {
    web3Mock.getUnstakeStatusResult = { cooldownAmount: '123', cooldownEndTime: '456' };
    const actual = await stakingService.getUnstakeStatus('DUMMY_ADDRESS');

    expect(web3Mock.methodParams('getUnstakeStatus')).toEqual(['DUMMY_ADDRESS']);
    expect(actual).toEqual({ cooldownAmount: 123, cooldownEndTime: 456 });
  });
});