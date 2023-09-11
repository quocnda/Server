const express = require("express")
const app = express()
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // You can implement your logic here to allow or deny specific origins.
            // For example, you could allow any origin in development but restrict in production.
            callback(null, origin);
        },
        methods: ["GET", "POST"]
    }
})
var so_room = []
const map = new Map()
const map_in_battle = new Map()
const map_detail_battle = new Map()
const map_current_player = new Map()
const map_logic_battle = new Map()
io.on("connection", (socket) => {
    console.log("User connected ", socket.id)
    socket.on("mess", (data) => {

        socket.broadcast.emit("recieve_mess", data)
    })
    socket.on("set_name_player", (data) => {
        socket.Name = data
    })
    socket.on("set_player_name_for_menu", () => {
        socket.emit("server_send_name", (socket.Name))
    })

    socket.on("create-battle", (name, choosed_card, account) => {
        console.log("choosed_card la", choosed_card)
        var check = true
        for (i in so_room) {
            if (so_room[i] == name) {
                check = false;
                break;
            }
        }
        if (!check) {
            socket.emit("room_datontai")
        }
        else {
            map_detail_battle.set(name, [])
            map_detail_battle.get(name).push(choosed_card)
            so_room = []
            map.clear()
            var map_player_action = new Map()
            map_player_action.set(socket.Name, [])
            socket.join(name)
            socket.Phong = name
            for (const [key, value] of socket.adapter.rooms) {
                if (key != socket.id && value.size < 2) {
                    so_room.push(key)
                    var mang = []
                    var mang1 = []
                    mang1.push(socket.Name)
                    mang1.push(account)
                    mang.push(mang1)
                    map.set(key, mang)
                }
            }
        }
    })
    socket.on("joinbattle", () => {
        io.sockets.emit("sum_room", Array.from(map))
    })
    socket.on("join-battle", (roomname, choosed_card, account) => {
        console.log("choosed card tu nguoi tham gia", choosed_card)
        map_detail_battle.get(roomname).push(choosed_card)
        console.log("detail map battle la", map_detail_battle)
        socket.join(roomname)
        socket.Phong = roomname
        var mang2 = []
        mang2.push(socket.Name)
        mang2.push(account)
        map.get(roomname).push(mang2)
        var tmp = socket.id
        var data = map.get(roomname)
        map_in_battle.set(roomname, data)
        map.delete(roomname)
        map_logic_battle.set(roomname, [[], []])
        map_current_player.set(roomname, socket.Name)
        io.sockets.in(roomname).emit("battle_is_connect", tmp)
    })
    socket.on("bat_su_kien", (mess) => {
        var roomname = socket.Phong
        console.log("da bat dc su kien")
        console.log(mess)
        console.log(socket.Name)
        var name = socket.Name
        io.sockets.in(roomname).emit("tra_lai_mess", mess, name)
    })
    socket.on("get_player_data", () => {
        const data_player = map_in_battle.get(socket.Phong)
        const data_card_player = map_detail_battle.get(socket.Phong)
        console.log(socket.Name)
        socket.emit("server_send_name", data_player)
        socket.emit("name_player", socket.Name)
        socket.emit("card_player", ({ data_card: data_card_player, name: socket.Name, data_player: data_player }))
    })
    socket.on("winnercheck", (winner) => {
        console.log("da nghe dc event")
        console.log("the winner : ", winner)
    })
    socket.on("player_acttack", (acttack_point, mana_point, blood_player, mana_player) => {
        console.log("name who send attack ", socket.Name)
        console.log("attack_point", acttack_point)
        var current_play = map_current_player.get(socket.Phong)
        if (current_play == socket.Name) {
            socket.emit("het_luot_choi")
        }
        else {
            map_current_player.delete(socket.Phong)
            map_current_player.set(socket.Phong, socket.Name)
            var array1 = map_logic_battle.get(socket.Phong)[0]
            var array2 = map_logic_battle.get(socket.Phong)[1]
            if (array1.length == 0) {
                array1.push("acttack")
                array1.push(acttack_point)
                array1.push(blood_player)
                var mana_con_lai = mana_player - mana_point
                array1.push(mana_con_lai)
                array1.push(socket.Name)
            }
            else {
                if (array2.length == 0) {
                    var action = array1[0]
                    if (action == "acttack") {
                        var att1 = array1[1]
                        var blood = array1[2]
                        var mana_remain = array1[3]
                        var name_1 = array1[4]
                        blood -= acttack_point
                        blood_player -= att1
                        if(blood >0 && blood_player >0 ){
                            mana_player -= mana_point
                            mana_remain += 1
                            mana_player += 1
                            console.log("blood1 la ", blood)
                            console.log("blood2 la", blood_player)
                            io.sockets.in(socket.Phong).emit("2_player_attack", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                        }
                        else {
                            const data_player = map_in_battle.get(socket.Phong)
                            if(blood >= blood_player) {
                                console.log("game end ", data_player[0])
                                io.sockets.in(socket.Phong).emit("game_end" ,data_player[0])
                            }
                            else {
                                console.log("game end ", data_player[1])
                                io.sockets.in(socket.Phong).emit("game_end",data_player[1])
                            }
                        }
                    }
                    else if (action == "defensive") {
                        var def1 = array1[1]
                        var blood = array1[2]
                        var mana_remain = array1[3]
                        var name_1 = array1[4]
                        mana_player -= mana_point
                        mana_player += 1
                        mana_remain += 1
                        if (acttack_point <= def1) {
                            io.sockets.in(socket.Phong).emit("defpoint_equal_to_acttackPoint", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                        }
                        else {
                            var damage = acttack_point - def1
                            blood -= damage
                            if(blood >= 0 ){
                                io.sockets.in(socket.Phong).emit("acttackpoint_higher_than_defenpoint", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                            }
                            else {
                                const data_player = map_in_battle.get(socket.Phong)
                                console.log("game end ", data_player[1])
                                io.sockets.in(socket.Phong).emit("game_end" , data_player[1] )
                            }
                        }
                    }
                    map_logic_battle.delete(socket.Phong)
                    map_logic_battle.set(socket.Phong, [[], []])
                }
            }
        }

    })
    socket.on("player_defensive", (defensive_point, mana_point, blood_player, mana_player) => {
        console.log("name who send attack ", socket.Name)
        console.log("attack_point", defensive_point)
        var current_play = map_current_player.get(socket.Phong)
        if (current_play == socket.Name) {
            socket.emit("het_luot_choi")
        }
        else {
            map_current_player.delete(socket.Phong)
            map_current_player.set(socket.Phong, socket.Name)
            var array1 = map_logic_battle.get(socket.Phong)[0]
            var array2 = map_logic_battle.get(socket.Phong)[1]
            if (array1.length == 0) {
                array1.push("defensive")
                array1.push(defensive_point)
                array1.push(blood_player)
                var mana_con_lai = mana_player - mana_point
                array1.push(mana_con_lai)
                array1.push(socket.Name)
            }
            else {
                if (array2.length == 0) {
                    var action = array1[0]
                    if (action == "defensive") {
                        var def1 = array1[1]
                        var blood = array1[2]
                        var mana_remain = array1[3]
                        var name_1 = array1[4]
                        mana_player -= mana_point
                        mana_remain += 1
                        mana_player += 1
                        io.sockets.in(socket.Phong).emit("2_player_defensive", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                        console.log("att1 laf", def1)
                    }
                    else if (action == "acttack") {
                        var att1 = array1[1]
                        var blood = array1[2]
                        var mana_remain = array1[3]
                        var name_1 = array1[4]
                        mana_player -= mana_point
                        mana_player += 1
                        mana_remain += 1
                        if (defensive_point >= att1) {
                            io.sockets.in(socket.Phong).emit("defpoint_equal_to_acttackPoint_", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                        }
                        else {
                            var damage = att1 - defensive_point
                            blood_player -= damage
                            if(blood_player>0) 
                            {
                            io.sockets.in(socket.Phong).emit("acttackpoint_higher_than_defenpoint_", ({ player_name1: name_1, blood_1: blood, mana_1: mana_remain, player_name2: socket.Name, blood_2: blood_player, mana_2: mana_player }))
                            }
                            else {
                                const data_player = map_in_battle.get(socket.Phong)
                                console.log("game end ", data_player[0])
                                io.sockets.in(socket.Phong).emit("game_end",data_player[0])
                            }
                        }
                    }
                    map_logic_battle.delete(socket.Phong)
                    map_logic_battle.set(socket.Phong, [[], []])
                }
            }
        }
    })
    socket.on("disconnect", () => {
        console.log(socket.id, "da ngat ket noi")
        // const data_player = map_in_battle.get(socket.Phong)
        // if(socket.Name == data_player[0][0]) {
        //     io.sockets.in(socket.Phong).emit("game_end_because_disconnect" ,data_player[1])
        // }
        // else {
        //     io.sockets.in(socket.Phong).emit("game_end_because_disconnect" ,data_player[0])
        // }
    })
})
server.listen(process.env.PORT || 3000, () => {
    console.log("server is running")
})