const fs = require('fs');

var createJson = function (body, duration) {

    return new Promise((resolve, reject) => {

        let x;
        let y;
        let scale;
        let opacity;

        if (body.advanced == true) {
            x = parseFloat(body.offsetX);
            y = parseFloat(body.offsetY);
            scale = parseFloat(body.scale);
            opacity = parseFloat(body.opacity);
        } else {
            scale = 1;
            opacity = 0.5;

            if (body.position == 'topRight') {

                x = -0.04;
                y = -0.04;

            } else if (body.position == 'topLeft') {

                x = 0.04;
                y = -0.04;

            } else if (body.position == 'bottomRight') {

                x = -0.04;
                y = 0.04;

            } else if (body.position == 'bottomLeft') {

                x = 0.04;
                y = 0.04;

            }

        }

        fs.readFile(__dirname + '/template.json', 'utf-8', function (err, data) {
            if (err) console.error(err);

            let jsonParsed = JSON.parse(data);

            jsonParsed.timeline.tracks[0].clips[0].asset.src = body.watermark;
            jsonParsed.timeline.tracks[0].clips[0].length = parseFloat(body.duration);
            jsonParsed.timeline.tracks[0].clips[0].position = body.position;
            jsonParsed.timeline.tracks[0].clips[0].offset.x = x;
            jsonParsed.timeline.tracks[0].clips[0].offset.y = y;
            jsonParsed.timeline.tracks[0].clips[0].scale = scale;
            jsonParsed.timeline.tracks[0].clips[0].opacity = opacity;
            jsonParsed.timeline.tracks[1].clips[0].asset.src = body.video;
            jsonParsed.timeline.tracks[1].clips[0].length = parseFloat(body.duration);

            let json = JSON.stringify(jsonParsed);

            return resolve(json);

        });

    });

}

module.exports = {
    createJson: createJson
}