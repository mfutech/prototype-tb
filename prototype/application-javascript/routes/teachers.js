'use strict';

const { listTeachers, addTeacher, removeUser } = require('../utils/users');
const { getContract } = require('../utils/network');

var express = require('express')

/**
 * Router for teacher endpoints
 *
 * @param {FabricCAServices} caClient certification authority client
 * @param {Wallet} wallet identity wallet
 * @param {Gateway} gateway Hyperledger Fabric network gateway
 */
var teacherRouter = function (caClient, wallet, gateway) {
    var router = express.Router();

    /**
     * Check if user is authenticated
     */
    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
        res.locals.user = req.user;
        next();
    })

    /**
     * List all teachers
     */
    router.get('/', async (_, res) => {
        try {
            // check role
            if (req.user.role !== 'secretariat') {
                throw new Error('You are not allowed to access this page');
            }

            const teachers = await listTeachers(caClient, wallet);
            res.render('teachers', { teachers: teachers });
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    /**
     * Redirect to the add student form
     */
    router.get('/add', (_, res) => {
        // check role
        if (req.user.role !== 'secretariat') {
            res.render('error', { error: new Error('You are not allowed to access this page')});
            return;
        }

        res.render('add-teacher');
    })

    /**
     * Adds a new teacher
     */
    router.post('/add', async (req, res) => {
        try {
            // check role
            if (req.user.role !== 'secretariat') {
                throw new Error('You are not allowed to access this page');
            }

            await addTeacher(caClient, wallet, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
            res.redirect('/teachers');
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    /**
     * Deletes a teacher (if not used)
     */
    router.get('/delete/:teacherId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // check if user is referenced
            let result = await contract.evaluateTransaction('CheckIfUserIsReferenced', req.params.teacherId);
            let referenceCheck = JSON.parse(result.toString());
            if (referenceCheck.isReferenced) {
                throw new Error(`This ${referenceCheck.referenceType} has existing references: ${JSON.stringify(referenceCheck.references, null, 2)}`);
            }

            // remove user
            await removeUser(caClient, wallet, req.params.teacherId);
            res.redirect('/teachers');
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    return router;
}

module.exports = teacherRouter;
