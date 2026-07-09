const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isVercel = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
const uploadRoot = isVercel
  ? path.join(os.tmpdir(), "hrms", "uploads", "idproof")
  : path.join(__dirname, "../../../frontend/public/uploads/idproof");

function safeSegment(value) {
  return String(value || "unknown")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "unknown";
}

// Configure multer for ID proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create folder per user
    const userName = safeSegment(req.session && req.session.user ? req.session.user.name : 'unknown');
    const uploadDir = path.join(uploadRoot, userName);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const customerName = safeSegment(req.body && req.body.customerName ? req.body.customerName : 'unknown');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, customerName + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    }
  }
});

module.exports = upload;
