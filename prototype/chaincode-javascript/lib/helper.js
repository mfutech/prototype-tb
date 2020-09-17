'use strict';

const { COURSE_TYPE, GRADE_TYPE } = require('./constants');

/**
 * chaincode helper methods
 * these methods are not exposed in the contract
 */

/**
 * Read an asset
 * @param {*} ctx context
 * @param {*} key asset key
 */
exports.ReadAsset = async (ctx, key) => {
    const assetJSON = await ctx.stub.getState(key);
    if (!assetJSON || assetJSON.length === 0) {
        throw new Error(`The asset ${key} does not exist`);
    }
    return JSON.parse(assetJSON.toString());
};

/**
 * Delete an asset
 * @param {*} ctx context
 * @param {*} key asset key
 */
exports.DeleteAsset = async (ctx, key) => {
    const exists = await AssetExists(ctx, key);
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
exports.AssetExists = async (ctx, key) => {
    const assetJSON = await ctx.stub.getState(key);
    return assetJSON && assetJSON.length > 0;
};

/**
 * Returns composite asset keys
 * @param {*} ctx context
 * @param {*} compositeKey the name of the composite key
 * @param {*} partialKeyItems an array of partial keys
 */
exports.GetAssetKeysByPartialKey = async (ctx, compositeKey, partialKeyItems) => {
    const allResults = [];
    const iterator = await ctx.stub.getStateByPartialCompositeKey(compositeKey, partialKeyItems);
    let result = await iterator.next();
    while (!result.done) {
        allResults.push(result.value.key);
        result = await iterator.next();
    }
    return allResults;;
}

/**
 * Get all assets for a given docType
 * @param {*} ctx context
 * @param {*} docType the docType value
 */
exports.QueryAssetsByDocType = async (ctx, docType) => {
    let queryString = {};
    queryString.selector = {};
    queryString.selector.docType = docType;
    return await GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
};

/**
 * Get courses for a teacher
 * @param {*} ctx context
 * @param {*} teacher the id of the teacher
 */
exports.QueryCoursesByTeacher = async (ctx, teacher) => {
    let queryString = {};
    queryString.selector = {};
    queryString.selector.docType = COURSE_TYPE;
    queryString.selector.Teacher = teacher;
    return await GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
};

/**
 * Get grades for a student
 * @param {*} ctx context
 * @param {*} student the id of the teacher
 */
exports.QueryGradesByStudent = async (ctx, student) => {
    let queryString = {};
    queryString.selector = {};
    queryString.selector.docType = GRADE_TYPE;
    queryString.selector.Student = student;
    return await GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
}

/**
 * Get assets for a CouchBD querystring
 * @param {*} ctx context
 * @param {*} queryString the querystring
 */
async function GetQueryResultForQueryString(ctx, queryString) {
    let resultsIterator = await ctx.stub.getQueryResult(queryString);
    return await GetAllResults(resultsIterator, false);
}

/**
 * Get all assets for a given iterator
 * @param {*} iterator the iterator
 * @param {*} isHistory true to include the asset history, false otherwise
 */
async function GetAllResults(iterator, isHistory) {
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
