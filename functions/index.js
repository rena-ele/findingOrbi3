const functions = require("firebase-functions");
const admin = require('firebase-admin');
const express = require('express'); 
const app = express();

admin.initializeApp();

const config = {
    apiKey: "AIzaSyBHQ9XMqS6PBKbkVJdllGi6FZ0oSgpfhmc",
    authDomain: "finding-orbi-62135.firebaseapp.com",
    projectId: "finding-orbi-62135",
    storageBucket: "finding-orbi-62135.appspot.com",
    messagingSenderId: "847037328536",
    appId: "1:847037328536:web:4e8db11116d06ead4c74ed",
    measurementId: "G-P20L9DPFN3"
  };

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

// getting documents 
app.get('/posts', (req, res) => {
    db
        .collection('posts')
        .orderBy('timeStamp', 'desc')
        .get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    postId: doc.id, 
                    moduleCode: doc.data().moduleCode, 
                    userHandle: doc.data().userHandle, 
                    timeStamp: doc.data().timeStamp
                });
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
})

// creating documents 
app.post('/post', (req, res) => {
    const newPost = {
        moduleCode: req.body.moduleCode, 
        userHandle: req.body.userHandle, 
        timeStamp: new Date().toISOString()
    }; 

    // to persist it in database 
    db
        .collection('posts')
        .add(newPost)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully`})
        })
        .catch(err => {
            res.status(500).json({ error: `something went wrong`}); 
            console.error(err);
        });
});

// sign up route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email, 
        password: req.body.password, 
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,  
    };

    //todo: validate data
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists) {
            return res.status(400).json({ handle: 'this handle is already taken'});
        } else {
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then((idToken) => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            timeStamp: new Date().toISOString(),
            userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch((err) => {
        console.error(err);
        if (err.code === 'auth/email-already-in-use'){
            return res.status(400).json({ email : 'Email is already in use'})
        } else {
            return res.status(500).json({ error: err.code });
        }
    });
});

exports.api = functions.region('asia-southeast1').https.onRequest(app);