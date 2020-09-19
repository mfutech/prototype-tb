'use strict';

/**
 * Main application
 */

const { Gateway } = require('fabric-network');
const { enrollAdmin } = require('./utils/CAUtil.js');
const { enrollUser, addStudent, addTeacher, addSecretariat } = require('./utils/users');
const { getCaClient, getContract, initWallet } = require('./utils/network');

/**
 * Hyperledger Fabric organization name
 */
const mspOrg1 = 'Org1MSP';

/**
 * Wallet to store the application users
 */
let wallet = undefined

/**
 * Client to interact with the Hyperledger Fabric certification authority
 */
const caClient = getCaClient();

/**
 * Gateway instance for interacting with the Hyperledger Fabric network
 */
const gateway = new Gateway();

/**
 * Express.js and session configuration
 */
const express = require('express')
var session = require("express-session")
const app = express()
const port = 3000

app.use(session({
	secret: 'blockchain :)',
	saveUninitialized: false,
	resave: false
}));

app.use(express.static('public'));
app.use(express.urlencoded({
	extended: true
}));

/**
 * Flash message configuration for authentication failures
 */
var flash = require('connect-flash');
app.use(flash());

/**
 * Passport.js configuration
 */
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
			return done(null, false, { message: 'Bad username or password' });
		}
	}
));
passport.serializeUser(function (user, done) {
	done(null, user);
});
passport.deserializeUser(function (user, done) {
	done(null, user);
});

/**
 * EJS view engine configuration
 */
app.set('view engine', 'ejs');

/**
 * Home page
 */
app.get('/', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.locals.user = req.user;
	res.render('index');
})

/**
 * Login page
 */
app.get('/login', (req, res) => {
	// add authentication error (if any)
	res.locals.error = req.flash('error');
	res.render('login');
})

/**
 * Authentication request
 */
app.post('/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login',
		failureFlash: true
	})
);

/**
 * Logout
 */
app.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login');
});

/**
 * Main
 */
async function main() {

	// initialize the wallet
	wallet = await initWallet();

	// enroll admin
	await enrollAdmin(caClient, wallet, mspOrg1);

	// register secretariat user
	await addSecretariat(caClient, wallet, 'secretariat@heig-vd.ch', 'Pass123', 'Secretariat', 'HEIG-VD');

	// register sample professors
	await addTeacher(caClient, wallet, 'minnie.mouse@heig-vd.ch', 'Pass123', 'Minnie', 'Mouse');
	await addTeacher(caClient, wallet, 'daisy.duck@heig-vd.ch', 'Pass123', 'Daisy', 'Duck');
	await addTeacher(caClient, wallet, 'mulan.fa@heig-vd.ch', 'Pass123', 'Mulan', 'Fa');
	await addTeacher(caClient, wallet, 'snow.white@heig-vd.ch', 'Pass123', 'Snow', 'White');
	await addTeacher(caClient, wallet, 'tinker.bell@heig-vd.ch', 'Pass123', 'Tinker', 'Bell');

	// register sample students
	await addStudent(caClient, wallet, 'amel.dussier@heig-vd.ch', 'Pass123', 'Amel', 'Dussier');
	await addStudent(caClient, wallet, 'elyas.dussier@heig-vd.ch', 'Pass123', 'Elyas', 'Dussier');
	await addStudent(caClient, wallet, 'jade.dussier@heig-vd.ch', 'Pass123', 'Jade', 'Dussier');

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
	app.use('/teachers', teacherRouter(caClient, wallet, gateway));

	// student router
	var studentRouter = require('./routes/students');
	app.use('/students', studentRouter(caClient, wallet, gateway));

	// grade router
	var gradeRouter = require('./routes/grades');
	app.use('/grades', gradeRouter(caClient, wallet, gateway));

	// start web server
	app.listen(port, () => {
		console.log(`Listening at http://localhost:${port}`)
	})
}
main();
