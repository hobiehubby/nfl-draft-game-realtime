const express = require('express');
const http = require('http');
const path = require('path'); // <-- Import the 'path' module
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- Static Middleware FIRST ---
// Serve MOST static files (like CSS, maybe images later)
app.use(express.static(path.join(__dirname, 'public'))); // Use path.join for robustness

// --- In-memory Storage ---
let games = {};

// --- Player Data (MUST BE CONSISTENT WITH client.js) ---
const playersData = [
    // QB
    { name: "Carson Beck", position: "QB", school: "Georgia" },
    { name: "Shedeur Sanders", position: "QB", school: "Colorado" },
    { name: "Quinn Ewers", position: "QB", school: "Texas" },
    { name: "Drew Allar", position: "QB", school: "Penn State" },
    { name: "Jalen Milroe", position: "QB", school: "Alabama" },
    { name: "Conner Weigman", position: "QB", school: "Texas A&M" },
    { name: "Riley Leonard", position: "QB", school: "Notre Dame" },
    { name: "Jaxson Dart", position: "QB", school: "Ole Miss" },

    // RB
    { name: "Ollie Gordon II", position: "RB", school: "Oklahoma State" },
    { name: "Quinshon Judkins", position: "RB", school: "Ohio State" },
    { name: "TreVeyon Henderson", position: "RB", school: "Ohio State" },
    { name: "Donovan Edwards", position: "RB", school: "Michigan" },
    { name: "Ashton Jeanty", position: "RB", school: "Boise State" },
    { name: "Damien Martinez", position: "RB", school: "Miami" },
    { name: "Devin Neal", position: "RB", school: "Kansas" },

    // WR
    { name: "Luther Burden III", position: "WR", school: "Missouri" },
    { name: "Tetairoa McMillan", position: "WR", school: "Arizona" },
    { name: "Emeka Egbuka", position: "WR", school: "Ohio State" },
    { name: "Evan Stewart", position: "WR", school: "Oregon" },
    { name: "Isaiah Bond", position: "WR", school: "Texas" },
    { name: "Tez Johnson", position: "WR", school: "Oregon" },
    { name: "Tre Harris", position: "WR", school: "Ole Miss" },
    { name: "Kyren Lacy", position: "WR", school: "LSU" },
    { name: "Dane Key", position: "WR", school: "Kentucky" },
    { name: "Barion Brown", position: "WR", school: "Kentucky" },
    { name: "J. Michael Sturdivant", position: "WR", school: "UCLA"},

    // TE
    { name: "Colston Loveland", position: "TE", school: "Michigan" },
    { name: "Luke Lachey", position: "TE", school: "Iowa" },
    { name: "Mitchell Evans", position: "TE", school: "Notre Dame" },
    { name: "Tyler Warren", position: "TE", school: "Penn State" },
    { name: "Jake Briningstool", position: "TE", school: "Clemson" },
    { name: "Caden Prieskorn", position: "TE", school: "Ole Miss" },

    // OT
    { name: "Will Campbell", position: "OT", school: "LSU" },
    { name: "Kelvin Banks Jr.", position: "OT", school: "Texas" },
    { name: "Jonah Monheim", position: "OT", school: "USC" },
    { name: "Emery Jones Jr.", position: "OT", school: "LSU" },
    { name: "Josh Conerly Jr.", position: "OT", school: "Oregon" },
    { name: "Earnest Greene III", position: "OT", school: "Georgia" },
    { name: "Trey Zuhn III", position: "OT", school: "Texas A&M" },
    { name: "Aireontae Ersery", position: "OT", school: "Minnesota" },
    { name: "Ajani Cornelius", position: "OT", school: "Oregon" },

    // IOL
    { name: "Tyler Booker", position: "IOL", school: "Alabama" },
    { name: "Donovan Jackson", position: "IOL", school: "Ohio State" },
    { name: "Parker Brailsford", position: "IOL", school: "Alabama" },
    { name: "Clay Webb", position: "IOL", school: "Georgia" },
    { name: "Tate Ratledge", position: "IOL", school: "Georgia" },
    { name: "Javontez Spraggins", position: "IOL", school: "Tennessee" },
    { name: "Luke Kandra", position: "IOL", school: "Louisville" },


    // EDGE
    { name: "James Pearce Jr.", position: "EDGE", school: "Tennessee" },
    { name: "Abdul Carter", position: "EDGE", school: "Penn State" },
    { name: "Nic Scourton", position: "EDGE", school: "Texas A&M" },
    { name: "Princely Umanmielen", position: "EDGE", school: "Ole Miss" },
    { name: "Jack Sawyer", position: "EDGE", school: "Ohio State" },
    { name: "JT Tuimoloau", position: "EDGE", school: "Ohio State" },
    { name: "Patrick Payton", position: "EDGE", school: "Florida State" },
    { name: "Dani Dennis-Sutton", position: "EDGE", school: "Penn State" },
    { name: "Kyle Kennard", position: "EDGE", school: "South Carolina" },
    { name: "Landon Jackson", position: "EDGE", school: "Arkansas" },
    { name: "Mykel Williams", position: "EDGE", school: "Georgia" },

    // DL
    { name: "Mason Graham", position: "DL", school: "Michigan" },
    { name: "Deone Walker", position: "DL", school: "Kentucky" },
    { name: "Kenneth Grant", position: "DL", school: "Michigan" },
    { name: "Tyleik Williams", position: "DL", school: "Ohio State" },
    { name: "Howard Cross III", position: "DL", school: "Notre Dame" },
    { name: "Dontay Corleone", position: "DL", school: "Cincinnati" },
    { name: "Walter Nolen", position: "DL", school: "Ole Miss" },
    { name: "Bear Alexander", position: "DL", school: "USC" },
    { name: "Nazir Stackhouse", position: "DL", school: "Georgia" },
    { name: "Maason Smith", position: "DL", school: "LSU" },
    { name: "Tyler Davis", position: "DL", school: "Clemson" },

    // LB
    { name: "Harold Perkins Jr.", position: "LB", school: "LSU" },
    { name: "Danny Stutsman", position: "LB", school: "Oklahoma" },
    { name: "Barrett Carter", position: "LB", school: "Clemson" },
    { name: "Jay Higgins", position: "LB", school: "Iowa" },
    { name: "Smael Mondon Jr.", position: "LB", school: "Georgia" },
    { name: "Jihaad Campbell", position: "LB", school: "Alabama" },
    { name: "Nick Jackson", position: "LB", school: "Iowa" },
    { name: "Jeffrey Bassa", position: "LB", school: "Oregon" },
    { name: "Power Echols", position: "LB", school: "North Carolina" },

    // CB
    { name: "Travis Hunter", position: "WR/CB", school: "Colorado" },
    { name: "Will Johnson", position: "CB", school: "Michigan" },
    { name: "Benjamin Morrison", position: "CB", school: "Notre Dame" },
    { name: "Denzel Burke", position: "CB", school: "Ohio State" },
    { name: "Jabbar Muhammad", position: "CB", school: "Oregon" },
    { name: "Tacario Davis", position: "CB", school: "Arizona" },
    { name: "Sebastian Castro", position: "CB", school: "Iowa" },
    { name: "Ricardo Hallman", position: "CB", school: "Wisconsin" },
    { name: "Cobee Bryant", position: "CB", school: "Kansas" },
    { name: "Woody Washington", position: "CB", school: "Penn State" },
    { name: "Fentrell Cypress II", position: "CB", school: "Florida State" },


    // S
    { name: "Malaki Starks", position: "S", school: "Georgia" },
    { name: "Caleb Downs", position: "S", school: "Ohio State" },
    { name: "Andrew Mukuba", position: "S", school: "Texas" },
    { name: "Billy Bowman Jr.", position: "S", school: "Oklahoma" },
    { name: "Xavier Watts", position: "S", school: "Notre Dame" },
    { name: "Rod Moore", position: "S", school: "Michigan" },
    { name: "Jardin Gilbert", position: "S", school: "LSU" },
    { name: "Malachi Moore", position: "S", school: "Alabama" },
    { name: "Sonny Styles", position: "S", school: "Ohio State" },
];



