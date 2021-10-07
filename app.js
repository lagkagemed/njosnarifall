//express setup
import express from 'express';
import * as http from 'http';
import { dirname } from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let app = express();
let serv = http.Server(app);

app.get('/',function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log('Server started.');

let SOCKET_LIST = {}
let GAME_OBJECT = {};
GAME_OBJECT.PLAYER_LIST = {}
GAME_OBJECT.LOCATIONS = []
GAME_OBJECT.ROLLS = []

let io = new Server(serv);

io.sockets.on('connection', function(socket){
    socket.id = Math.random();

    let player = {}
    player.id = socket.id
    player.name = 'Unnamed';
    player.host = false;
    player.location = '';
    player.roll = '';

    sendGameStatus()

    SOCKET_LIST[socket.id] = socket;
    GAME_OBJECT.PLAYER_LIST[player.id] = player;

    console.log('Socket connected!');

    socket.emit('yourStatus', player);

    socket.on('changeName',function(data){
        if (data != '') {
            player.name = data;
        }
        sendGameStatus()
    })

    socket.on('addLocation', function(data){
        if (data != '') {
            if (data != 'superadmin') {
                GAME_OBJECT.LOCATIONS.push(data);
                sendGameStatus()
            } else {
                player.host = true;
                console.log('A player claimed host!');
                sendGameStatus()
            }
        }
    })

    socket.on('addRoll', function(data){
        if (data != '') {
            GAME_OBJECT.ROLLS.push(data);
            sendGameStatus()
        }
    })

    socket.on('newRound', function(){
        if (player.host) {
            let randomSpy = Math.floor(Math.random() * Object.keys(GAME_OBJECT.PLAYER_LIST).length);
            let a = 0;
            let randomLocation = Math.floor(Math.random() * GAME_OBJECT.LOCATIONS.length);
            for (let i in GAME_OBJECT.PLAYER_LIST) {
                if (a == randomSpy) {
                    GAME_OBJECT.PLAYER_LIST[i].location = '???'
                    GAME_OBJECT.PLAYER_LIST[i].roll = 'Njósnari'
                } else {
                    GAME_OBJECT.PLAYER_LIST[i].location = GAME_OBJECT.LOCATIONS[randomLocation];
                    let randomRoll = Math.floor(Math.random() * GAME_OBJECT.ROLLS.length);
                    GAME_OBJECT.PLAYER_LIST[i].roll = GAME_OBJECT.ROLLS[randomRoll];
                }
                a++;
            }
            for (let i in SOCKET_LIST) {
                SOCKET_LIST[i].emit('yourStatus', GAME_OBJECT.PLAYER_LIST[SOCKET_LIST[i].id])
            }
        }
    })

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete GAME_OBJECT.PLAYER_LIST[player.id];
        console.log('Socket disconnected');
        sendGameStatus()
    });
});

function emitAll(msg, data) {
    for (let i in SOCKET_LIST) {
        let socket = SOCKET_LIST[i]
        socket.emit(msg, data)
    }
}

function sendGameStatus() {
    let pack = {}
    pack.PLAYER_LIST = {}
    for (let i in GAME_OBJECT.PLAYER_LIST) {
        let newPlayer = {}
        newPlayer.id = GAME_OBJECT.PLAYER_LIST[i].id
        newPlayer.name = GAME_OBJECT.PLAYER_LIST[i].name
        newPlayer.host = GAME_OBJECT.PLAYER_LIST[i].host
        pack.PLAYER_LIST[newPlayer.id] = newPlayer;
    }
    pack.LOCATIONS = GAME_OBJECT.LOCATIONS
    pack.ROLLS = GAME_OBJECT.ROLLS
    emitAll('gameUpdate', pack);
}