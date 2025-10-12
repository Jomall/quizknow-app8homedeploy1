const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizknow');

    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      isApproved: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    mongoose.connection.close();
  }
}

createAdminUser();
