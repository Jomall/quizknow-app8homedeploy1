const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

const corsOptions = {
  origin: process.env.VERCEL ? function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      // Add your production domain here
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/quizknow.*\.vercel\.app$/
    ];

    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else {
        return allowedOrigin.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  } : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Initialize Socket.io only if not in Vercel serverless environment
let io;
if (process.env.VERCEL) {
  console.log('Running in Vercel serverless environment - Socket.io disabled');
} else {
  const server = http.createServer(app);
  io = socketIo(server, {
    cors: corsOptions
  });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow various file types
  const allowedTypes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Make upload available to routes
app.set('upload', upload);

// Database connection
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizknow';
    console.log('Connecting to MongoDB at:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000,
    });
    
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

// Initialize database and routes
async function initializeApp() {
  await connectDB();

  // Ensure indexes are created
  const User = require('./models/User');
  await User.syncIndexes();

  // Import routes after DB connection
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const quizRoutes = require('./routes/quizzes');
  const quizDetailedRoutes = require('./routes/quiz');
  const contentRoutes = require('./routes/content');
  const connectionRoutes = require('./routes/connections');
  const submissionRoutes = require('./routes/submissions');

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/quiz', quizDetailedRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/connections', connectionRoutes);
  app.use('/api/submissions', submissionRoutes);

  // Socket.io for real-time notifications (only if not in Vercel)
  if (io) {
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join-room', (userId) => {
        socket.join(userId);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    // Make io accessible to routes
    app.set('io', io);
  }

  return app;
}

// For Vercel serverless functions
if (process.env.VERCEL) {
  initializeApp().then(() => {
    console.log('App initialized for Vercel');
  }).catch(err => {
    console.error('Failed to initialize app:', err);
  });

  // Export the app for Vercel
  module.exports = app;
} else {
  // For local development
  initializeApp().then((app) => {
    const server = http.createServer(app);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}
