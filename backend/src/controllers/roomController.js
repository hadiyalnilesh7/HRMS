const Room = require("../models/Room");
const ensureDBConnection = require("../config/dbGuard");

exports.list = async (req, res) => {
    try {
        await ensureDBConnection();

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
            filters.push({ type: roomType });
        }
        if (filters.length > 0) {
            query.$and = filters;
        }
        
        const rooms = await Room.find(query).sort({ roomNo: 1 });
        const roomsCount = rooms.length;

        return res.render("rooms", {
            rooms,
            currentPage : 'rooms',
            roomsCount,
            selectedRoomTypes: selectedRoomTypes,
            roomNo,
            roomType,
            user: req.session.user || null,
        })
    } catch (error) {
        console.error("Error loading rooms page:", error);
        return res.status(500).render("rooms", {
            rooms: [],
            currentPage: 'rooms',
            roomsCount: 0,
            selectedRoomTypes: [],
            roomNo: "",
            roomType: "",
            user: req.session.user || null,
        });
    }
}

exports.add = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        await Room.create(Object.assign({}, req.body, { owner: ownerId }));
        return res.redirect("/rooms")
    } catch (error) {
        console.error("Error adding room:", error);
        return res.redirect("/rooms");
    }
}

exports.delete = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/rooms');

        await Room.deleteOne({ _id: id, owner: ownerId });
    } catch (err) {
        console.log("Error fetching deleting Room", err);
    }

    res.redirect('/rooms');
}

exports.edit = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const selectedRoomTypes = req.session && req.session.user && req.session.user.selectedRoomTypes ? req.session.user.selectedRoomTypes : [];
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/rooms');

        const room = await Room.findOne({ _id: id, owner: ownerId });
        if (!room) return res.redirect('/rooms');
        return res.render("editRoom", { room, selectedRoomTypes });
    } catch (err) {
        console.log("Error fetching editing Room", err);
    }

    res.redirect('/rooms');
}

exports.update = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/rooms');

        const update = {
            roomNo: req.body.roomNo,
            type: req.body.type,
            pricePerNight: req.body.pricePerNight
        };

        await Room.findOneAndUpdate({ _id: id, owner: ownerId }, update, { runValidators: true });
    } catch (err) {
        console.log("Error updating Room", err);
    }

    res.redirect('/rooms');
}

exports.markClean = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/dashboard');

        await Room.findOneAndUpdate(
            { _id: id, owner: ownerId, status: "cleaning" }, 
            { status: "available" },
            { runValidators: true }
        );
    } catch (err) {
        console.log("Error marking room as clean", err);
    }

    const referer = req.get('Referrer');
    res.redirect(referer ? referer : '/dashboard');
}

exports.cleaningList = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const roomsNeedingCleaning = await Room.find({ owner: ownerId, status: "cleaning" }).sort({ roomNo: 1 });
        return res.render("room-cleaning", {
            currentPage: 'cleaning',
            roomsNeedingCleaning,
            user: req.session.user || null
        });
    } catch (err) {
        console.log("Error fetching rooms needing cleaning", err);
        return res.status(500).render("room-cleaning", {
            currentPage: 'cleaning',
            roomsNeedingCleaning: [],
            user: req.session.user || null
        });
    }
}