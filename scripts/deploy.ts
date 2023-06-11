import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment, Libraries } from 'hardhat/types';
import { DiamondChanges } from '../utils/diamond';

task('deploy', 'deploy all contracts')
  .addOptionalParam('name', 'NFT Name', "Snowball", types.string)
  .addOptionalParam('symbol', 'NFT Symbol', "SNOW", types.string)
  .addOptionalParam('baseURI', 'Base image URI', "https://fireball.com/metadata/snowballs/", types.string)
  .setAction(deploy);

async function deploy(
  args: { name: string; symbol: string; baseURI: string },
  hre: HardhatRuntimeEnvironment,
) {
  const isDev = hre.network.name === 'localhost' || hre.network.name === 'hardhat';

  // need to force compile for tasks
  await hre.run('compile');

  // We're only using one account, getSigners()[0], the deployer.
  // Is deployer of all contracts
  const [deployer] = await hre.ethers.getSigners();

  // TODO: Amount here should be changed
  const requires = hre.ethers.utils.parseEther('2.1');
  const balance = await deployer.getBalance();

  // Only when deploying to production, give the deployer wallet money,
  // in order for it to be able to deploy the contracts
  if (!isDev && balance.lt(requires)) {
    throw new Error(
      `${deployer.address} requires ~$${hre.ethers.utils.formatEther(
        requires
      )} but has ${hre.ethers.utils.formatEther(balance)} top up and rerun`
    );
  }

  const [diamond, diamondInit, initReceipt] = await deployAndCut(
    {
      ownerAddress: deployer.address,
      name: args.name,
      symbol: args.symbol,
      baseURI: args.baseURI,
    },
    hre
  );

  console.log('Diamond address:', diamond.address);
  console.log('Deployed successfully.');
}

export async function deployAndCut(
  {
    ownerAddress,
    name,
    symbol,
    baseURI,
  }: {
    ownerAddress: string;
    name: string;
    symbol: string;
    baseURI: string;
  },
  hre: HardhatRuntimeEnvironment
) {
  const isDev = hre.network.name === 'localhost' || hre.network.name === 'hardhat';

  const changes = new DiamondChanges();

  const libraries = await deployLibraries({}, hre);

  // Diamond Spec facets
  // Note: These won't be updated during an upgrade without manual intervention
  const diamondCutFacet = await deployDiamondCutFacet({}, libraries, hre);
  const diamondLoupeFacet = await deployDiamondLoupeFacet({}, libraries, hre);
  const ownershipFacet = await deployOwnershipFacet({}, libraries, hre);

  // The `cuts` to perform for Diamond Spec facets
  const diamondSpecFacetCuts = [
    // Note: The `diamondCut` is omitted because it is cut upon deployment
    ...changes.getFacetCuts('DiamondLoupeFacet', diamondLoupeFacet),
    ...changes.getFacetCuts('OwnershipFacet', ownershipFacet),
  ];

  const diamond = await deployDiamond(
    {
      ownerAddress,
      // The `diamondCutFacet` is cut upon deployment
      diamondCutAddress: diamondCutFacet.address,
    },
    libraries,
    hre
  );

  const diamondInit = await deployDiamondInit({}, libraries, hre);

  // Snowball facets
  const snowballFacet = await deploySnowballFacet({}, libraries, hre);
  const svgFacet = await deploySvgFacet({}, libraries, hre);

  // The `cuts` to perform for Snowball facets
  const snowballFacetCuts = [
    ...changes.getFacetCuts('SnowballFacet', snowballFacet),
    ...changes.getFacetCuts('SvgFacet', svgFacet),
  ];

  const toCut = [...diamondSpecFacetCuts, ...snowballFacetCuts];

  const diamondCut = await hre.ethers.getContractAt('DiamondCutFacet', diamond.address);

  // EIP-2535 specifies that the `diamondCut` function takes two optional
  // arguments: address _init and bytes calldata _calldata
  // These arguments are used to execute an arbitrary function using delegatecall
  // in order to set state variables in the diamond during deployment or an upgrade
  // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
  const initAddress = diamondInit.address;
  const initFunctionCall = diamondInit.interface.encodeFunctionData('init', [{
    name,
    symbol,
    baseURI,
  }]);

  const initTx = await diamondCut.diamondCut(toCut, initAddress, initFunctionCall);
  const initReceipt = await initTx.wait();
  if (!initReceipt.status) {
    throw Error(`Diamond cut failed: ${initTx.hash}`);
  }
  console.log('Completed diamond cut');

  return [diamond, diamondInit, initReceipt] as const;
}

