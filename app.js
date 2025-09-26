require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./db"); // MongoDB connection

console.log('👋 Unigram app.js started');

const app = express();

app.use(cors({
  origin: 'https://srmunigram.vercel.app', // frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // if you need to send cookies
}));

// Parse J

// JSON middleware
app.use(express.json());
console.log('✅ express.json middleware loaded');

// Connect to MongoDB
connectDB();

// ------------------
// Routes
// ------------------
try {
  // Auth routes
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes registered');

  // Protected routes
  const protectedRoutes = require("./routes/protectedRoutes");
  app.use("/api/protected", protectedRoutes);
  console.log('✅ Protected routes registered');

  // Posts route (CreatePost)
  const postsRoutes = require('./routes/posts');
  app.use('/api/posts', postsRoutes);
  console.log('✅ Posts routes registered');

  // UniSnap route (new)
  const uniSnapRoutes = require('./routes/unisnap');
  app.use('/api/unisnaps', uniSnapRoutes);
  console.log('✅ UniSnap routes registered');

  // User routes (new)
  const userRoutes = require("./routes/userRoutes");
  app.use("/api", userRoutes);
  console.log('✅ User routes registered');

  const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);
console.log('✅ Notification routes registered');

} catch (err) {
  console.error('❌ Error loading routes:', err.message);
}

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('✅ /uploads static route configured');

// Test route
app.get('/', (req, res) => {
  res.send('Unigram backend is running ✅');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Unigram backend running on port ${PORT}`);
});

