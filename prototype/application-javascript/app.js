'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, enrollAdmin } = require('./utils/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./utils/AppUtil.js');
const { listStudents, listTeachers, addStudent, addTeacher, removeUser } = require('./utils/users');

const express = require('express')
const app = express()
const port = 3000

const channelName = 'mychannel';
const chaincodeName = 'prototype';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

app.use(express.static('public'));
app.use(express.urlencoded({
	extended: true
}));

app.set('view engine', 'ejs');

// Create a new gateway instance for interacting with the fabric network.
// In a real application this would be done as the backend server session is setup for
// a user that has been verified.
const gateway = new Gateway();

app.get('/', (_, res) => {
	res.render('index');
})

app.get('/courses', async (_, res) => {
	try {
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: 'amel.dussier@heig-vd.ch',
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});
		
		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);

		// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
		// This type of transaction would only be run once by an application the first time it was started after it
		// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
		// an "init" type function.
		console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
		await contract.submitTransaction('InitLedger');
		console.log('*** Result: committed');

		// Let's try a query type operation (function).
		// This will be sent to just one peer and the results will be shown.
		console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
		let result = await contract.evaluateTransaction('GetAllAssets');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		// Now let's try to submit a transaction.
		// This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
		// to the orderer to be committed by each of the peer's to the channel ledger.
		console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
		await contract.submitTransaction('CreateAsset', 'asset13', 'yellow', '5', 'Tom', '1300');
		console.log('*** Result: committed');

		console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
		result = await contract.evaluateTransaction('ReadAsset', 'asset13');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
		result = await contract.evaluateTransaction('AssetExists', 'asset1');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
		await contract.submitTransaction('UpdateAsset', 'asset1', 'blue', '5', 'Tomoko', '350');
		console.log('*** Result: committed');

		console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
		result = await contract.evaluateTransaction('ReadAsset', 'asset1');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		try {
			// How about we try a transactions where the executing chaincode throws an error
			// Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
			console.log('\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error');
			await contract.submitTransaction('UpdateAsset', 'asset70', 'blue', '5', 'Tomoko', '300');
			console.log('******** FAILED to return an error');
		} catch (error) {
			console.log(`*** Successfully caught the error: \n    ${error}`);
		}

		console.log('\n--> Submit Transaction: TransferAsset asset1, transfer to new owner of Tom');
		await contract.submitTransaction('TransferAsset', 'asset1', 'Tom');
		console.log('*** Result: committed');

		console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
		result = await contract.evaluateTransaction('ReadAsset', 'asset1');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
	} finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}

	res.render('courses', { courses: courses });
})

app.get('/students', async (_, res) => {
	const students = await listStudents(caClient, wallet);
	res.render('students', { students: students });
})

app.get('/add-student', (_, res) => {
	res.render('add-student');
})

app.post('/add-student', async (req, res) => {
	await addStudent(caClient, wallet, mspOrg1, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
	res.redirect('/students');
})

app.get('/delete-student/:studentId', async (req, res) => {
	await removeUser(caClient, wallet, req.params.studentId);
	res.redirect('/students');
})

app.get('/teachers', async (_, res) => {
	const teachers = await listTeachers(caClient, wallet);
	res.render('teachers', { teachers: teachers });
})

app.get('/add-teacher', (_, res) => {
	res.render('add-teacher');
})

app.post('/add-teacher', async (req, res) => {
	await addTeacher(caClient, wallet, mspOrg1, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
	res.redirect('/teachers');
})

app.get('/delete-teacher/:teacherId', async (req, res) => {
	await removeUser(caClient, wallet, req.params.teacherId);
	res.redirect('/teachers');
})

app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`)
})

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

// build an in memory object with the network configuration (also known as a connection profile)
const ccp = buildCCPOrg1();

// build an instance of the fabric ca services client based on
// the information in the network configuration
const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

// the wallet to hold the credentials of the application user
let wallet = undefined

async function main() {
	try {
		// setup the wallet
		wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		//await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');
		/*await addStudent(caClient, wallet, mspOrg1, 'amel.dussier@heig-vd.ch', 'toto', 'Amel', 'Dussier');
		let students = await listStudents(caClient, wallet);
		console.log(JSON.stringify(students, null, 2));*/

		/*await addTeacher(caClient, wallet, mspOrg1, 'alain.bron@heig-vd.ch', 'toto', 'Alain', 'Bron');
		let teachers = await listTeachers(caClient, wallet);
		console.log(JSON.stringify(teachers, null, 2));*/

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		// const gateway = new Gateway();

		// try {
		// 	// setup the gateway instance
		// 	// The user will now be able to create connections to the fabric network and be able to
		// 	// submit transactions and query. All transactions submitted by this gateway will be
		// 	// signed by this user using the credentials stored in the wallet.
		// 	await gateway.connect(ccp, {
		// 		wallet,
		// 		identity: org1UserId,
		// 		discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		// 	});

		// 	// Build a network instance based on the channel where the smart contract is deployed
		// 	const network = await gateway.getNetwork(channelName);

		// 	// Get the contract from the network.
		// 	const contract = network.getContract(chaincodeName);

		// 	// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
		// 	// This type of transaction would only be run once by an application the first time it was started after it
		// 	// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
		// 	// an "init" type function.
		// 	console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
		// 	await contract.submitTransaction('InitLedger');
		// 	console.log('*** Result: committed');

		// 	// Let's try a query type operation (function).
		// 	// This will be sent to just one peer and the results will be shown.
		// 	console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
		// 	let result = await contract.evaluateTransaction('GetAllAssets');
		// 	console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		// 	// Now let's try to submit a transaction.
		// 	// This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
		// 	// to the orderer to be committed by each of the peer's to the channel ledger.
		// 	console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
		// 	await contract.submitTransaction('CreateAsset', 'asset13', 'yellow', '5', 'Tom', '1300');
		// 	console.log('*** Result: committed');

		// 	console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
		// 	result = await contract.evaluateTransaction('ReadAsset', 'asset13');
		// 	console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		// 	console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
		// 	result = await contract.evaluateTransaction('AssetExists', 'asset1');
		// 	console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		// 	console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
		// 	await contract.submitTransaction('UpdateAsset', 'asset1', 'blue', '5', 'Tomoko', '350');
		// 	console.log('*** Result: committed');

		// 	console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
		// 	result = await contract.evaluateTransaction('ReadAsset', 'asset1');
		// 	console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		// 	try {
		// 		// How about we try a transactions where the executing chaincode throws an error
		// 		// Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
		// 		console.log('\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error');
		// 		await contract.submitTransaction('UpdateAsset', 'asset70', 'blue', '5', 'Tomoko', '300');
		// 		console.log('******** FAILED to return an error');
		// 	} catch (error) {
		// 		console.log(`*** Successfully caught the error: \n    ${error}`);
		// 	}

		// 	console.log('\n--> Submit Transaction: TransferAsset asset1, transfer to new owner of Tom');
		// 	await contract.submitTransaction('TransferAsset', 'asset1', 'Tom');
		// 	console.log('*** Result: committed');

		// 	console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
		// 	result = await contract.evaluateTransaction('ReadAsset', 'asset1');
		// 	console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		// } finally {
		// 	// Disconnect from the gateway when the application is closing
		// 	// This will close all connections to the network
		// 	gateway.disconnect();
		// }
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();