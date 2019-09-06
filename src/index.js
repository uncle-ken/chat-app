// Node core modules
const path = require ('path')
const http = require('http')

// Npm modules
const express = require ('express')
const socketio = require('socket.io')
const Filter = require('bad-words')

const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
// Setting up socket.io server
const io = socketio(server)

// Defining variable for port by Heroku || 3000 for localhost
const port = process.env.PORT || 3000

// Define paths for Express config
const publicPath = path.join(__dirname, '../public')

// Setup static directory to serve
app.use (express.static(publicPath))

// Socket.io connection 
io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        // Send welcome message to user
        socket.emit('message', generateMessage('Admin', 'Welcome!'))

        // Broadcast an event (sends message to everyone except yourself) to room
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined.`))

        // Send user list and room name when someone joins
        io.to(user.room).emit('roomInfo', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // Receive an event
    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed.')
        }

        // Send an event to all users
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    // Event when user disconnected. Name "disconnect" must not be changed
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomInfo', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })

    // Receive shared location
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, location))
        callback()
    })
})

server.listen(port, () => {
    console.log(`Server up and running on port ${port}!`)
})