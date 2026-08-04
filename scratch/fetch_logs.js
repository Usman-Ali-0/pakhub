const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '143.198.88.163',
  port: 22,
  username: 'root',
  password: 'UsmanAli7401ali'
};

const command = 'docker logs --tail 100 pakhub-api';

conn.on('ready', () => {
  conn.exec(command, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
