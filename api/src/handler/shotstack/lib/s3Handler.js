const S3 = require('aws-sdk/clients/s3');
const uniqid = require("uniqid");
const mime = require("mime");
const axios = require('axios').default;

const awsBucket = process.env.AWS_BUCKET;

/**
 * Use AWS SDK to create pre-signed POST data.
 * We also put a file size limit (1kB - 250MB).
 * @param key
 * @param contentType
 * @returns {Promise<object>}
 */

const createPresignedPost = async (key, contentType) => {

    console.log(key);
    console.log(contentType);

    const s3 = new S3();

    const params = {
        Expires: 60,
        Bucket: awsBucket,
        Conditions: [["content-length-range", 10, 2500000000]],
        Fields: {
            "Content-Type": contentType,
            key: key
        }
    }

    return new Promise(async (resolve, reject) => {
        s3.createPresignedPost(params, (err, data) => {
            if (err) {
                reject(err);
                return
            }
            resolve(data);
        });
    });

};

const probeVideo = async (url) => {

    return new Promise((resolve, reject) => {
        axios({
            method: 'post',
            url: 'https://api.shotstack.io/dev/probe/'+url
        })
        .then((response) => {
            return resolve(response)
        }, (error) => {
            return reject(error)
        });
    })

}

module.exports = {
    createPresignedPost: createPresignedPost,
    probeVideo: probeVideo
}