'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const {
  BusinessNetworkDefinition,
  NetworkCardStoreManager,
  CertificateUtil,
  IdCard,
} = require('composer-common');
const path = require('path');

require('chai').should();

const namespace = 'org.acme.bnatemplate';

describe('Commodity Trading', () => {
  const cardStore = NetworkCardStoreManager.getCardStore({ type: 'composer-wallet-inmemory' });
  let adminConnection;
  let businessNetworkConnection;

  before(async () => {
    const connectionProfile = {
      name: 'embedded',
      'x-type': 'embedded',
    };

    const credentials = CertificateUtil.generate({ commonName: 'admin' });

    const deployerMetadata = {
      version: 1,
      userName: 'PeerAdmin',
      roles: ['PeerAdmin', 'ChannelAdmin'],
    };

    const deployerCard = new IdCard(deployerMetadata, connectionProfile);
    deployerCard.setCredentials(credentials);

    const deployerCardName = 'PeerAdmin';
    adminConnection = new AdminConnection({ cardStore: cardStore });

    await adminConnection.importCard(deployerCardName, deployerCard);
    await adminConnection.connect(deployerCardName);
  });

  beforeEach(async () => {
    businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });

    const adminUserName = 'admin';
    let adminCardName;
    let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(
      path.resolve(__dirname, '..')
    );

    await adminConnection.install(businessNetworkDefinition);

    const startOptions = {
      networkAdmins: [
        {
          userName: adminUserName,
          enrollmentSecret: 'adminpw',
        },
      ],
    };

    const adminCards = await adminConnection.start(
      businessNetworkDefinition.getName(),
      businessNetworkDefinition.getVersion(),
      startOptions
    );

    adminCardName = `${adminUserName}@${businessNetworkDefinition.getName()}`;
    await adminConnection.importCard(adminCardName, adminCards.get(adminUserName));

    await businessNetworkConnection.connect(adminCardName);
  });

  describe('Test', () => {
    it('should be true', () => {
      const value = true;
      value.should.true;
    });
  });

  describe('#tradeCommodity', () => {
    it('should be able to trade a commodity', async () => {
      const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

      // create new trader
      const dan = factory.newResource(namespace, 'Trader', 'dan@email.com');
      dan.firstName = 'Dan';
      dan.lastName = 'Selman';

      const simon = factory.newResource(namespace, 'Trader', 'simon@email.com');
      simon.firstName = 'Simon';
      simon.lastName = 'Stone';

      // create the commodity
      const commodity = factory.newResource(namespace, 'Commodity', 'EMA');
      commodity.description = 'Corn';
      commodity.mainExchange = 'Euronext';
      commodity.quantity = 100;
      commodity.owner = factory.newRelationship(namespace, 'Trader', dan.$identifier);

      // create the trade transaction
      const trade = factory.newTransaction(namespace, 'Trade');
      trade.newOwner = factory.newRelationship(namespace, 'Trader', simon.$identifier);
      trade.commodity = factory.newRelationship(namespace, 'Commodity', commodity.$identifier);

      // the owner should of the commodity should be dan
      commodity.owner.$identifier.should.equal(dan.$identifier);

      // Add commodity to network
      const assetRegistry = await businessNetworkConnection.getAssetRegistry(
        `${namespace}.Commodity`
      );
      await assetRegistry.add(commodity);

      // Add participants to network
      const participantRegistry = await businessNetworkConnection.getParticipantRegistry(
        `${namespace}.Trader`
      );
      await participantRegistry.addAll([dan, simon]);

      // Submit transaction
      await businessNetworkConnection.submitTransaction(trade);

      // Get the commodity back for inspection
      const commodityRegistry = await businessNetworkConnection.getAssetRegistry(
        `${namespace}.Commodity`
      );
      const newCommodity = await commodityRegistry.get(commodity.$identifier);

      newCommodity.owner.$identifier.should.equal(simon.$identifier);
    });
  });

  // describe('Registration', () => {
  //   it('should register new content hash', async () => {
  //     const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

  //     // Create the creator
  //     const creator = factory.newResource(namespace, 'DocumentController', creator_id);
  //     creator.employeeId = '334551';
  //     creator.businessUnitId = '90023';

  //     const creatorRegistry = await businessNetworkConnection.getParticipantRegistry(
  //       namespace + '.DocumentController'
  //     );
  //     // add new creator
  //     await creatorRegistry.addAll([creator]);

  //     // Create new content
  //     const content = factory.newConcept(namespace, 'Content');
  //     content.businessUnitId = '90023';
  //     content.fileName = 'test.pdf';
  //     content.documentNumber = 'R00001';
  //     content.registeredDate = new Date();

  //     // Create new transaction
  //     const registration = factory.newTransaction(namespace, 'Registration');
  //     registration.content = content;
  //     registration.creator = factory.newRelationship(
  //       namespace,
  //       'DocumentController',
  //       creator.$identifier
  //     );
  //     registration.contentHash = '123123123';

  //     // Submit trasnaction
  //     await businessNetworkConnection.submitTransaction(registration);

  //     // get the object back from network
  //     const contentRegistry = await businessNetworkConnection.getAssetRegistry(
  //       namespace + '.ContentAsset'
  //     );
  //     const newContent = await contentRegistry.get(registration.contentHash);

  //     newContent.contentHash.should.equal(registration.contentHash);
  // 	});
  // });
});
