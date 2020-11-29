'use strict';

const response = require('../../shared/response');
const shotstack = require('./lib/shotstack');
const edit = require('./lib/edit');

module.exports.submit = async (event) => {
    const data = JSON.parse(event.body);

    try {
        const json = await edit.createJson(data);
        const render = await shotstack.submit(json);
        console.log('Render success');
        return response.format(201, 'success', 'OK', render);
    } catch(err) {
        console.error('Fail: ', err);
        return response.format(400, 'fail', 'Bad Request', err);
    }
};

module.exports.status = async (event) => {
    try {
        const status = await shotstack.status(event.pathParameters.id);
        console.log('Poll success');
        return response.format(201, 'success', 'OK', status);
    } catch (err) {
        console.error('Fail: ', err);
        return response.format(400, 'fail', 'Bad Request', err);
    }
};