async function deployDiamondCutFacet({}, libraries: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DiamondCutFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DiamondCutFacet deployed to: ${contract.address}`);
  return contract;
}

async function deployDiamondLoupeFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('DiamondLoupeFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`DiamondLoupeFacet deployed to: ${contract.address}`);
  return contract;
}

async function deployDiamond(
  {
    ownerAddress,
    diamondCutAddress,
  }: {
    ownerAddress: string;
    diamondCutAddress: string;
  },
  {}: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('Diamond');
  const contract = await factory.deploy(ownerAddress, diamondCutAddress);
  await contract.deployTransaction.wait();
  console.log(`Diamond deployed to: ${contract.address}`);
  return contract;
}

async function deployOwnershipFacet({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory('OwnershipFacet');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`OwnershipFacet deployed to: ${contract.address}`);
  return contract;
}

async function deployDiamondInit({}, {}: Libraries, hre: HardhatRuntimeEnvironment) {
  // SnowballInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const factory = await hre.ethers.getContractFactory('SnowballInit');
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`SnowballInit deployed to: ${contract.address}`);
  return contract;
}

export async function deploySnowballFacet(
  {},
  { LibStrings, LibMeta, LibERC721, LibSnowball }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('SnowballFacet', {
    libraries: {
      LibStrings,
      LibMeta,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`SnowballFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deploySvgFacet(
  {},
  { LibStrings, LibSvg }: Libraries,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory('SvgFacet', {
    libraries: {
      LibSvg,
    },
  });
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`SvgFacet deployed to: ${contract.address}`);
  return contract;
}

export async function deployLibraries({}, hre: HardhatRuntimeEnvironment) {
  const LibStringsFactory = await hre.ethers.getContractFactory('LibStrings');
  const LibStrings = await LibStringsFactory.deploy();
  await LibStrings.deployTransaction.wait();

  const LibERC721Factory = await hre.ethers.getContractFactory('LibERC721');
  const LibERC721 = await LibERC721Factory.deploy();
  await LibERC721.deployTransaction.wait();

  const LibMetaFactory = await hre.ethers.getContractFactory('LibMeta');
  const LibMeta = await LibMetaFactory.deploy();
  await LibMeta.deployTransaction.wait();

  const LibSnowballFactory = await hre.ethers.getContractFactory('LibSnowball');
  const LibSnowball = await LibSnowballFactory.deploy();
  await LibSnowball.deployTransaction.wait();

  const LibSvgStorageFactory = await hre.ethers.getContractFactory('LibSvgStorage');
  const LibSvgStorage = await LibSvgStorageFactory.deploy();
  await LibSvgStorage.deployTransaction.wait();

  const LibSvgFactory = await hre.ethers.getContractFactory('LibSvg', {
    libraries: {
      LibStrings: LibStrings.address,
    },
  });
  const LibSvg = await LibSvgFactory.deploy();
  await LibSvg.deployTransaction.wait();

  return {
    LibStrings: LibStrings.address,
    LibERC721: LibERC721.address,
    LibMeta: LibMeta.address,
    LibSnowball: LibSnowball.address,
    LibSvgStorage: LibSvgStorage.address,
    LibSvg: LibSvg.address,
  };
}