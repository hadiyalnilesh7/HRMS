const Room = require("../models/Room");

exports.list = async (req, res) => {
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const selectedRoomTypes = req.session && req.session.user && req.session.user.selectedRoomTypes ? req.session.user.selectedRoomTypes : [];
    const roomNo = (req.query.roomNo || "").trim();
    const roomType = (req.query.roomType || "").trim();
    
    let query = { owner: ownerId };
    if (selectedRoomTypes.length > 0) {
        query.type = { $in: selectedRoomTypes };
    }

    const filters = [];
    if (roomNo) {
        filters.push({ roomNo: { $regex: roomNo, $options: "i" } });
    }
    if (roomType) {
        filters.push({ type: { $regex: roomType, $options: "i" } });
    }
    if (filters.length > 0) {
        query.$and = filters;
    }
    
    const rooms = await Room.find(query).sort({ roomNo: 1 });
    const roomsCount = rooms.length;

    res.render("rooms", {
        rooms,
        currentPage : 'rooms',
        roomsCount,
        selectedRoomTypes: selectedRoomTypes,
        roomNo,
        roomType
    })
}

exports.add = async (req, res) => {
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    await Room.create(Object.assign({}, req.body, { owner: ownerId }));
    res.redirect("/rooms")
}

exports.delete = async (req, res) => {
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const id = req.body.id || req.params.id;
    if (!id) return res.redirect('/rooms');

    try {
        await Room.deleteOne({ _id: id, owner: ownerId });
    } catch (err) {
        console.log("Error fetching deleting Room", err);
    }

    res.redirect('/rooms');
}

exports.edit = async (req, res) => {
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const selectedRoomTypes = req.session && req.session.user && req.session.user.selectedRoomTypes ? req.session.user.selectedRoomTypes : [];
    const id = req.body.id || req.params.id;
    if (!id) return res.redirect('/rooms');

    try {
        const room = await Room.findOne({ _id: id, owner: ownerId });
        if (!room) return res.redirect('/rooms');
        return res.render("editRoom", { room, selectedRoomTypes });
    } catch (err) {
        console.log("Error fetching editing Room", err);
    }

    res.redirect('/rooms');
}

exports.update = async (req, res) => {
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const id = req.body.id || req.params.id;
    if (!id) return res.redirect('/rooms');

    const update = {
        roomNo: req.body.roomNo,
        type: req.body.type,
        pricePerNight: req.body.pricePerNight
    };

    try {
        await Room.findOneAndUpdate({ _id: id, owner: ownerId }, update, { runValidators: true });
    } catch (err) {
        console.log("Error updating Room", err);
    }

    res.redirect('/rooms');
}
