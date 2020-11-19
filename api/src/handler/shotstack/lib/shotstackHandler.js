const axios = require('axios').default;
const shotstackUrl = process.env.SHOTSTACK_HOST;
const shotstackApiKey = process.env.SHOTSTACK_API_KEY;
const j = require('./watermark.json');

var submit = function(json) {

    return new Promise((resolve, reject) => {
        axios({
            method: 'post',
            url: shotstackUrl + 'render',
            headers: {
                'x-api-key': shotstackApiKey,
                'content-type': 'application/json'            
            },
            data: json
        })
        .then((response) => {
            return resolve(response)
        }, (error) => {
            return reject(error)
        });
    })

}

var status = function(id) {

    return new Promise((resolve, reject) => {
        axios({
            method: 'get',
            url: shotstackUrl + 'render/' + id,
            headers: {
                'x-api-key': shotstackApiKey
            }
        })
        .then((response) => {
            return resolve(response);
        }), (error) => {
            return reject(error);
        }
    })

}

module.exports = {

    submit: submit,
    status: status

}