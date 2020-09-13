'use strict';

const { Contract } = require('fabric-contract-api');
const shim = require('fabric-shim');
const logger = shim.newLogger('prototype-tb');

// asset types
const courseType = 'course';
const gradeType = 'grade';

// attributes
const roleAttribute = 'role';

// user roles
const studentRole = 'student';
const teacherRole = 'teacher';
const secretariatRole = 'secretariat';

// composite keys
const studentCourseKey = 'student~course';

class PrototypeContract extends Contract {

    // chaincode initialization
    async InitLedger(ctx) {

        // sample courses
        const courses = [
            {
                ID: 'MLG_2020',
                Acronym: 'MLG',
                Year: 2020,
                Name: 'Machine Learning',
                Teacher: 'albert.einstein@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch'],
                Active: true
            },
            {
                ID: 'CLD_2020',
                Acronym: 'CLD',
                Year: 2020,
                Name: 'Cloud Computing',
                Teacher: 'isaac.newton@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch', 'elyas.dussier@heig-vd.ch'],
                Active: true
            },
            {
                ID: 'MLG_2019',
                Acronym: 'MLG',
                Year: 2019,
                Name: 'Machine Learning',
                Teacher: 'albert.einstein@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch'],
                Active: false
            }
        ];
        for (const course of courses) {

            // add course
            course.docType = courseType;
            await ctx.stub.putState(course.ID, Buffer.from(JSON.stringify(course)));

            // add student to course links
            for (const studentId of course.Students) {
                let compositeKey = await ctx.stub.createCompositeKey(studentCourseKey, [studentId, course.ID]);
                await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));
            }

            logger.info(`Course ${course.ID} initialized`);
        }

        // sample grades
        const grades = [
            {
                ID: 'e51be259-5960-46d1-8bc5-b587f2ea2220',
                Student: 'amel.dussier@heig-vd.ch',
                Course: 'MLG_2020',
                Value: 6,
                Weight: .5,
                Type: 'Labo'
            },
            {
                ID: 'e51be259-5960-46d1-8bc5-b587f2ea2221',
                Student: 'amel.dussier@heig-vd.ch',
                Course: 'MLG_2020',
                Value: 4,
                Weight: .5,
                Type: 'Test'
            },
            {
                ID: 'e51be259-5960-46d1-8bc5-b587f2ea2222',
                Student: 'amel.dussier@heig-vd.ch',
                Course: 'MLG_2019',
                Value: 4.5,
                Weight: .5,
                Type: 'Labo'
            },
            {
                ID: 'e51be259-5960-46d1-8bc5-b587f2ea2223',
                Student: 'amel.dussier@heig-vd.ch',
                Course: 'MLG_2019',
                Value: 3,
                Weight: .5,
                Type: 'Test'
            }
        ];
        for (const grade of grades) {

            // add grade
            grade.docType = gradeType;
            await ctx.stub.putState(grade.ID, Buffer.from(JSON.stringify(grade)));

            logger.info(`Grade ${grade.ID} initialized`);
        }
    }

    /**
     * List all grades for a student
     * The grades returned depend on the identity of the caller
     * @param {*} ctx context
     * @param {*} studentId id of the student
     */
    async ListGrades(ctx, studentId) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        const userId = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');
        if (role === studentRole && studentId !== userId) {
            throw new Error(`Your role (${role}) does not allow you to access the grades of the student ${studentId}`);
        }
        logger.info(`Listing grades for user: ${userId}`);

        let grades = [];
        if (role === teacherRole) {
            // todo return only grades for courses of the calling teacher
            let assets = await this.QueryGradesByStudent(ctx, studentId);
            grades = assets.map(a => a.Record);
        }
        else {
            // return all student grades
            let assets = await this.QueryGradesByStudent(ctx, studentId);
            grades = assets.map(a => a.Record);
        }

        logger.info(`Returning grades: ${JSON.stringify(grades)}`);
        return grades;
    }

    /**
     * Add a grade to a student for a course
     * @param {*} ctx context
     * @param {*} id grade id
     * @param {*} studentId id of the student
     * @param {*} courseId id of the course
     * @param {*} value grade value (0.0 to 6.0)
     * @param {*} weight grade weight (0.1 to 1.0)
     * @param {*} type grade type (Labo, Test or Exam)
     */
    async AddGrade(ctx, id, studentId, courseId, value, weight, type) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== teacherRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if course exist
        const exists = await this.AssetExists(ctx, courseId);
        if (!exists) {
            throw new Error(`The course ${courseId} does not exist`);
        }

        // get course
        let courseAsset = await this.ReadAsset(ctx, courseId);
        let course = JSON.parse(courseAsset);

        // check if course is active
        if (!course.Active) {
            throw new Error(`You are not allowed to add a grade for an inactive course`);
        }

        // add grade
		let grade = {
            ID: id,
            docType: gradeType,
			Student: studentId,
            Course: courseId,
			Value: value,
			Weight: weight,
			Type: type
        };
        logger.info(`Adding grade: ${JSON.stringify(grade)}`);
        return await ctx.stub.putState(grade.ID, Buffer.from(JSON.stringify(grade)));
    }

    /**
     * Edit a grade
     * @param {*} ctx context
     * @param {*} id grade id
     * @param {*} value grade value (0.0 to 6.0)
     * @param {*} weight grade weight (0.1 to 1.0)
     * @param {*} type grade type (Labo, Test or Exam)
     */
    async UpdateGrade(ctx, id, value, weight, type) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        const userId = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');
        if (role !== teacherRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if grade exist
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The grade ${id} does not exist`);
        }

        // get current grade
        let gradeAsset = await this.ReadAsset(ctx, id);
        let grade = JSON.parse(gradeAsset);

        // get course
        let courseAsset = await this.ReadAsset(ctx, grade.Course);
        let course = JSON.parse(courseAsset);

        // check if course is active
        if (!course.Active) {
            throw new Error(`You are not allowed to edit a grade for an inactive course`);
        }

        // check if user is teaching the course
        if (!course.Teacher === userId) {
            throw new Error(`You are only allowed to edit a grade for course you teach`);
        }

        // update grade
		let updatedGrade = {
            ID: id,
            docType: gradeType,
			Student: grade.Student,
            Course: grade.Course,
			Value: value,
			Weight: weight,
			Type: type
        };
        logger.info(`Updating grade: ${JSON.stringify(updatedGrade)}`);
        return await ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedGrade)));
	}

    /**
     * Check if a user is referenced in the ledger, as student or teacher
     * @param {*} ctx context
     * @param {*} userId the id of the student or teacher
     */
    async CheckIfUserIsReferenced(ctx, userId) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if user is a registered student
        let assetKeys = await this.GetAssetKeysByPartialKey(ctx, studentCourseKey, [userId]);
        if (assetKeys.length > 0) {
            logger.info(`Student references found: ${JSON.stringify(assetKeys)}`);
            return { isReferenced: true, referenceType: studentRole, references: assetKeys };
        }

        // check if user teaches a course
        let assets = await this.QueryCoursesByTeacher(ctx, userId);
        if (assets.length > 0) {
            logger.info(`Teacher references found: ${JSON.stringify(assets)}`);
            return { isReferenced: true, referenceType: teacherRole, references: assets.map(a => a.Key) };
        }

        return { isReferenced: false };
    }

    /**
     * List all courses
     * The courses returned depend on the identity of the caller
     * @param {*} ctx context
     */
    async ListCourses(ctx) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        const userId = ctx.clientIdentity.getAttributeValue('hf.EnrollmentID');
        logger.info(`Listing courses for user: ${userId}`);

        let courses = [];
        if (role === secretariatRole) {
            // return all courses
            let assets = await this.QueryAssetsByDocType(ctx, courseType);
            courses = assets.map(a => a.Record);
        }
        else if (role === teacherRole) {
            // return only courses having the calling user as teacher
            let assets = await this.QueryCoursesByTeacher(ctx, userId);
            courses = assets.map(a => a.Record);
        }
        else {
            // return only courses having the calling user as student

            // get assets using the composite student to course key
            let assetKeys = await this.GetAssetKeysByPartialKey(ctx, studentCourseKey, [userId]);
            for (const assetKey of assetKeys) {

                // get the course key
                let objectType;
                let attributes;
                (
                    {objectType, attributes} = await ctx.stub.splitCompositeKey(assetKey)
                );
                let courseKey = attributes[1];

                // get the course
                let asset = await this.ReadAsset(ctx, courseKey);
                let course = JSON.parse(asset);

                courses.push(course);
            }
        }

        logger.info(`Returning courses: ${JSON.stringify(courses)}`);
        return courses;
    }

    /**
     * Returns composite asset keys
     * @param {*} ctx context
     * @param {*} compositeKey the name of the composite key
     * @param {*} partialKeyItems an array of partial keys
     */
    async GetAssetKeysByPartialKey(ctx, compositeKey, partialKeyItems) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey(compositeKey, partialKeyItems);
        let result = await iterator.next();
        while (!result.done) {
            allResults.push(result.value.key);
            result = await iterator.next();
        }
        return allResults;
    }

    /**
     * Add a new course
     * @param {*} ctx context
     * @param {*} acronym course acronym (e.g. MLG)
     * @param {*} name course name (e.g. Machine Learning)
     * @param {*} year year the course starts (e.g. 2020)
     * @param {*} teacher id of the teacher
     */
    async AddCourse(ctx, acronym, name, year, teacher) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // add course
        const course = {
            ID: acronym + '_' + year,
            docType: courseType,
            Acronym: acronym,
            Year: year,
            Name: name,
            Teacher: teacher,
            Students: [],
            Active: false,
        };
        logger.info(`Adding course: ${JSON.stringify(course)}`);
        return await ctx.stub.putState(course.ID, Buffer.from(JSON.stringify(course)));
    }

    /**
     * Enables a course
     * @param {*} ctx context
     * @param {*} id id of the course to enable
     */
    async EnableCourse(ctx, id) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if course exist
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The course ${id} does not exist`);
        }

        // get current course
        let asset = await this.ReadAsset(ctx, id);
        let course = JSON.parse(asset);

        // update course
        const updatedCourse = {
            ID: id,
            docType: course.docType,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: course.Students,
            Active: true,
        }
        logger.info(`Enabling course: ${JSON.stringify(updatedCourse)}`);
        return await ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
    }

    /**
     * Disables a course
     * @param {*} ctx context
     * @param {*} id id of the course to enable
     */
    async DisableCourse(ctx, id) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if course exist
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The course ${id} does not exist`);
        }

        // get current course
        let asset = await this.ReadAsset(ctx, id);
        let course = JSON.parse(asset);

        // update course
        const updatedCourse = {
            ID: id,
            docType: course.docType,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: course.Students,
            Active: false,
        }
        logger.info(`Disabling course: ${JSON.stringify(updatedCourse)}`);
        return await ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
    }

    /**
     * Register a student for a course
     * @param {*} ctx context
     * @param {*} courseId id of the course
     * @param {*} studentId id of the student to register
     */
    async RegisterStudent(ctx, courseId, studentId) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if course exist
        const exists = await this.AssetExists(ctx, courseId);
        if (!exists) {
            throw new Error(`The course ${courseId} does not exist`);
        }

        // get current course
        let asset = await this.ReadAsset(ctx, courseId);
        let course = JSON.parse(asset);

        // check if student is registered
        if (course.Students.indexOf(studentId) !== -1) {
            throw new Error(`The student ${studentId} is already registered`);
        }

        logger.info(`Registering student ${studentId} for course ${courseId}`);

        // update course
        let students = course.Students.slice();
        students.push(studentId);
        const updatedCourse = {
            ID: courseId,
            docType: course.docType,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: students,
            Active: course.Active,
        }
        logger.info(`Updating course: ${JSON.stringify(updatedCourse)}`);
        await ctx.stub.putState(courseId, Buffer.from(JSON.stringify(updatedCourse)));

        // add student to course link
        const compositeKey = await ctx.stub.createCompositeKey(studentCourseKey, [studentId, courseId]);
        logger.info(`Adding composite key: ${compositeKey}`);
		await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));
    }

    /**
     * Unregister a student from a course
     * @param {*} ctx context
     * @param {*} courseId id of the course
     * @param {*} studentId id of the student to unregister
     */
    async UnregisterStudent(ctx, courseId, studentId) {

        // check role
        const role = ctx.clientIdentity.getAttributeValue(roleAttribute);
        if (role !== secretariatRole) {
            throw new Error(`Your role (${role}) does not allow you to perform this action`);
        }

        // check if course exist
        const exists = await this.AssetExists(ctx, courseId);
        if (!exists) {
            throw new Error(`The course ${courseId} does not exist`);
        }

        // get current course
        let asset = await this.ReadAsset(ctx, courseId);
        let course = JSON.parse(asset);

        // check if student is registered
        if (course.Students.indexOf(studentId) === -1) {
            throw new Error(`The student ${studentId} is not registered`);
        }

        logger.info(`Unregistering student ${studentId} from course ${courseId}`);

        // update course
        let students = course.Students.filter(s => s !== studentId);
        const updatedCourse = {
            ID: courseId,
            docType: course.docType,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: students,
            Active: course.Active,
        }
        logger.info(`Updating course: ${JSON.stringify(updatedCourse)}`);
        await ctx.stub.putState(courseId, Buffer.from(JSON.stringify(updatedCourse)));

        // delete student to course link
        const compositeKey = await ctx.stub.createCompositeKey(studentCourseKey, [studentId, courseId]);
        logger.info(`Removing composite key: ${compositeKey}`);
		await this.DeleteAsset(ctx, compositeKey);
    }

    /**
     * Read an asset
     * @param {*} ctx context
     * @param {*} key asset key
     */
    async ReadAsset(ctx, key) {
        const assetJSON = await ctx.stub.getState(key); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${key} does not exist`);
        }
        return assetJSON.toString();
    }

    /**
     * Delete an asset
     * @param {*} ctx context
     * @param {*} key asset key
     */
    async DeleteAsset(ctx, key) {
        const exists = await this.AssetExists(ctx, key);
        if (!exists) {
            throw new Error(`The asset ${key} does not exist`);
        }
        return ctx.stub.deleteState(key);
    }

    /**
     * Check if an asset exist
     * @param {*} ctx context
     * @param {*} key asset key
     */
    async AssetExists(ctx, key) {
        const assetJSON = await ctx.stub.getState(key);
        return assetJSON && assetJSON.length > 0;
    }

    /**
     * Get all assets for a given docType
     * @param {*} ctx context
     * @param {*} docType the docType value
     */
	async QueryAssetsByDocType(ctx, docType) {
		let queryString = {};
		queryString.selector = {};
        queryString.selector.docType = docType;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    /**
     * Get courses for a teacher
     * @param {*} ctx context
     * @param {*} teacher the id of the teacher
     */
	async QueryCoursesByTeacher(ctx, teacher) {
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = courseType;
        queryString.selector.Teacher = teacher;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    /**
     * Get grades for a student
     * @param {*} ctx context
     * @param {*} student the id of the teacher
     */
    async QueryGradesByStudent(ctx, student) {
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = gradeType;
        queryString.selector.Student = student;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    /**
     * Get assets for a CouchBD querystring
     * @param {*} ctx context
     * @param {*} queryString the querystring
     */
    async GetQueryResultForQueryString(ctx, queryString) {
		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		return await this.GetAllResults(resultsIterator, false);
    }

    /**
     * Get all assets for a given iterator
     * @param {*} iterator the iterator
     * @param {*} isHistory true to include the asset history, false otherwise
     */
	async GetAllResults(iterator, isHistory) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.tx_id;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}
}

module.exports = PrototypeContract;
