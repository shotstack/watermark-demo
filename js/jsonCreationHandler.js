const fs = require('fs')

var createJson = function(body){

	return new Promise((resolve, reject) => {

		var x;
		var y;
		var scale;
		var opacity;

		console.log(body.advanced);

		if (body.advanced == true) {
			x = parseFloat(body.offsetX),
			y = parseFloat(body.offsetY),
			scale = parseFloat(body.scale),
			opacity = parseFloat(body.opacity)
		} else {
			scale = 1,
			opacity = 0.5

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

		console.log('x: ' + x);
		console.log('y: ' + y);
		console.log('scale: ' + scale);
		console.log('opacity: ' + opacity);

		fs.readFile('js/watermark.json','utf-8',function(err,data){
			if (err) console.error(err);

			var jj = JSON.parse(data);

			jj.timeline.tracks[0].clips[0].asset.src = body.watermark;
			jj.timeline.tracks[0].clips[0].position = body.position;
			jj.timeline.tracks[0].clips[0].offset.x = x;
			jj.timeline.tracks[0].clips[0].offset.y = y;
			jj.timeline.tracks[0].clips[0].scale = scale;
			jj.timeline.tracks[0].clips[0].opacity = opacity;
			jj.timeline.tracks[1].clips[0].asset.src = body.video;

			var json = JSON.stringify(jj);

			console.log(json);

			return resolve(json);

		});

	})

}

module.exports = {
	createJson: createJson
}