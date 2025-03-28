const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000; // Use environment port or default to 3000

// --- Static Middleware FIRST ---
// Serve static files (index.html, client.js, style.css) from the 'public' directory
// This handles requests for /, /client.js, /style.css etc. directly.
app.use(express.static('public'));

// --- In-memory Storage ---
// Replace with a database (e.g., Redis, MongoDB) for production persistence
let games = {}; // { gameId: { phase, expectedPlayers, loggedInPlayers, submittedPlayers, drafts, playerData, creatorSocketId } }

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


// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Game Setup ---
    socket.on('setupGame', (playerNames) => {
        try {
            const gameId = uuidv4().substring(0, 6);
            const expected = playerNames.map(name => name.trim()).filter(name => name.length > 0);

            if (expected.length < 1) {
                socket.emit('errorMsg', 'Please enter at least one player name.');
                return;
            }

            games[gameId] = {
                phase: 'login', expectedPlayers: expected, loggedInPlayers: {},
                submittedPlayers: [], drafts: {}, creatorSocketId: socket.id,
                playerData: playersData // Including player data with the game instance
            };

            console.log(`Game created: ${gameId} by ${socket.id}. Players: ${expected.join(', ')}`);
            socket.join(gameId);
            socket.gameId = gameId; // Store gameId on socket

            socket.emit('gameCreated', { gameId, expectedPlayers: expected });

        } catch (error) {
            console.error("Error setting up game:", error);
            socket.emit('errorMsg', 'Failed to create game.');
        }
    });

    // --- Joining Game ---
    socket.on('requestJoin', ({ gameId, username }) => {
         console.log(`Received requestJoin: gameId=${gameId}, username=${username} from socket ${socket.id}`); // Keep this log
        try {
            const game = games[gameId];
            if (!game) {
                socket.emit('errorMsg', `Game "${gameId}" not found.`); return;
            }
            if (game.phase !== 'login' && game.phase !== 'drafting') {
                socket.emit('errorMsg', `Game not accepting players now (Phase: ${game.phase}).`); return;
            }
            if (!game.expectedPlayers.includes(username)) {
                socket.emit('errorMsg', `Username "${username}" not on player list.`); return;
            }

            const existingSocketId = game.loggedInPlayers[username];
            if (existingSocketId && existingSocketId !== socket.id) {
                 console.log(`User ${username} trying to join again (connected as ${existingSocketId}). Disconnecting old.`);
                 const oldSocket = io.sockets.sockets.get(existingSocketId);
                 if (oldSocket) {
                     oldSocket.emit('forceDisconnect', 'Logged in from another location.');
                     oldSocket.disconnect(true);
                 }
            } else if (existingSocketId === socket.id) {
                 console.log(`User ${username} (${socket.id}) re-requesting join, resending state.`);
                 socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: game.drafts[username] || null });
                 return;
            }

            game.loggedInPlayers[username] = socket.id;
            socket.join(gameId);
            socket.username = username;
            socket.gameId = gameId;

            console.log(`User ${username} (${socket.id}) joined game ${gameId}`);
            const userDraft = game.drafts[username] || null;
            socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: userDraft });

            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));

            if (Object.keys(game.loggedInPlayers).length === game.expectedPlayers.length && game.phase === 'login') {
                game.phase = 'drafting';
                io.to(gameId).emit('gamePhaseChanged', 'drafting');
                console.log(`Game ${gameId} starting - all players in.`);
            }
        } catch (error) {
             console.error(`Error during join request for ${username} in game ${gameId}:`, error);
             socket.emit('errorMsg', 'Error joining game.');
        }
    });

     // --- Draft Update ---
     socket.on('updateDraft', (draftPicks) => {
        try {
            const gameId = socket.gameId; const username = socket.username; const game = games[gameId];
            if (!game || !username || game.phase !== 'drafting' || game.submittedPlayers.includes(username)) return;
            game.drafts[username] = draftPicks;
        } catch (error) { console.error(`Error updating draft for ${username} in game ${gameId}:`, error); }
    });

    // --- Submit Final Draft ---
    socket.on('submitDraft', (finalDraftPicks) => {
        try {
            const gameId = socket.gameId; const username = socket.username; const game = games[gameId];
            if (!game || !username || game.phase !== 'drafting' || game.submittedPlayers.includes(username)) return;

            game.submittedPlayers.push(username);
            game.drafts[username] = finalDraftPicks;
            console.log(`User ${username} submitted final draft for game ${gameId}`);
            socket.emit('submitSuccess');
            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));

            if (game.submittedPlayers.length === game.expectedPlayers.length) {
                game.phase = 'reveal';
                console.log(`Game ${gameId} entering reveal phase.`);
                io.to(gameId).emit('revealAllDrafts', game.drafts);
                io.to(gameId).emit('gamePhaseChanged', 'reveal');
            }
        } catch (error) {
             console.error(`Error submitting draft for ${username} in game ${gameId}:`, error);
             socket.emit('errorMsg', 'Error submitting draft.');
        }
    });

    // --- Handle Disconnect ---
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
        try {
            const gameId = socket.gameId; const username = socket.username;
            if (gameId && games[gameId] && username) {
                 const game = games[gameId];
                 if (game.loggedInPlayers[username] === socket.id) {
                    delete game.loggedInPlayers[username];
                    console.log(`User ${username} removed from loggedInPlayers in game ${gameId}.`);
                    if (game.phase !== 'reveal') {
                         io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));
                    }
                 }
            }
        } catch (error) { console.error(`Error during disconnect handling for ${socket.id}:`, error); }
    });

}); // --- END of io.on('connection', ...) ---


// --- Helper function for Game State ---
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
// This sends index.html for any GET request not handled by express.static
// Allows client-side routing/handling of /game/gameId paths
app.get('*', (req, res) => {
    console.log(`Serving index.html for path: ${req.path}`); // Log which paths hit this
    res.sendFile(__dirname + '/public/index.html');
});


// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});