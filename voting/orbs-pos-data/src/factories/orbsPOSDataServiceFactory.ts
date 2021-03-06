/**
 * Copyright 2019 the orbs-ethereum-contracts authors
 * This file is part of the orbs-ethereum-contracts library in the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
import { Client } from 'orbs-client-sdk';
import Web3 from 'web3';
import { EthereumClientService } from '../services/EthereumClientService';
import { IOrbsPosContractsAddresses, MainnetContractsAddresses } from '../contracts-adresses';
import { OrbsClientService } from '../services/OrbsClientService';
import { OrbsPOSDataService } from '../services/OrbsPOSDataService';
import { IEthereumClientService } from '../interfaces/IEthereumClientService';
import { IOrbsClientService } from '../interfaces/IOrbsClientService';
import { IOrbsPOSDataService } from '../interfaces/IOrbsPOSDataService';

// TODO : O.L : Add tests for 'overrideAddresses'

export function orbsPOSDataServiceFactory(
  web3: Web3,
  orbsClient: Client,
  overrideAddresses: Partial<IOrbsPosContractsAddresses> = {},
): IOrbsPOSDataService {
  const contractsAddresses: IOrbsPosContractsAddresses = { ...MainnetContractsAddresses, ...overrideAddresses };
  const ethereumClient: IEthereumClientService = new EthereumClientService(web3, contractsAddresses);
  const orbsClientService: IOrbsClientService = new OrbsClientService(orbsClient);

  return new OrbsPOSDataService(ethereumClient, orbsClientService);
}
