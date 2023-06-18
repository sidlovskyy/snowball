import '@nomiclabs/hardhat-ethers';
import 'hardhat-abi-exporter';
import 'hardhat-diamond-abi';
// Must be registered after hardhat-diamond-abi
import '@typechain/hardhat';
import 'hardhat-contract-sizer';

import { HardhatUserConfig } from 'hardhat/config';
import * as diamondUtils from './utils/diamond';

import './scripts/deploy';

require('dotenv').config();

const { DEPLOYER_PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  networks: {
    localhost: {
      url: 'http://localhost:8545/',
      accounts: {
        // Same mnemonic used in the .env.example
        mnemonic: 'change typical hire slam amateur loan grid fix drama electric seed label',
      },
      chainId: 31337,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL ?? 'https://polygon-rpc.com',
      accounts: [DEPLOYER_PRIVATE_KEY!],
      gasMultiplier: 1.5,
      chainId: 137,
    },
  },
  diamondAbi: {
    // This plugin will combine all ABIs from any Smart Contract with `Facet` in the name or path and output it as `Snowball.json`
    name: 'Snowball',
    include: ['Facet'],
    // We explicitly set `strict` to `true` because we want to validate our facets don't accidentally provide overlapping functions
    strict: true,
    // We use our diamond utils to filter some functions we ignore from the combined ABI
    filter(abiElement: unknown, index: number, abi: unknown[], fullyQualifiedName: string) {
      // Events can be defined in internal libraries or multiple facets and look like duplicates
      if (diamondUtils.isOverlappingEvent(abiElement)) {
        return false;
      }
      // Errors can be defined in internal libraries or multiple facets and look like duplicates
      if (diamondUtils.isOverlappingError(abiElement)) {
        return false;
      }
      const signature = diamondUtils.toSignature(abiElement);
      return diamondUtils.isIncluded(fullyQualifiedName, signature);
    },
  },
};

export default config;
