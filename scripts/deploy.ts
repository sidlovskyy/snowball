import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment, Libraries } from 'hardhat/types';
import { DiamondChanges } from '../utils/diamond';
import { ethers } from 'ethers';

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

  await deployTestSvg(diamond.address, deployer.address, hre);

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

  const diamondCut = await hre.ethers.getContractAt('Snowball', diamond.address);

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

async function deployTestSvg(diamond: string, deployerAddress: string, hre: HardhatRuntimeEnvironment) {
  const tokenId = 1;
  const snowball = await hre.ethers.getContractAt('Snowball', diamond);
  await snowball.mint(deployerAddress, tokenId);
  await snowball.storeSvg(tokenId, {
    width: 32,
    height: 32,
    data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(
      '<path d="M23.3 8.40007L21.82 6.40008C21.7248 6.27314 21.6008 6.17066 21.4583 6.10111C21.3157 6.03156 21.1586 5.99693 21 6.00008H11.2C11.0555 6.00007 10.9128 6.03135 10.7816 6.09177C10.6504 6.15219 10.5339 6.24031 10.44 6.35007L8.71998 8.35008C8.57227 8.53401 8.49435 8.76424 8.49998 9.00008V16.2901C8.50262 18.0317 9.19567 19.7013 10.4272 20.9328C11.6588 22.1644 13.3283 22.8574 15.07 22.8601H16.93C18.6716 22.8574 20.3412 22.1644 21.5728 20.9328C22.8043 19.7013 23.4973 18.0317 23.5 16.2901V9.00008C23.5 8.7837 23.4298 8.57317 23.3 8.40007Z" fill="#FFCC80"/>\n' +
      '<path d="M29.78 28.38L25.78 23.38C25.664 23.2321 25.5086 23.1198 25.3318 23.0562C25.1549 22.9925 24.9637 22.98 24.78 23.02L16 25L7.21999 23C7.03632 22.96 6.84507 22.9725 6.6682 23.0362C6.49133 23.0998 6.33598 23.2121 6.21999 23.36L2.21999 28.36C2.10392 28.5064 2.03116 28.6823 2.00995 28.8679C1.98874 29.0534 2.01993 29.2413 2.09999 29.41C2.17815 29.5839 2.3044 29.7319 2.46385 29.8364C2.62331 29.9409 2.80933 29.9977 2.99999 30H29C29.1885 29.9995 29.373 29.9457 29.5322 29.8448C29.6914 29.744 29.8189 29.6002 29.9 29.43C29.98 29.2613 30.0112 29.0734 29.99 28.8879C29.9688 28.7023 29.8961 28.5264 29.78 28.38Z" fill="#01579B"/>\n' +
      '<path d="M29.29 6.00003L16.29 2.00003C16.0999 1.95002 15.9001 1.95002 15.71 2.00003L2.71 6.00003C2.49742 6.06422 2.31226 6.19735 2.1837 6.37841C2.05515 6.55947 1.99052 6.77817 2 7.00003C1.9917 7.22447 2.0592 7.44518 2.19163 7.62659C2.32405 7.80799 2.5137 7.93954 2.73 8.00003L15.73 11.6C15.906 11.6534 16.094 11.6534 16.27 11.6L29.27 8.00003C29.4863 7.93954 29.6759 7.80799 29.8084 7.62659C29.9408 7.44518 30.0083 7.22447 30 7.00003C30.0095 6.77817 29.9448 6.55947 29.8163 6.37841C29.6877 6.19735 29.5026 6.06422 29.29 6.00003Z" fill="#01579B"/>\n' +
      '<path d="M11.22 6C11.0756 5.99999 10.9328 6.03127 10.8016 6.09169C10.6704 6.15211 10.5539 6.24023 10.46 6.35L8.74 8.35C8.58509 8.53114 8.49998 8.76166 8.5 9V16.29C8.50264 18.0317 9.19569 19.7012 10.4272 20.9328C11.6588 22.1643 13.3283 22.8574 15.07 22.86H16V6H11.22Z" fill="#FFE0B2"/>\n' +
      '<path d="M7.21999 23C7.03632 22.96 6.84507 22.9725 6.6682 23.0362C6.49133 23.0998 6.33598 23.2121 6.21999 23.36L2.21999 28.36C2.10392 28.5064 2.03116 28.6823 2.00995 28.8679C1.98874 29.0534 2.01993 29.2413 2.09999 29.41C2.17815 29.5839 2.3044 29.7319 2.46385 29.8364C2.62331 29.9409 2.80933 29.9977 2.99999 30H16V25L7.21999 23Z" fill="#0277BD"/>\n' +
      '<path d="M15.71 2.00002L2.71 6.00002C2.49742 6.06422 2.31226 6.19734 2.1837 6.3784C2.05515 6.55947 1.99052 6.77817 2 7.00002C1.9917 7.22447 2.0592 7.44518 2.19163 7.62658C2.32405 7.80799 2.5137 7.93954 2.73 8.00002L15.73 11.6C15.8194 11.6146 15.9106 11.6146 16 11.6V2.00002C15.9039 1.98469 15.8061 1.98469 15.71 2.00002Z" fill="#0277BD"/>\n' +
      '<path d="M2.73 8.00003L8.5 9.56003V16.29C8.50264 18.0317 9.19569 19.7013 10.4272 20.9328C11.6588 22.1643 13.3283 22.8574 15.07 22.86H16.93C18.6717 22.8574 20.3412 22.1643 21.5728 20.9328C22.8043 19.7013 23.4974 18.0317 23.5 16.29V9.56003L29.27 8.00003C29.4863 7.93954 29.6759 7.80799 29.8084 7.62659C29.9408 7.44518 30.0083 7.22447 30 7.00003C30.0095 6.77817 29.9448 6.55947 29.8163 6.37841C29.6877 6.19735 29.5026 6.06422 29.29 6.00003L16.29 2.00003C16.0999 1.95002 15.9001 1.95002 15.71 2.00003L2.71 6.00003C2.49742 6.06422 2.31226 6.19735 2.1837 6.37841C2.05515 6.55947 1.99052 6.77817 2 7.00003C1.9917 7.22447 2.0592 7.44518 2.19163 7.62659C2.32405 7.80799 2.5137 7.93954 2.73 8.00003ZM21.5 16.29C21.4974 17.5013 21.015 18.6621 20.1586 19.5186C19.3021 20.3751 18.1412 20.8574 16.93 20.86H15.07C13.8588 20.8574 12.6979 20.3751 11.8414 19.5186C10.985 18.6621 10.5026 17.5013 10.5 16.29V10.11L15.73 11.56C15.906 11.6134 16.094 11.6134 16.27 11.56L21.5 10.11V16.29ZM16 4.05003L25.44 7.00003L16 9.56003L6.56 7.00003L16 4.05003Z" fill="#263238"/>\n' +
      '<path d="M25.78 23.38C25.664 23.2321 25.5086 23.1198 25.3318 23.0562C25.1549 22.9925 24.9637 22.98 24.78 23.02L16 25L7.21999 23C7.03632 22.96 6.84507 22.9725 6.6682 23.0362C6.49133 23.0998 6.33598 23.2121 6.21999 23.36L2.21999 28.36C2.10392 28.5064 2.03116 28.6823 2.00995 28.8679C1.98874 29.0534 2.01993 29.2413 2.09999 29.41C2.17815 29.5839 2.3044 29.7319 2.46385 29.8364C2.62331 29.9409 2.80933 29.9977 2.99999 30H29C29.1885 29.9995 29.373 29.9457 29.5322 29.8448C29.6914 29.744 29.8189 29.6002 29.9 29.43C29.98 29.2613 30.0112 29.0734 29.99 28.8879C29.9688 28.7023 29.8961 28.5264 29.78 28.38L25.78 23.38ZM5.07999 28L7.38999 25.11L15.78 27C15.9251 27.0299 16.0748 27.0299 16.22 27L24.61 25.13L26.92 28H5.07999Z" fill="#263238"/>',
    )),
  });

  const svg = await snowball.getSvg(tokenId);
  console.log('Stored SVG:', svg);
}