const { listStudents, addStudent, removeUser } = require('../utils/users');
const { getContract } = require('../utils/network');

var express = require('express')

var studentRouter = function (caClient, wallet, gateway) {
    var router = express.Router();

    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
        res.locals.user = req.user;
        next();
    })

    // list students
    router.get('/', async (req, res) => {
        try {
            const students = await listStudents(caClient, wallet);
            res.render('students', { students: students });
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    // add student form
    router.get('/add', (req, res) => {
        res.render('add-student');
    })

    // add student
    router.post('/add', async (req, res) => {
        try {
            await addStudent(caClient, wallet, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
            res.redirect('/students');
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    // delete student
    router.get('/delete/:studentId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // check if user is referenced
            let result = await contract.evaluateTransaction('CheckIfUserIsReferenced', req.params.studentId);
            let referenceCheck = JSON.parse(result.toString());
            if (referenceCheck.isReferenced) {
                throw new Error(`This ${referenceCheck.referenceType} has existing references: ${JSON.stringify(referenceCheck.references, null, 2)}`);
            }

            // remove user
            await removeUser(caClient, wallet, req.params.studentId);
            res.redirect('/students');
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

module.exports = studentRouter;