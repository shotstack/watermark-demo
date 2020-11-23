const S3 = require('aws-sdk/clients/s3');
const uniqid = require("uniqid");
const mime = require("mime");

const awsBucket = process.env.AWS_BUCKET;

/**
 * Use AWS SDK to create pre-signed POST data.
 * We also put a file size limit (1kB - 250MB).
 * @param key
 * @param contentType
 * @returns {Promise<object>}
 */

const createPresignedPost = async (key, contentType) => {
    const s3 = new S3();

    // const s3 = new S3({
    //     accessKeyId: AWS_ID,
    //     secretAccessKey: AWS_SECRET
    // });

    const params = {
        Expires: 60,
        Bucket: awsBucket,
        Conditions: [["content-length-range", 1000, 2500000000]],
        Fields: {
            "Content-Type": contentType,
            key
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

module.exports = {
    createPresignedPost: createPresignedPost
}