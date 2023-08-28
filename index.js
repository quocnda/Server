const express = require("express")
const app = express()
const http = require("http")
const {Server} = require("socket.io")
const cors = require("cors")
const { data } = require("autoprefixer")
app.use(cors())
const server = http.createServer(app)

const io = new Server(server , {
    cors : {
        origin: "http://localhost:5173",
        methods: ["GET","POST"]
    }
})
var so_room = []
const map = new Map()

io.on("connection" , (socket) => {
    console.log("User connected " , socket.id)
    socket.on("mess" , (data) => {
        
        socket.broadcast.emit("recieve_mess",data)
    })
    socket.on("set_name_player" , (data) => {
        socket.emit("set_name_is_ok",data)
    })
    socket.on("create-battle" , (name) => {
        var check  = true
        for ( i in so_room) {
            if (so_room[i]==name) {
                check=false;
                break;
            }
        }
        if(!check) {
            socket.emit("room_datontai")
        }
        else {
        so_room = []
        map.clear()
        socket.join(name)
        socket.Phong = name
        for (const [key,value] of socket.adapter.rooms) {
            if (key != socket.id && value.size < 2) {
                so_room.push(key)
                var mang = []
                mang.push(socket.id)
                map.set(key,mang)
            }
        }
    }
        
    })
    socket.on("joinbattle" , () => {
        io.sockets.emit("sum_room" , Array.from(map))
    })
    socket.on("join-battle",(roomname) => {
        socket.join(roomname)
        socket.Phong = roomname
        map.get(roomname).push(socket.id)
        var tmp = map.get(roomname)
        console.log(  "tmp la ",tmp[0])
        io.sockets.in(roomname).emit("battle_is_connect",tmp)
    })
    socket.on("bat_su_kien", (mess) => {
        var roomname = socket.Phong
        console.log("da bat dc su kien")
        console.log(mess)
        io.sockets.in(roomname).emit("tra_lai_mess" , mess)
    })
})
server.listen(process.env.PORT || 3000,() => {
    console.log("server is running")
})