// --- Explicit Route for client.js (if needed) ---
// Sometimes needed if static middleware has issues with specific paths after SPA routing
// THIS SHOULD COME *AFTER* express.static but *BEFORE* the catch-all '*'
// app.get('/client.js', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'client.js'));
// });
// --- Let's keep this commented out for now, as express.static SHOULD handle it ---


// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    // ... (Keep ALL your existing socket.on(...) handlers here) ...
    console.log(`User connected: ${socket.id}`); // Example log

     socket.on('disconnect', (reason) => {
         console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
         // ... disconnect logic ...
     });
}); // --- END of io.on('connection', ...) ---


// --- Helper function for Game State ---
// ... (Keep your getSanitizedGameState function here) ...
function getSanitizedGameState(gameId) {
    const game = games[gameId];
    if (!game) return null;
    return {
        gameId: gameId, phase: game.phase, expectedPlayers: game.expectedPlayers,
        loggedInUsernames: Object.keys(game.loggedInPlayers),
        submittedPlayers: game.submittedPlayers
    };
}


// --- Catch-all Route LAST ---
// This sends index.html for any GET request not handled by express.static or specific routes above
app.get('*', (req, res) => {
    console.log(`Catch-all: Serving index.html for path: ${req.path}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Use path.join
});


// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});