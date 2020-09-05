'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, enrollAdmin } = require('./utils/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./utils/AppUtil.js');
const { enrollUser, listStudents, listTeachers, addStudent, addTeacher, addSecretariat, removeUser, getUser } = require('./utils/users');

const mspOrg1 = 'Org1MSP';

const express = require('express')
var session = require("express-session")
const app = express()
app.use(session({ secret: 'blockchain :)' }));
const port = 3000

var passport = require('passport')
	, LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
	async function (username, password, done) {
		try {
			let user = await enrollUser(caClient, wallet, mspOrg1, username, password);
			return done(null, user);
		}
		catch (error) {
			console.error('Login failed for user: ', username);
			return done(null, false);
		}
	}
));
passport.serializeUser(function (user, done) {
	done(null, user);
});
passport.deserializeUser(function (user, done) {
	done(null, user);
});

app.use(express.static('public'));
app.use(express.urlencoded({
	extended: true
}));

app.set('view engine', 'ejs');

// the wallet to hold the credentials of the application users
let wallet = undefined

// delete wallet on application start
const walletPath = path.join(__dirname, 'wallet');
const fs = require('fs');
const deleteFolderRecursive = function (folder) {
	if (fs.existsSync(folder)) {
		fs.readdirSync(folder).forEach((file, index) => {
			const curPath = path.join(folder, file);
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(folder);
	}
};
deleteFolderRecursive(walletPath);

// Create a new gateway instance for interacting with the fabric network.
// In a real application this would be done as the backend server session is setup for
// a user that has been verified.
const gateway = new Gateway();

async function getContract(username) {

	// setup the gateway instance
	// The user will now be able to create connections to the fabric network and be able to
	// submit transactions and query. All transactions submitted by this gateway will be
	// signed by this user using the credentials stored in the wallet.
	await gateway.connect(ccp, {
		wallet,
		identity: username,
		discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
	});

	// Build a network instance based on the channel where the smart contract is deployed
	const network = await gateway.getNetwork('mychannel');

	// Get the contract from the network.
	const contract = network.getContract('prototype');

	return contract;
}

app.get('/', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	res.render('index');
})

app.get('/login', (_, res) => {
	res.render('login');
})

app.post('/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login',
	})
);

app.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login');
});

app.get('/courses', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	let courses = [];

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// get list of courses
		let result = await contract.evaluateTransaction('ListCourses');
		courses = JSON.parse(result.toString());
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}

	// render view
	res.render('courses', { courses: courses });
})

app.get('/enable-course/:courseId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// enable courese
		await contract.submitTransaction('EnableCourse', req.params.courseId);
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}

	// redirect
	res.redirect('/courses');
})

app.get('/disable-course/:courseId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// disable course
		await contract.submitTransaction('DisableCourse', req.params.courseId);
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}

	// redirect
	res.redirect('/courses');
})

app.get('/course-details/:courseId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// get course
		let result = await contract.evaluateTransaction('ReadAsset', req.params.courseId);
		let course = JSON.parse(result.toString());

		// get students
		let students = [];
		for (const student of course.Students) {

			// get user information
			let user = await getUser(caClient, wallet, student);
			students.push(user);
		}

		let teacher = await getUser(caClient, wallet, course.Teacher);

		// render view
		res.render('course-details', { course: course, teacher: teacher, students: students });
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}
})

app.get('/unregister-student/:courseId/:studentId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// unregsiter student
		await contract.submitTransaction('UnregisterStudent', req.params.courseId, req.params.studentId);

		// redirect
		res.redirect('/course-details/' + req.params.courseId);
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}
})

app.post('/register-student', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// regsiter student
		await contract.submitTransaction('RegisterStudent', req.body.courseId, req.body.username);

		// redirect
		res.redirect('/course-details/' + req.body.courseId);
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}
})

app.get('/students', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		const students = await listStudents(caClient, wallet);
		res.render('students', { students: students });
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/add-student', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	res.render('add-student');
})

app.post('/add-student', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		await addStudent(caClient, wallet, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
		res.redirect('/students');
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/delete-student/:studentId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		await removeUser(caClient, wallet, req.params.studentId);
		res.redirect('/students');
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/teachers', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		const teachers = await listTeachers(caClient, wallet);
		res.render('teachers', { teachers: teachers });
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/add-teacher', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	res.render('add-teacher');
})

app.post('/add-teacher', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		await addTeacher(caClient, wallet, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
		res.redirect('/teachers');
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/delete-teacher/:teacherId', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	try {
		await removeUser(caClient, wallet, req.params.teacherId);
		res.redirect('/teachers');
	}
	catch (error) {
		res.render('error', { error: error });
	}
})

app.get('/add-course', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	// get teachers
	const teachers = await listTeachers(caClient, wallet);

	res.render('add-course', { teachers: teachers });
})

app.post('/add-course', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	
	try {
		// get smart contract
		const contract = await getContract(req.user.username);

		// regsiter student
		await contract.submitTransaction('AddCourse', req.body.acronym, req.body.name, req.body.year, req.body.teacher);

		// redirect
		res.redirect('/courses');
	}
	catch (error) {
		res.render('error', { error: error });
	}
	finally {
		gateway.disconnect();
	}
})

app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`)
})

// build an in memory object with the network configuration (also known as a connection profile)
const ccp = buildCCPOrg1();

// build an instance of the fabric ca services client based on
// the information in the network configuration
const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

async function main() {
	try {
		// setup the wallet
		wallet = await buildWallet(Wallets, walletPath);

		// enroll admin
		await enrollAdmin(caClient, wallet, mspOrg1);

		// register and enroll secretariat user
		await addSecretariat(caClient, wallet, 'secretariat@heig-vd.ch', '1234', '', '');
		await enrollUser(caClient, wallet, mspOrg1, 'secretariat@heig-vd.ch', '1234');

		// register and enroll sample professors
		await addTeacher(caClient, wallet, 'albert.einstein@heig-vd.ch', '1234', 'Albert', 'Einstein');
		await enrollUser(caClient, wallet, mspOrg1, 'albert.einstein@heig-vd.ch', '1234');
		await addTeacher(caClient, wallet, 'isaac.newton@heig-vd.ch', '1234', 'Isaac', 'Newton');
		await enrollUser(caClient, wallet, mspOrg1, 'isaac.newton@heig-vd.ch', '1234');

		// register and enroll sample students
		await addStudent(caClient, wallet, 'amel.dussier@heig-vd.ch', '1234', 'Amel', 'Dussier');
		await enrollUser(caClient, wallet, mspOrg1, 'amel.dussier@heig-vd.ch', '1234');
		await addStudent(caClient, wallet, 'elyas.dussier@heig-vd.ch', '1234', 'Elays', 'Dussier');
		await enrollUser(caClient, wallet, mspOrg1, 'elyas.dussier@heig-vd.ch', '1234');

		// get smart contract
		const contract = await getContract('admin');

		// chaincode initialization
		await contract.submitTransaction('InitLedger');
		console.log('Chaincode initialization done');

	} catch (error) {
		console.error(error);
	}
}

main();