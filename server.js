const express = require('express');
const http = require('http');
const path = require('path'); // Use path module
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- Static Middleware FIRST ---
// Serve static files (index.html, client.js, style.css) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- In-memory Storage ---
let games = {}; // { gameId: { phase, expectedPlayers, loggedInPlayers, submittedPlayers, drafts, playerData, creatorSocketId } }

// --- Player Data (MUST BE CONSISTENT WITH client.js) ---
// REPLACE THIS EXAMPLE WITH YOUR FULL PLAYER LIST
const playersData = [
    // QB
    { name: "Carson Beck", position: "QB", school: "Georgia" },
    { name: "Shedeur Sanders", position: "QB", school: "Colorado" },
    // ... Add ALL your players here ...
    { name: "Sonny Styles", position: "S", school: "Ohio State" },
];


// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`); // Log basic connection

    // --- Game Setup ---
    socket.on('setupGame', (playerNames) => {
        console.log(`DEBUG: Received 'setupGame' event from ${socket.id} with names:`, playerNames); // Log reception
        try {
            const gameId = uuidv4().substring(0, 6);
            const expected = playerNames.map(name => name.trim()).filter(name => name.length > 0);

            if (expected.length < 1) {
                console.log(`DEBUG: Invalid setup attempt by ${socket.id} - no players provided.`);
                socket.emit('errorMsg', 'Please enter at least one player name.');
                return;
            }

            games[gameId] = {
                phase: 'login', expectedPlayers: expected, loggedInPlayers: {},
                submittedPlayers: [], drafts: {}, creatorSocketId: socket.id,
                playerData: playersData // Store player data with the game
            };

            console.log(`Game created: ${gameId} by ${socket.id}. Players: ${expected.join(', ')}`); // Log success
            socket.join(gameId);
            socket.gameId = gameId;

            socket.emit('gameCreated', { gameId, expectedPlayers: expected }); // Inform creator

        } catch (error) {
            console.error(`Error during setupGame for ${socket.id}:`, error);
            socket.emit('errorMsg', 'Failed to create game due to server error.');
        }
    });

    // --- Joining Game ---
    socket.on('requestJoin', ({ gameId, username }) => {
         console.log(`DEBUG: Received 'requestJoin': gameId=${gameId}, username=${username} from ${socket.id}`); // Log reception
        try {
            const game = games[gameId];
            if (!game) {
                console.log(`DEBUG: Join attempt failed for ${socket.id} - Game "${gameId}" not found.`);
                socket.emit('errorMsg', `Game "${gameId}" not found.`); return;
            }
            if (game.phase !== 'login' && game.phase !== 'drafting') { // Allow joining during drafting for reconnects
                 console.log(`DEBUG: Join attempt failed for ${socket.id} - Game "${gameId}" not in joinable phase (${game.phase}).`);
                socket.emit('errorMsg', `Game not accepting players now (Phase: ${game.phase}).`); return;
            }
            if (!game.expectedPlayers.includes(username)) {
                console.log(`DEBUG: Join attempt failed for ${socket.id} - Username "${username}" not in expected list for game ${gameId}.`);
                socket.emit('errorMsg', `Username "${username}" not on player list.`); return;
            }

            const existingSocketId = game.loggedInPlayers[username];
            if (existingSocketId && existingSocketId !== socket.id) {
                 console.log(`User ${username} trying to join again (connected as ${existingSocketId}). Disconnecting old.`);
                 const oldSocket = io.sockets.sockets.get(existingSocketId);
                 if (oldSocket) { oldSocket.emit('forceDisconnect', 'Logged in from another location.'); oldSocket.disconnect(true); }
            } else if (existingSocketId === socket.id) {
                 console.log(`User ${username} (${socket.id}) re-requesting join, resending state.`);
                 socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: game.drafts[username] || null }); return;
            }

            game.loggedInPlayers[username] = socket.id;
            socket.join(gameId);
            socket.username = username;
            socket.gameId = gameId;

            console.log(`User ${username} (${socket.id}) successfully joined game ${gameId}`);
            const userDraft = game.drafts[username] || null;
            socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: userDraft });

            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId)); // Update everyone

            // Check if ready to start drafting
            if (Object.keys(game.loggedInPlayers).length === game.expectedPlayers.length && game.phase === 'login') {
                game.phase = 'drafting';
                io.to(gameId).emit('gamePhaseChanged', 'drafting');
                console.log(`Game ${gameId} starting - all players in.`);
            }
        } catch (error) {
             console.error(`Error during requestJoin for ${socket.id} (User: ${username}, Game: ${gameId}):`, error);
             socket.emit('errorMsg', 'Error joining game due to server error.');
        }
    });

     // --- Draft Update ---
     socket.on('updateDraft', (draftPicks) => {
        try {
            const gameId = socket.gameId; const username = socket.username; const game = games[gameId];
            if (!game || !username || game.phase !== 'drafting' || game.submittedPlayers.includes(username)) return;
            game.drafts[username] = draftPicks;
            // console.log(`DEBUG: Draft updated for ${username} in ${gameId}`); // Optional: reduce noise
        } catch (error) { console.error(`Error updating draft for ${username} in game ${gameId}:`, error); }
    });

    // --- Submit Final Draft ---
    socket.on('submitDraft', (finalDraftPicks) => {
        console.log(`DEBUG: Received 'submitDraft' from ${socket.username} (${socket.id}) for game ${socket.gameId}`); // Log reception
        try {
            const gameId = socket.gameId; const username = socket.username; const game = games[gameId];
            if (!game || !username || game.phase !== 'drafting' || game.submittedPlayers.includes(username)) {
                 console.log(`DEBUG: Submit draft rejected for ${username} (Invalid state)`);
                 return; // Silently reject or send specific error
            }

            game.submittedPlayers.push(username);
            game.drafts[username] = finalDraftPicks;
            console.log(`User ${username} submitted final draft successfully for game ${gameId}`);
            socket.emit('submitSuccess'); // Confirm to submitter
            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId)); // Update status for everyone

            // Check if ready for reveal
            if (game.submittedPlayers.length === game.expectedPlayers.length) {
                game.phase = 'reveal';
                console.log(`Game ${gameId} entering reveal phase.`);
                io.to(gameId).emit('revealAllDrafts', game.drafts);
                io.to(gameId).emit('gamePhaseChanged', 'reveal');
            }
        } catch (error) {
             console.error(`Error submitting draft for ${username} in game ${gameId}:`, error);
             socket.emit('errorMsg', 'Error submitting draft due to server error.');
        }
    });

    // --- Handle Disconnect ---
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
        try {
            const gameId = socket.gameId; const username = socket.username;
            if (gameId && games[gameId] && username) {
                 const game = games[gameId];
                 if (game.loggedInPlayers[username] === socket.id) { // Only act if this was the active socket for the user
                    delete game.loggedInPlayers[username];
                    console.log(`User ${username} removed from loggedInPlayers in game ${gameId}.`);
                    if (game.phase !== 'reveal') { // Don't update after game ended
                         io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));
                    }
                 } else {
                     // This socket disconnected, but the user might have already reconnected with a new socket
                     console.log(`Disconnected socket ${socket.id} was not the primary for user ${username} in game ${gameId}. No state change needed.`);
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
// Sends index.html for any GET request not handled by static middleware
app.get('*', (req, res) => {
    console.log(`Serving index.html for path: ${req.path}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});