const { listTeachers, addTeacher, removeUser } = require('../utils/users');

var express = require('express')

var teacherRouter = function (caClient, wallet) {
    var router = express.Router();
     
    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
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
            await removeUser(caClient, wallet, req.params.teacherId);
            res.redirect('/teachers');
        }
        catch (error) {
            res.render('error', { error: error });
        }
    })


    return router;
}

module.exports = teacherRouter;