const Menu = require("../models/Menu");
const ensureDBConnection = require("../config/dbGuard");

exports.menuPage = async (req, res) => {
    try {
        await ensureDBConnection();

        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const selectedMenuCategories = req.session && req.session.user && req.session.user.selectedMenuCategories ? req.session.user.selectedMenuCategories : [];
        const search = (req.query.search || "").trim();
        const category = (req.query.category || "").trim();

        let query = { owner: ownerId };
        if (selectedMenuCategories.length > 0) {
            query.category = { $in: selectedMenuCategories };
        }

        const filters = [];
        if(search) {
            filters.push({
                $or: [
                    { category: { $regex: search, $options:"i" }}
                ]
            })
        }
        if (category) {
            filters.push({ category: { $regex: category, $options: "i" } });
        }
        if (filters.length > 0) {
            query.$and = filters;
        }

        const menu = await Menu.find(query).sort({ category: 1 });

        return res.render("menu", {
            menu,
            search,
            category,
            currentPage: "menu",
            selectedMenuCategories: selectedMenuCategories,
            user: req.session.user || null,
        });
    } catch (error) {
        console.error("Error loading menu page:", error);
        return res.status(500).render("menu", {
            menu: [],
            search: "",
            category: "",
            currentPage: "menu",
            selectedMenuCategories: [],
            user: req.session.user || null,
        });
    }
}

exports.addMenu = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        await Menu.create(Object.assign({}, req.body, { owner: ownerId }));
        return res.redirect("/menu");
    } catch (error) {
        console.error("Error adding menu item:", error);
        return res.redirect("/menu");
    }
}

exports.deleteMenu = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/menu');

        await Menu.deleteOne({ _id: id, owner: ownerId });
    } catch (err) {
        console.log("Error fetching deleting Item", err);
    }

    res.redirect('/menu');
}

exports.editMenu = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const selectedMenuCategories = req.session && req.session.user && req.session.user.selectedMenuCategories ? req.session.user.selectedMenuCategories : [];
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/menu');

        const menuItem = await Menu.findOne({ _id: id, owner: ownerId });
        if (!menuItem) return res.redirect('/menu');
        return res.render("editMenu", { menuItem, selectedMenuCategories });
    } catch (err) {
        console.log("Error fetching editing Menu Item", err);
    }

    res.redirect('/menu');
}

exports.updateMenu = async (req, res) => {
    try {
        await ensureDBConnection();
        const ownerId = req.session && req.session.user ? req.session.user.id : null;
        const id = req.body.id || req.params.id;
        if (!id) return res.redirect('/menu');

        const update = {
            name: req.body.name,
            price: req.body.price,
            category: req.body.category
        };

        await Menu.findOneAndUpdate({ _id: id, owner: ownerId }, update, { runValidators: true });
    } catch (err) {
        console.log("Error updating Menu Item", err);
    }

    res.redirect('/menu');
}
