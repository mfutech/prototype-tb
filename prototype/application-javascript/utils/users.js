'use strict';

const adminUserId = 'admin';
const studentRole = 'student';
const teacherRole = 'teacher';

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
		let serviceResponse = await identityService.getAll(adminUser);
		return serviceResponse.result.identities.filter(i => i.attrs.some(a => a.name === 'role' && a.value === role));
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

async function registerAndEnrollUser(caClient, wallet, orgMspId, userId, secret, firstname, lastname, role) {
    try {
		// Check to see if we've already enrolled the user
		const userIdentity = await wallet.get(userId);
		if (userIdentity) {
			console.log(`An identity for the user ${userId} already exists in the wallet`);
			return;
		}

		// Must use an admin to register a new user
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		await caClient.register({
            enrollmentID: userId,
            enrollmentSecret: secret,
            role: 'client',
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
		const enrollment = await caClient.enroll({
			enrollmentID: userId,
            enrollmentSecret: secret,
            attr_reqs: [
                { name: 'role', optional: false }
            ]
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: orgMspId,
			type: 'X.509',
		};
		await wallet.put(userId, x509Identity);
        console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
};

exports.addStudent = async (caClient, wallet, orgMspId, userId, secret, firstname, lastname) => {
	try {
		await registerAndEnrollUser(caClient, wallet, orgMspId, userId, secret, firstname, lastname, studentRole);
	} catch (error) {
		console.error(`Failed to add student : ${error}`);	
	}
};

exports.addTeacher = async (caClient, wallet, orgMspId, userId, secret, firstname, lastname) => {
	try {
		await registerAndEnrollUser(caClient, wallet, orgMspId, userId, secret, firstname, lastname, teacherRole);
	} catch (error) {
		console.error(`Failed to add teacher : ${error}`);	
	}
};

exports.removeUser = async (caClient, wallet, userId) => {
	try {
		// Must use an admin
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// Must use an admin
		const userIdentity = await wallet.get(userId);
		if (userIdentity) {
			console.log('Delete user from wallet');
			await wallet.remove(userId);
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

		const identityService = caClient.newIdentityService();
		await identityService.delete(userId, adminUser);
	} catch (error) {
		console.error(`Failed to list identities : ${error}`);
	}
};