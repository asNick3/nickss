const fs = require('fs');
const http = require('http');
var port = process.env.PORT || 8081;
const path = require('path');
const socketIo = require('socket.io');

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? 'index.html' : req.url;
    filePath = path.join(__dirname, 'public', filePath);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                console.error(err);
            }
        } else {
            let contentType = 'text/html';
            if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
            else if (filePath.endsWith('.obj')) contentType = 'application/octet-stream';
            else if (filePath.endsWith('.js')) contentType = 'application/javascript';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const io = socketIo(server);
const users = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    users[socket.id] = { position: { x: 0, y: 0, z: 0 } };

    // Send the current users to the newly connected user
    socket.emit('currentUsers', users);

    // Broadcast to other users that a new user has joined
    socket.broadcast.emit('userJoined', { id: socket.id, position: users[socket.id].position });

    // Listen for user movements
    socket.on('userMoved', (data) => {
        if  (data != undefined) {
        data.position.y -= 5.5
        users[data.id].position = data?.position;
        socket.broadcast.emit('userMoved', data);
        }
    });

    // Listen for chat messages
    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', { userId: data.userId, message: data.message });
    });

    // Listen for signaling messages from clients
    socket.on('signal', (data) => {
        
        socket.broadcast.emit('signal', data)
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        delete users[socket.id];
        socket.broadcast.emit('userDisconnected', { id: socket.id });
    });
});

server.listen(port, () => {
    console.log('Server is listening on port', server.address().port);
});
