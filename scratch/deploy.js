const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '143.198.88.163',
  port: 22,
  username: 'root',
  password: 'UsmanAli7401ali'
};

const commands = [
  'cd ~/pakhub',
  'git pull',
  'docker compose down',
  'docker compose up -d --build'
];

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(config);
