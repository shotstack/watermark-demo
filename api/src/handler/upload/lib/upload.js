const S3 = require('aws-sdk/clients/s3');
const axios = require('axios').default;

const s3 = new S3();
const awsBucket = process.env.AWS_S3_UPLOADS_BUCKET;
const MIN_FILE_SIZE = 10;
const MAX_FILE_SIZE = 2500000000;

/**
 * Use AWS SDK to create pre-signed POST data.
 * We also put a file size limit (1kB - 250MB).
 * @param key
 * @param contentType
 * @returns {Promise<object>}
 */
const createPresignedPost = (key, contentType) => {
    const params = {
        Expires: 60,
        Bucket: awsBucket,
        Conditions: [["content-length-range", MIN_FILE_SIZE, MAX_FILE_SIZE]],
        Fields: {
            "Content-Type": contentType,
            key: key
        }
    }

    return new Promise((resolve, reject) => {
        try {
            s3.createPresignedPost(params, (err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
        } catch (err) {
            reject(err)
        }
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
    createPresignedPost,
    probeVideo
}