var express = require('express'),
    app = express.createServer(),
    sio = require('socket.io').listen(app);

var userConnections = Object.create(null);
var usersOnline = Object.create(null);

app.listen(7100);

app.get('/user/:username', function (req, res) {
  res.render(__dirname + '/client.ejs', {layout: false, username: req.params.username});
});

function incrConnForUser(username) {
  if(username in userConnections) userConnections[username] += 1;
  else userConnections[username] = 1;
  usersOnline[username] = username;
}

// prevents debug statements from showing up on the console
sio.set('log level', 1);

sio.sockets.on('connection', function (socket) {
  console.log("New socket client connected.");

  socket.emit('user.onlinelist', userConnections);

  socket.on('user.username', function(username) {
    console.log('Making socket join channel: '+username);
    incrConnForUser(username);
    socket.join(username);
    socket.username = username;
    socket.broadcast.emit('user.online',{'username': username});
  });
  
  socket.on('chat.message', function(chat) {
    sio.sockets.in(chat.to).emit('chat.message', {'message': chat.message, 'from': socket.username});
  });

  socket.on('disconnect', function() {
    userConnections[socket.username] -= 1;
    if(userConnections[socket.username] === 0) {
      console.log('User has gone offline: '+socket.username);
      delete userConnections[socket.username];
      delete usersOnline[socket.username];
      socket.leave(socket.username);
      socket.broadcast.emit('user.offline',{'username': socket.username});
    }
  });
});
