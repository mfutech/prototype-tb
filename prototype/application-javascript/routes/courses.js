const { getUser, listTeachers } = require('../utils/users');
const { getContract } = require('../utils/network');

var express = require('express')

var courseRouter = function (caClient, wallet, gateway) {
    var router = express.Router();

    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
        res.locals.user = req.user;
        next();
    })

    // list courses
    router.get('/', async (req, res) => {
        let courses = [];

        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // get list of courses
            let result = await contract.evaluateTransaction('ListCourses');
            courses = JSON.parse(result.toString());

            // render view
            res.render('courses', { courses: courses });
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // add course form
    router.get('/add', async (req, res) => {
        // get teachers
        const teachers = await listTeachers(caClient, wallet);

        res.render('add-course', { teachers: teachers });
    })

    // add course
    router.post('/add', async (req, res) => {
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

    // course details
    router.get('/:courseId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // get course
            let result = await contract.evaluateTransaction('GetCourse', req.params.courseId);
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

    // enable course
    router.get('/:courseId/enable', async (req, res) => {
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

    // disable course
    router.get('/:courseId/disable', async (req, res) => {
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

    // register student
    router.post('/:courseId/register', async (req, res) => {
        try {
            // check if student exist
            let student = await getUser(caClient, wallet, req.body.username);
            if (!student) {
                throw new Error(`The student ${req.body.username} does not exist`);
            }

            // get smart contract
            const contract = await getContract(req.user.username);

            // regsiter student
            await contract.submitTransaction('RegisterStudent', req.params.courseId, req.body.username);

            // redirect
            res.redirect('/courses/' + req.params.courseId);
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // unregister student
    router.get('/:courseId/unregister/:studentId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // unregsiter student
            await contract.submitTransaction('UnregisterStudent', req.params.courseId, req.params.studentId);

            // redirect
            res.redirect('/courses/' + req.params.courseId);
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

module.exports = courseRouter;