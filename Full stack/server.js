const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./models/User');
require('dotenv').config();




const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET;
app.use(express.static('java')); // if your static files are in a 'public' folder
const cors = require('cors');
app.use(cors());


app.use(express.json());
app.use(express.static(path.join(__dirname, 'java'))); // Serve static files from 'java' folder




// MongoDB connection
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Middleware for checking authentication
const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.redirect('/signin');
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.redirect('/signin');
    }
};

// Routes
app.get('/', (req, res) => res.redirect('/signin')); // Default route to redirect to sign-in page
app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'java', 'signin.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'java', 'signup.html')));
app.get('/index.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'java', 'index.html'))); // Serve index.html

app.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Sign-up logic
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Hash the password and save the new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });

    try {
        await newUser.save();
        res.redirect('/signin'); // After successful sign-up, redirect to sign-in page
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Assuming you have a Task model
const Task = require('./models/Task');

// Route to add a task
app.post('/tasks', checkAuth, async (req, res) => {
    const { task, dueDate } = req.body;
    const userId = req.user.userId;

    try {
        const newTask = new Task({ task, dueDate, userId });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add task' });
    }
});
