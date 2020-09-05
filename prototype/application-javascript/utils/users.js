'use strict';

const adminUserId = 'admin';
const studentRole = 'student';
const teacherRole = 'teacher';
const secretariatRole = 'secretariat';

async function getAllIdentities(caClient, wallet, role) {
	try {
		// Must use an admin
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

		const identityService = caClient.newIdentityService();
		let response = await identityService.getAll(adminUser);
		return response.result.identities
			.filter(i => i.attrs.some(a => a.name === 'role' && a.value === role))
			.map(i => ({
					username: i.id,
					firstname: i.attrs.filter(a => a.name === 'firstname')[0].value,
					lastname: i.attrs.filter(a => a.name === 'lastname')[0].value,
					role: i.attrs.filter(a => a.name === 'role')[0].value
				}));
	} catch (error) {
		console.error(`Failed to list identities : ${error}`);
	}
};

exports.listStudents = async (caClient, wallet) => {
	try {
		return await getAllIdentities(caClient, wallet, studentRole);
	} catch (error) {
		console.error(`Failed to list students : ${error}`);
	}
};

exports.listTeachers = async (caClient, wallet) => {
	try {
		return await getAllIdentities(caClient, wallet, teacherRole);
	} catch (error) {
		console.error(`Failed to list teachers : ${error}`);
	}
};

exports.enrollUser = async (caClient, wallet, orgMspId, username, password) => {

	// Must use an admin
	const adminIdentity = await wallet.get(adminUserId);
	if (!adminIdentity) {
		console.log('An identity for the admin user does not exist in the wallet');
		console.log('Enroll the admin user before retrying');
		return;
	}

	// enroll user
	const enrollment = await caClient.enroll({
		enrollmentID: username,
		enrollmentSecret: password,
		attr_reqs: [
			{ name: 'firstname', optional: false },
			{ name: 'lastname', optional: false },
			{ name: 'role', optional: false }
		]
	});

	// generate identity for wallet
	const x509Identity = {
		credentials: {
			certificate: enrollment.certificate,
			privateKey: enrollment.key.toBytes(),
		},
		mspId: orgMspId,
		type: 'X.509',
	};

	// add identity to wallet
	await wallet.put(username, x509Identity);

	// build a user object for authenticating with the CA
	const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
	const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
	const identityService = caClient.newIdentityService();

	// get user
	let response = await identityService.getOne(username, adminUser);

	console.log(`Successfully enrolled user ${username} and imported it into the wallet`);

	return {
		username: username,
		firstname: response.result.attrs.filter(a => a.name === 'firstname')[0].value,
		lastname: response.result.attrs.filter(a => a.name === 'lastname')[0].value,
		role: response.result.attrs.filter(a => a.name === 'role')[0].value
	};
};

async function registerUser(caClient, wallet, username, password, firstname, lastname, role) {
	try {
		// Must use an admin
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
		const identityService = caClient.newIdentityService();

		// check if user exist
		try {
			let user = await identityService.getOne(username, adminUser);
			if (user) {
				console.error(`User already exist: ${username}`);
				return;
			}
		}
		catch (error) {

		}

		// register new user
		await caClient.register({
			enrollmentID: username,
			enrollmentSecret: password,
			role: 'client',
			maxEnrollments: -1,
			attrs: [
				{
					name: 'firstname',
					value: firstname,
					ecert: true
				},
				{
					name: 'lastname',
					value: lastname,
					ecert: true
				},
				{
					name: 'role',
					value: role,
					ecert: true
				}
			]
		}, adminUser);

		console.log(`Successfully registered user ${username}`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
};

exports.addStudent = async (caClient, wallet, username, password, firstname, lastname) => {
	await registerUser(caClient, wallet, username, password, firstname, lastname, studentRole);
};

exports.addTeacher = async (caClient, wallet, username, password, firstname, lastname) => {
	await registerUser(caClient, wallet, username, password, firstname, lastname, teacherRole);
};

exports.addSecretariat = async (caClient, wallet, username, password, firstname, lastname) => {
	await registerUser(caClient, wallet, username, password, firstname, lastname, secretariatRole);
};

exports.removeUser = async (caClient, wallet, username) => {
	try {
		// Must use an admin
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// delete identity from wallet
		const userIdentity = await wallet.get(username);
		if (userIdentity) {
			console.log('Delete user from wallet');
			await wallet.remove(username);
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
		const identityService = caClient.newIdentityService();

		// delete user
		await identityService.delete(username, adminUser);

	} catch (error) {
		console.error(`Failed to list identities : ${error}`);
	}
};

exports.getUser = async (caClient, wallet, username) => {
	try {
		// Must use an admin
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

		const identityService = caClient.newIdentityService();
		let response = await identityService.getOne(username, adminUser);

		return {
			username: username,
			firstname: response.result.attrs.filter(a => a.name === 'firstname')[0].value,
			lastname: response.result.attrs.filter(a => a.name === 'lastname')[0].value,
			role: response.result.attrs.filter(a => a.name === 'role')[0].value
		};
	}
	catch (error) {
		console.error(`Failed to get identity : ${error}`);
	}
};