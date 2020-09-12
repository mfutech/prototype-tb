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
                ID: 'e51be259-5960-46d1-8bc5-b587f2ea2227',
                Student: 'amel.dussier@heig-vd.ch',
                Course: 'MLG_2020',
                Value: 6,
                Weight: .5,
                Type: 'Lab'
            },
        ];
        for (const g of grades) {
            let grade = await this.AddGrade(ctx, g.ID, g.Student, g.Course, g.Uuid, g.Value, g.Weight, g.Type);
            logger.info(`Grade ${JSON.stringify(grade)} initialized`);
        }
    }

    async ListGrades(ctx, studentId, courseId) {
        const allResults = [];

        // create partial key to search
        const indexName = 'student~course~grade';
        //const partialKey = await ctx.stub.createCompositeKey(indexName, [studentId, courseId]);

        const iterator = await ctx.stub.getStateByPartialCompositeKey(indexName, [studentId, courseId]);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                logger.error(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async AddGrade(ctx, id, studentId, courseId, value, weight, type) {
		let grade = {
            docType: gradeType,
            ID: id,
			Student: studentId,
            Course: courseId,
			Value: value,
			Weight: weight,
			Type: type
        };
        
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(grade)));

        const indexName = 'student~course~grade';
        const compositeKey = await ctx.stub.createCompositeKey(indexName, [grade.Student, grade.Course, grade.ID]);

		//  Save index entry to state. Only the key name is needed, no need to store a duplicate copy of the marble.
		//  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
		await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));
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
        return ctx.stub.putState(course.ID, Buffer.from(JSON.stringify(course)));
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
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
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
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
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
