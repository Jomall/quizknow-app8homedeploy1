const mongoose = require('mongoose');

async function resetDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizknow', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Drop the entire database
    await mongoose.connection.db.dropDatabase();

    console.log('Database dropped successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetDB();
