'use strict';

const response = require('../shared/response');
const shotstack = require('./lib/shotstackHandler');
const jc = require('./lib/jsonCreationHandler');

module.exports.submit = async (event, context, callback) => {

    console.log('event: ' + JSON.stringify(event));
    console.log('context: ' + JSON.stringify(context));

    const data = JSON.parse(event.body);

    let json;

    try {
        json = await jc.createJson(data);
    } catch(err) {
        console.error(err);
    }

    try {
        let render = await shotstack.submit(json);
        console.log('Render success');
        callback(null, response.format(201, 'success', 'OK', render.data));
    } catch(err) {
        console.error('Fail: ', err);
        callback(null, response.format(400, 'fail', 'Bad Request', err));
    }

};

module.exports.status = async (event, context, callback) => {
    try {
        let res = await shotstack.status(event.pathParameters.id);
        console.log('Poll success');
        callback(null, response.format(201, 'success', 'OK', res.data));
    } catch (err) {
        console.error('Fail: ', err);
        callback(null, response.format(400, 'fail', 'Bad Request', err));
    }
};