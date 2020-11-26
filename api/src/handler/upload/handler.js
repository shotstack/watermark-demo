'use strict';

const uniqid = require('uniqid');
const response = require('../../shared/response');
const upload = require('./lib/upload');

module.exports.getPresignedPostData = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const presignedPostData = await upload.createPresignedPost(uniqid() + '-' + data.name, data.type);
        return response.format(200, 'success', 'OK', presignedPostData);
    } catch (err) {
        console.error('Fail: ', err);
        return response.format(400, 'fail', 'Bad Request', err);
    }
};
