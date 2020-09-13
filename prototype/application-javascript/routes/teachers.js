const { listTeachers, addTeacher, removeUser } = require('../utils/users');
const { getContract } = require('../utils/network');

var express = require('express')

var teacherRouter = function (caClient, wallet, gateway) {
    var router = express.Router();

    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
        res.locals.user = req.user;
        next();
    })

    // list teachers
    router.get('/', async (req, res) => {
        try {
            const teachers = await listTeachers(caClient, wallet);
            res.render('teachers', { teachers: teachers });
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    // add teacher form
    router.get('/add', (req, res) => {
        res.render('add-teacher');
    })

    // add teacher
    router.post('/add', async (req, res) => {
        try {
            await addTeacher(caClient, wallet, req.body.email, req.body.password, req.body.firstname, req.body.lastname);
            res.redirect('/teachers');
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    // delete teacher
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