const { listStudents, addStudent, removeUser } = require('../utils/users');

var express = require('express')

var studentRouter = function (caClient, wallet) {
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
            await removeUser(caClient, wallet, req.params.studentId);
            res.redirect('/students');
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })

    return router;
}

module.exports = studentRouter;