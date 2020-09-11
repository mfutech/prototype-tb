'use strict';

const { Gateway } = require('fabric-network');
const { enrollAdmin } = require('./utils/CAUtil.js');
const { enrollUser, addStudent, addTeacher, addSecretariat } = require('./utils/users');
const { getCaClient, getContract, initWallet } = require('./utils/network');
const path = require('path');

const mspOrg1 = 'Org1MSP';

const express = require('express')
var session = require("express-session")
const app = express()
app.use(session({
	secret: 'blockchain :)',
	saveUninitialized: false,
	resave: false
}));
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

// build an instance of the fabric ca services client based on
// the information in the network configuration
const caClient = getCaClient();

// Create a new gateway instance for interacting with the fabric network.
// In a real application this would be done as the backend server session is setup for
// a user that has been verified.
const gateway = new Gateway();

app.get('/', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.locals.user = req.user;
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

app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`)
})

async function main() {
	try {
		// setup the wallet
		const walletPath = path.join(__dirname, 'wallet');
		wallet = await initWallet(walletPath);

		// enroll admin
		await enrollAdmin(caClient, wallet, mspOrg1);

		// register secretariat user
		await addSecretariat(caClient, wallet, 'secretariat@heig-vd.ch', '1234', '', 'Secretariat');

		// register sample professors
		await addTeacher(caClient, wallet, 'albert.einstein@heig-vd.ch', '1234', 'Albert', 'Einstein');
		await addTeacher(caClient, wallet, 'isaac.newton@heig-vd.ch', '1234', 'Isaac', 'Newton');

		// register sample students
		await addStudent(caClient, wallet, 'amel.dussier@heig-vd.ch', '1234', 'Amel', 'Dussier');
		await addStudent(caClient, wallet, 'elyas.dussier@heig-vd.ch', '1234', 'Elays', 'Dussier');

		// get smart contract
		const contract = await getContract('admin');

		// chaincode initialization
		await contract.submitTransaction('InitLedger');
		console.log('Chaincode initialization done');

		// course router
		var courseRouter = require('./routes/courses');
		app.use('/courses', courseRouter(caClient, wallet, gateway));

		// teacher router
		var teacherRouter = require('./routes/teachers');
		app.use('/teachers', teacherRouter(caClient, wallet));

		// student router
		var studentRouter = require('./routes/students');
		app.use('/students', studentRouter(caClient, wallet));

	} catch (error) {
		console.error(error);
	}
}

main();