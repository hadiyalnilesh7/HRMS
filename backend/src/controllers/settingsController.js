const User = require("../models/User");

exports.settingsPage = async (req, res) => {
    const userId = req.session && req.session.user ? req.session.user.id : null;
    if (!userId) {
        return res.status(401).redirect('/login');
    }

    try {
        const user = await User.findById(userId);
        res.render('settings', {
            currentPage: 'settings',
            selectedRoomTypes: user.selectedRoomTypes || [],
            selectedMenuCategories: user.selectedMenuCategories || []
        });
    } catch (err) {
        console.log("Error loading settings page", err);
        res.redirect('/dashboard');
    }
}

exports.saveSettings = async (req, res) => {
    const userId = req.session && req.session.user ? req.session.user.id : null;
    if (!userId) {
        return res.status(401).redirect('/login');
    }

    try {
        const roomTypes = Array.isArray(req.body.roomTypes) ? req.body.roomTypes : (req.body.roomTypes ? [req.body.roomTypes] : []);
        const menuCategories = Array.isArray(req.body.menuCategories) ? req.body.menuCategories : (req.body.menuCategories ? [req.body.menuCategories] : []);

        await User.findByIdAndUpdate(userId, {
            selectedRoomTypes: roomTypes,
            selectedMenuCategories: menuCategories
        });

        req.session.user.selectedRoomTypes = roomTypes;
        req.session.user.selectedMenuCategories = menuCategories;

        res.redirect('/settings');
    } catch (err) {
        console.log("Error saving settings", err);
        res.redirect('/dashboard');
    }
}

exports.getSettings = async (req, res) => {
    const userId = req.session && req.session.user ? req.session.user.id : null;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await User.findById(userId);
        res.json({
            selectedRoomTypes: user.selectedRoomTypes || [],
            selectedMenuCategories: user.selectedMenuCategories || []
        });
    } catch (err) {
        console.log("Error fetching settings", err);
        res.status(500).json({ error: 'Error fetching settings' });
    }
}

