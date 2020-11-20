const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const awsId = process.env.AWS_ID;
const awsSecret = process.env.AWS_SECRET;
const awsBucket = process.env.AWS_BUCKET;

const s3 = new AWS.S3({
    accessKeyId: awsId,
    secretAccessKey: awsSecret
});

const uploadFile = (uuid, fileName) => {
    return new Promise((resolve, reject) => {

        if (!(path.extname(fileName) === 'mp4' || path.extname(fileName) === 'mov')) {
            reject('invalid extension');
        }

        const fileContent = fs.readFileSync(filename);

        const params = {
            Bucket: awsBucket,
            Key: uuid + '.' + path.extname(filename),
            Body: fileContent
        }

        s3.upload(params, function(err, data) {
            if (err) {
                reject(err);
            }
            resolve(data);
        })
    })
}
