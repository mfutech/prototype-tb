'use strict';

const { Contract } = require('fabric-contract-api');

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
            course.docType = 'course';
            await ctx.stub.putState(course.ID, Buffer.from(JSON.stringify(course)));
            console.info(`Course ${course.ID} initialized`);
        }

        // sample grades
        /*const grades = [
            {
                ID: 'MLG_2020',
                Name: 'Machine Learning',
                Teacher: 'albert.einstein@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch'],
                Active: true
            },
            {
                ID: 'CLD_2020',
                Name: 'Cloud Computing',
                Teacher: 'issac.newton@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch', 'elyas.dussier@heig-vd.ch'],
                Active: true
            },
            {
                ID: 'MLG_2019',
                Name: 'Machine Learning',
                Teacher: 'albert.einstein@heig-vd.ch',
                Students: ['amel.dussier@heig-vd.ch'],
                Active: false
            }
        ];
        for (const grade of grades) {
            grade.docType = 'grade';
            await ctx.stub.putState(grade.ID, Buffer.from(JSON.stringify(grade)));
            console.info(`Course ${grade.ID} initialized`);
        }*/
    }

    async ListCourses(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async AddCourse(ctx, acronym, name, year, teacher) {
        const course = {
            ID: acronym + '_' + year,
            Acronym: acronym,
            Year: year,
            Name: name,
            Teacher: teacher,
            Students: [],
            Active: false,
        };
        return ctx.stub.putState(course.ID, Buffer.from(JSON.stringify(course)));
    }

    async EnableCourse(ctx, id) {
        
        // check if course exist
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The course ${id} does not exist`);
        }

        // get course
        let asset = await this.ReadAsset(ctx, id);
        let course = JSON.parse(asset);

        // update course
        const updatedCourse = {
            ID: id,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: course.Students,
            Active: true,
        }
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
    }

    async DisableCourse(ctx, id) {
                
        // check if course exist
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The course ${id} does not exist`);
        }

        // get course
        let asset = await this.ReadAsset(ctx, id);
        let course = JSON.parse(asset);

        // update course
        const updatedCourse = {
            ID: id,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: course.Students,
            Active: false,
        }
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCourse)));
    }

    async RegisterStudent(ctx, courseId, studentId) {
                
        // check if course exist
        const exists = await this.AssetExists(ctx, courseId);
        if (!exists) {
            throw new Error(`The course ${courseId} does not exist`);
        }

        // get course
        let asset = await this.ReadAsset(ctx, courseId);
        let course = JSON.parse(asset);

        // check if student is registered
        if (course.Students.indexOf(studentId) !== -1) {
            throw new Error(`The student ${studentId} is already registered`);
        }

        // update course
        let students = course.Students.slice();
        students.push(studentId);
        const updatedCourse = {
            ID: courseId,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: students,
            Active: course.Active,
        }
        return ctx.stub.putState(courseId, Buffer.from(JSON.stringify(updatedCourse)));
    }

    async UnregisterStudent(ctx, courseId, studentId) {
                
        // check if course exist
        const exists = await this.AssetExists(ctx, courseId);
        if (!exists) {
            throw new Error(`The course ${courseId} does not exist`);
        }

        // get course
        let asset = await this.ReadAsset(ctx, courseId);
        let course = JSON.parse(asset);

        // check if student is registered
        if (course.Students.indexOf(studentId) === -1) {
            throw new Error(`The student ${studentId} is not registered`);
        }

        // update course
        let students = course.Students.filter(s => s !== studentId);
        const updatedCourse = {
            ID: courseId,
            Acronym: course.Acronym,
            Year: course.Year,
            Name: course.Name,
            Teacher: course.Teacher,
            Students: students,
            Active: course.Active,
        }
        return ctx.stub.putState(courseId, Buffer.from(JSON.stringify(updatedCourse)));
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    /*async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedAsset)));
    }*/

    // DeleteAsset deletes an given asset from the world state.
    /*async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }*/

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    /*async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        asset.Owner = newOwner;
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }*/
}

module.exports = PrototypeContract;
