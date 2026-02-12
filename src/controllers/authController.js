const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../config/emailConfig");

exports.loginPage = (req, res) => {
  const error = req.query.error || null;
  res.render("login", { error });
};
exports.registerPage = (req, res) => {
  res.render("register");
};

exports.register = async (req, res) => {
  const { name, email, hotelName, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send("Password do not match");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.send("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name,
    email,
    hotelName,
    password: hashedPassword,
  });

  req.session.user = {
    id: newUser._id,
    name: newUser.name,
    hotelName: newUser.hotelName,
    email: newUser.email,
    selectedRoomTypes: newUser.selectedRoomTypes || [],
    selectedMenuCategories: newUser.selectedMenuCategories || [],
  };
  res.redirect("/dashboard");
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.redirect(`/login?error=${encodeURIComponent("Invalid email or password. Please try again.")}`);

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.redirect(`/login?error=${encodeURIComponent("Invalid email or password. Please try again.")}`);

  req.session.user = { 
    id: user._id, 
    name: user.name, 
    email: user.email,
    hotelName: user.hotelName,
    selectedRoomTypes: user.selectedRoomTypes || [],
    selectedMenuCategories: user.selectedMenuCategories || [],
  };  res.redirect("/dashboard");
};

exports.logout = async (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Could not log out");
      }
      res.redirect("/");
    });
  } else {
    res.redirect("/");
  }
};

// Forgot Password Page
exports.forgotPasswordPage = (req, res) => {
  const message = req.query.message || null;
  const error = req.query.error || null;
  res.render("forgotPassword", { message, error });
};

// Handle Forgot Password Request
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect(`/forgot-password?error=${encodeURIComponent("Email not found")}`);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(email, resetUrl);

    if (emailResult.success) {
      return res.redirect(`/forgot-password?message=${encodeURIComponent("Password reset link has been sent to your email")}`);
    } else {
      return res.redirect(`/forgot-password?error=${encodeURIComponent("Error sending email. Please try again later")}`);
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.redirect(`/forgot-password?error=${encodeURIComponent("An error occurred")}`);
  }
};

// Reset Password Page
exports.resetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;
    const error = req.query.error || null;

    // Check if token is valid
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.render("resetPassword", {
        token: null,
        error: "Token is invalid or has expired",
      });
    }

    res.render("resetPassword", { token, error });
  } catch (error) {
    console.error("Reset password page error:", error);
    res.render("resetPassword", {
      token: null,
      error: "An error occurred",
    });
  }
};

// Handle Password Reset
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.redirect(`/reset-password/${token}?error=${encodeURIComponent("Passwords do not match")}`);
    }

    // Find user with valid token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.redirect(`/reset-password/${token}?error=${encodeURIComponent("Token is invalid or has expired")}`);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.redirect(`/login?message=${encodeURIComponent("Password reset successfully. Please login with your new password")}`);
  } catch (error) {
    console.error("Reset password error:", error);
    res.redirect(`/reset-password/${req.params.token}?error=${encodeURIComponent("An error occurred")}`);
  }
};