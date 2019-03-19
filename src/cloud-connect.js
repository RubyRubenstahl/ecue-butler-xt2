const Butler = require('./butler-xt2');
const butler = new Butler({ host: '192.168.123.2' })

var connectionString = 'HostName=krohtools-test.azure-devices.net;DeviceId=butler-xt2;SharedAccessKey=9KBgpVuNxtNNnNRlmnKpXe5x7JOUd6YuZVuId7VJi+A=';

// use factory function from AMQP-specific package
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

// AMQP-specific factory function returns Client object from core package
var client = clientFromConnectionString(connectionString);

// use Message object from core package
var Message = require('azure-iot-device').Message;

var connectCallback = function (err) {
    if (err) {
        console.error('Could not connect: ' + err);
    } else {
        console.log('Client connected');
        var msg = new Message('some data from my device');
    };
};


client.open(connectCallback);

client.on('play_cue', msg => console.log(msg.data.toString()))
client.onDeviceMethod('play_cue', (request, response) => {
    // const payload = JSON.parse(request.payload.toString());
    butler.playCuelist(request.payload.cuelist)
    response.send(200);
}
)


butler.fetchSettings().then(data => {

    client.getTwin().then(twin => {
        twin.properties.reported.update(data, err => {
            if (err) {
                console.log(err)
            }
        });

    })

})
