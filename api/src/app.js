require('dotenv').config();

var express = require('express');
var path = require('path');
const shotstack = require('./handler/shotstack/lib/shotstackHandler');
const jc = require('./handler/shotstack/lib/jsonCreationHandler');

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname + '../../../web')));

app.post('/demo/shotstack', async (req, res) => {
    var json;

    try {
        json = await jc.createJson(req.body);
    } catch (err) {
        console.error(err);
    }

    try {
        let render = await shotstack.submit(json);

        res.header("Access-Control-Allow-Origin", "*");
        res.status(201);
        res.send({ status: 'success', message: 'OK', data: render.data });
    } catch (err) {
        console.log(err)
        res.header("Access-Control-Allow-Origin", "*");
        res.status(400);
        res.send({ status: 'fail', message: 'bad request', data: err });
    }

});

app.get('/demo/shotstack/:renderId', async (req, res) => {
    try {
        let render = await shotstack.status(req.params.renderId);

        res.header("Access-Control-Allow-Origin", "*");
        res.status(200);
        res.send({ status: 'success', message: 'OK', data: render.data.response });
    } catch (err) {
        res.header("Access-Control-Allow-Origin", "*");
        res.status(400);
        res.send({ status: 'fail', message: 'bad request', data: err });
    }
});

app.listen(3000, () => console.log("Server running...\n\nOpen http://localhost:3000 in your browser\n"));