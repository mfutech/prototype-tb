const { getUser } = require('../utils/users');
const { getContract } = require('../utils/network');
const { v4: uuidv4 } = require('uuid');

var express = require('express')

var gradeRouter = function (caClient, wallet, gateway) {
    var router = express.Router();

    router.use(function auth(req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('../login');
            return;
        }
        res.locals.user = req.user;
        next();
    })

    // list grades
    router.get('/:studentId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // get student
            let student = await getUser(caClient, wallet, req.params.studentId);

            // get grades
            let result = await contract.evaluateTransaction('ListGrades', req.params.studentId);
            let grades = JSON.parse(result.toString());

            // get course ids
            let courseIds = [];
            for (const grade of grades) {
                if (courseIds.indexOf(grade.Course) === -1) {
                    courseIds.push(grade.Course);
                }
            }

            // get courses
            let courses = [];
            for (const courseId of courseIds) {

                // get full course
                let asset = await contract.evaluateTransaction('ReadAsset', courseId);
                let course = JSON.parse(asset.toString());

                // add grades to course
                course.grades = [];
                let average = 0;
                for (const grade of grades) {
                    if (grade.Course === courseId) {
                        course.grades.push(grade);
                        average = average + grade.Value * grade.Weight;
                    }
                }
                course.average = average;

                courses.push(course);
            }

            // render view
            res.render('grades', { student: student, courses: courses });
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // add grade form
    router.get('/:studentId/add/:courseId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // get student
            let student = await getUser(caClient, wallet, req.params.studentId);

            // get course
            let asset = await contract.evaluateTransaction('ReadAsset', req.params.courseId);
            let course = JSON.parse(asset.toString());

            res.render('add-grade', { course: course, student: student });
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // add grade
    router.post('/:studentId/add/:courseId', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // add grade
            const uuid = uuidv4();
            await contract.submitTransaction('AddGrade', uuid, req.params.studentId, req.params.courseId, req.body.value, req.body.weight, req.body.type);

            res.redirect('/courses/' + req.params.courseId);
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // edit grade form
    router.get('/edit/:id', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // get grade
            let gradeAsset = await contract.evaluateTransaction('ReadAsset', req.params.id);
            let grade = JSON.parse(gradeAsset.toString());

            // get student
            let student = await getUser(caClient, wallet, grade.Student);

            // get course
            let courseAsset = await contract.evaluateTransaction('ReadAsset', grade.Course);
            let course = JSON.parse(courseAsset.toString());

            res.render('edit-grade', { course: course, student: student, grade: grade });
        }
        catch (error) {
            res.render('error', { error: error });
        }
        finally {
            gateway.disconnect();
        }
    })

    // edit grade
    router.post('/edit/:id', async (req, res) => {
        try {
            // get smart contract
            const contract = await getContract(req.user.username);

            // add grade
            await contract.submitTransaction('UpdateGrade', req.params.id, req.body.value, req.body.weight, req.body.type);

            res.redirect('/grades/' + req.body.studentId);
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

module.exports = gradeRouter;