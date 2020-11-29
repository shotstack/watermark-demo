'use strict';

const fs = require('fs');

const SD_WIDTH = 1024;
const SD_HEIGHT = 576;
const WATERMARK_INDEX = 0;
const VIDEO_INDEX = 1;

const convertPaddingToOffsets = (padding, position) => {
    let xOffset = 0;
    let yOffset = 0;
    let xRatio = 1 - ((SD_WIDTH - padding) / SD_WIDTH)
    let yRatio = 1 - ((SD_HEIGHT - padding) / SD_HEIGHT);

    switch (position) {
        case 'topRight':
            xOffset = -xRatio;
            yOffset = -yRatio;
            break;
        case 'topLeft':
            xOffset = xRatio;
            yOffset = -yRatio;
            break;
        case 'bottomRight':
            xOffset = -xRatio;
            yOffset = yRatio;
            break;
        case 'bottomLeft':
            xOffset = xRatio;
            yOffset = yRatio;
            break;
    }

    return [
        Math.round(xOffset * 1000) / 1000,
        Math.round(yOffset * 1000) / 1000
    ]
}

const createJson = function (body) {
    return new Promise((resolve, reject) => {
        const watermarkUrl = body.watermark;
        const videoUrl = body.video;
        const position = body.position;
        const duration = parseFloat(body.duration) || 15;
        const [x, y] = convertPaddingToOffsets(parseInt(body.padding) || 20, position);
        const scale = parseFloat(body.scale) || 0;
        const opacity = parseFloat(body.opacity) || 0.7;

        fs.readFile(__dirname + '/template.json', 'utf-8', function (err, data) {
            if (err) {
                console.error(err);
                reject(err);
            }

            let jsonParsed = JSON.parse(data);

            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].asset.src = watermarkUrl;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].length = duration;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].position = position;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].offset.x = x;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].offset.y = y;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].scale = scale;
            jsonParsed.timeline.tracks[WATERMARK_INDEX].clips[0].opacity = opacity;
            jsonParsed.timeline.tracks[VIDEO_INDEX].clips[0].asset.src = videoUrl;
            jsonParsed.timeline.tracks[VIDEO_INDEX].clips[0].length = duration;

            const json = JSON.stringify(jsonParsed);

            return resolve(json);
        });
    });
}

module.exports = {
    createJson
}