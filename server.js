const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000; // Use environment port or default to 3000

// Serve static files from the 'public' directory
app.use(express.static('public'));

// In-memory storage for game states
// In production, replace this with a database (e.g., Redis, MongoDB)
let games = {}; // { gameId: { phase, expectedPlayers, loggedInPlayers, submittedPlayers, drafts } }


// --- Player Data (Should be kept consistent with client.js) ---
// (Reduced list for brevity in this example - use your full list here)
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
        { name: "J. Michael Sturdivant", position: "WR", school: "UCLA"}, // Kept from original list

        // TE
        { name: "Colston Loveland", position: "TE", school: "Michigan" },
        { name: "Luke Lachey", position: "TE", school: "Iowa" },
        { name: "Mitchell Evans", position: "TE", school: "Notre Dame" },
        { name: "Tyler Warren", position: "TE", school: "Penn State" }, // Kept from original list
        { name: "Jake Briningstool", position: "TE", school: "Clemson" },
        { name: "Caden Prieskorn", position: "TE", school: "Ole Miss" },

        // OT
        { name: "Will Campbell", position: "OT", school: "LSU" },
        { name: "Kelvin Banks Jr.", position: "OT", school: "Texas" },
        { name: "Jonah Monheim", position: "OT", school: "USC" }, // Often listed as IOL too
        { name: "Emery Jones Jr.", position: "OT", school: "LSU" },
        { name: "Josh Conerly Jr.", position: "OT", school: "Oregon" },
        { name: "Earnest Greene III", position: "OT", school: "Georgia" }, // Kept from original list
        { name: "Trey Zuhn III", position: "OT", school: "Texas A&M" },
        { name: "Aireontae Ersery", position: "OT", school: "Minnesota" },
        { name: "Ajani Cornelius", position: "OT", school: "Oregon" },

        // IOL (Interior Offensive Line - Guards/Centers)
        { name: "Tyler Booker", position: "IOL", school: "Alabama" },
        { name: "Donovan Jackson", position: "IOL", school: "Ohio State" },
        { name: "Parker Brailsford", position: "IOL", school: "Alabama" }, // Center
        { name: "Clay Webb", position: "IOL", school: "Georgia" }, // Center
        { name: "Tate Ratledge", position: "IOL", school: "Georgia" },
        { name: "Cooper Beebe", position: "IOL", school: "Kansas State" }, // Returning for another year? Verify eligibility, often listed high previously. Replaced with below if Beebe gone.
        { name: "Javontez Spraggins", position: "IOL", school: "Tennessee" }, // Added replacement/depth
        { name: "Luke Kandra", position: "IOL", school: "Louisville" },


        // EDGE
        { name: "James Pearce Jr.", position: "EDGE", school: "Tennessee" },
        { name: "Abdul Carter", position: "EDGE", school: "Penn State" }, // LB/EDGE versatility
        { name: "Nic Scourton", position: "EDGE", school: "Texas A&M" },
        { name: "Princely Umanmielen", position: "EDGE", school: "Ole Miss" },
        { name: "Jack Sawyer", position: "EDGE", school: "Ohio State" },
        { name: "JT Tuimoloau", position: "EDGE", school: "Ohio State" },
        { name: "Patrick Payton", position: "EDGE", school: "Florida State" },
        { name: "Dani Dennis-Sutton", position: "EDGE", school: "Penn State" },
        { name: "Kyle Kennard", position: "EDGE", school: "South Carolina" },
        { name: "Landon Jackson", position: "EDGE", school: "Arkansas" },
        { name: "Mykel Williams", position: "EDGE", school: "Georgia" }, // Often listed DL too

        // DL (Interior Defensive Line)
        { name: "Mason Graham", position: "DL", school: "Michigan" },
        { name: "Deone Walker", position: "DL", school: "Kentucky" },
        { name: "Kenneth Grant", position: "DL", school: "Michigan" },
        { name: "Tyleik Williams", position: "DL", school: "Ohio State" }, // Kept from original list
        { name: "Howard Cross III", position: "DL", school: "Notre Dame" },
        { name: "Dontay Corleone", position: "DL", school: "Cincinnati" },
        { name: "Walter Nolen", position: "DL", school: "Ole Miss" },
        { name: "Bear Alexander", position: "DL", school: "USC" },
        { name: "Nazir Stackhouse", position: "DL", school: "Georgia" },
        { name: "Maason Smith", position: "DL", school: "LSU" }, // Kept from original list
        { name: "Tyler Davis", position: "DL", school: "Clemson" }, // Kept from original list

        // LB
        { name: "Harold Perkins Jr.", position: "LB", school: "LSU" },
        { name: "Danny Stutsman", position: "LB", school: "Oklahoma" },
        { name: "Barrett Carter", position: "LB", school: "Clemson" },
        { name: "Jay Higgins", position: "LB", school: "Iowa" },
        { name: "Smael Mondon Jr.", position: "LB", school: "Georgia" }, // Kept from original list
        { name: "Jihaad Campbell", position: "LB", school: "Alabama" }, // Kept from original list (can be EDGEy)
        { name: "Nick Jackson", position: "LB", school: "Iowa" },
        { name: "Jeffrey Bassa", position: "LB", school: "Oregon" },
        { name: "Power Echols", position: "LB", school: "North Carolina" },

        // CB
        { name: "Travis Hunter", position: "WR/CB", school: "Colorado" }, // Dual position star
        { name: "Will Johnson", position: "CB", school: "Michigan" },
        { name: "Benjamin Morrison", position: "CB", school: "Notre Dame" },
        { name: "Denzel Burke", position: "CB", school: "Ohio State" },
        { name: "Jabbar Muhammad", position: "CB", school: "Oregon" },
        { name: "Tacario Davis", position: "CB", school: "Arizona" },
        { name: "Sebastian Castro", position: "CB", school: "Iowa" }, // Nickel/Safety versatility
        { name: "Ricardo Hallman", position: "CB", school: "Wisconsin" },
        { name: "Cobee Bryant", position: "CB", school: "Kansas" },
        { name: "Quentin Wilson", position: "CB", school: "North Dakota State" }, // FCS standout
        { name: "Woody Washington", position: "CB", school: "Penn State" },
        { name: "Fentrell Cypress II", position: "CB", school: "Florida State" },


        // S
        { name: "Malaki Starks", position: "S", school: "Georgia" },
        { name: "Caleb Downs", position: "S", school: "Ohio State" },
        { name: "Andrew Mukuba", position: "S", school: "Texas" },
        { name: "Billy Bowman Jr.", position: "S", school: "Oklahoma" },
        { name: "Xavier Watts", position: "S", school: "Notre Dame" },
        { name: "Rod Moore", position: "S", school: "Michigan" }, // Kept from original list (recovering from injury)
        { name: "Jardin Gilbert", position: "S", school: "LSU" },
        { name: "Malachi Moore", position: "S", school: "Alabama" }, // Kept from original list (Nickel/S)
        { name: "Sonny Styles", position: "S", school: "Ohio State" }, // LB/S hybrid potential

    ];
    // --- End Player Data ---

// // Route for joining a specific game via link  <-- COMMENT OUT/DELETE
// app.get('/game/:gameId', (req, res) => {      <-- COMMENT OUT/DELETE
//     res.sendFile(__dirname + '/public/index.html'); <-- COMMENT OUT/DELETE
// });                                            <-- COMMENT OUT/DELETE


io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Game Setup ---
    socket.on('setupGame', (playerNames) => {
        try {
            // Prevent creating multiple games from the same socket (optional)
            // if (Object.values(games).some(g => g.creatorSocketId === socket.id)) {
            //    socket.emit('errorMsg', 'You have already created a game.');
            //    return;
            // }

            const gameId = uuidv4().substring(0, 6); // Generate a short unique ID
            const expected = playerNames
                .map(name => name.trim())
                .filter(name => name.length > 0);

            if (expected.length < 1) {
                socket.emit('errorMsg', 'Please enter at least one player name.');
                return;
            }

            games[gameId] = {
                phase: 'login', // Immediately move to login phase after setup
                expectedPlayers: expected,
                loggedInPlayers: {}, // Store socket.id by username: { username: socket.id }
                submittedPlayers: [],
                drafts: {}, // { username: [...] } - Stores temporary or final drafts
                creatorSocketId: socket.id,
                playerData: playersData // Store player data with the game (optional, could be global)
            };

            console.log(`Game created: ${gameId} by ${socket.id}. Players: ${expected.join(', ')}`);
            socket.join(gameId); // Creator joins the room
            // Associate gameId and potentially username with the socket for later use
            socket.gameId = gameId;
            // socket.username = expected[0]; // Or handle creator login separately if needed

            // Emit only necessary info back
            socket.emit('gameCreated', { gameId, expectedPlayers: expected });

        } catch (error) {
            console.error("Error setting up game:", error);
            socket.emit('errorMsg', 'Failed to create game. Please try again.');
        }
    });

    // --- Joining Game ---
    socket.on('requestJoin', ({ gameId, username }) => {
        try {
            const game = games[gameId];
            if (!game) {
                socket.emit('errorMsg', `Game with ID "${gameId}" not found.`);
                return;
            }
            // Check if game is in the right phase to join
             if (game.phase !== 'login' && game.phase !== 'lobby' && game.phase !== 'drafting') { // Allow joining even if drafting started (reconnect)
                socket.emit('errorMsg', `Game is not accepting new players right now (Phase: ${game.phase}).`);
                return;
            }

            if (!game.expectedPlayers.includes(username)) {
                socket.emit('errorMsg', `Username "${username}" is not on the list for this game.`);
                return;
            }

            const existingSocketId = game.loggedInPlayers[username];
            if (existingSocketId && existingSocketId !== socket.id) {
                 // Handle already logged-in user (e.g., disconnect old socket or notify)
                 console.log(`User ${username} trying to join again (already connected as ${existingSocketId}). Forcing disconnect of old session.`);
                 const oldSocket = io.sockets.sockets.get(existingSocketId);
                 if (oldSocket) {
                     oldSocket.emit('forceDisconnect', 'You have been logged in from another location.');
                     oldSocket.disconnect(true);
                 }
            } else if (existingSocketId === socket.id) {
                // User is already connected with this socket, maybe a page refresh? Just resend state.
                console.log(`User ${username} (${socket.id}) already connected, resending state.`);
                 socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: game.drafts[username] || null });
                return; // Don't proceed further
            }


             // --- Join successful ---
            game.loggedInPlayers[username] = socket.id; // Associate username with socket ID
            socket.join(gameId); // Join the game room
            socket.username = username; // Store username on the socket object for easy access later
            socket.gameId = gameId;     // Store gameId too

            console.log(`User ${username} (${socket.id}) joined game ${gameId}`);

            // Notify the user they joined successfully and send current game state + their draft if exists
            const userDraft = game.drafts[username] || null; // Send draft if they're reconnecting
            socket.emit('joinSuccess', { username, gameState: getSanitizedGameState(gameId), draft: userDraft });

            // Notify everyone in the room about the updated player list/status
            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));

            // Check if game can start (or if it was already started and this is a rejoin)
            if (Object.keys(game.loggedInPlayers).length === game.expectedPlayers.length && game.phase === 'login') {
                game.phase = 'drafting';
                io.to(gameId).emit('gamePhaseChanged', 'drafting'); // Notify all clients to switch to drafting UI
                console.log(`Game ${gameId} starting - all players logged in.`);
            }
        } catch (error) {
             console.error(`Error during join request for ${username} in game ${gameId}:`, error);
             socket.emit('errorMsg', 'An error occurred while trying to join the game.');
        }
    });

     // --- Draft Update (Sent periodically or on significant change by client) ---
     socket.on('updateDraft', (draftPicks) => {
        try {
            const gameId = socket.gameId;
            const username = socket.username;
            const game = games[gameId];

            if (!game || !username || game.phase !== 'drafting' || game.submittedPlayers.includes(username)) {
                // console.log(`Ignoring draft update from ${username} in game ${gameId}`); // Can be noisy
                return;
            }
            // Store the temporary draft state
            game.drafts[username] = draftPicks;
             // console.log(`Draft updated for ${username} in game ${gameId}`); // Can be noisy

        } catch (error) {
             console.error(`Error updating draft for ${username} in game ${gameId}:`, error);
        }
    });

    // --- Submit Final Draft ---
    socket.on('submitDraft', (finalDraftPicks) => {
        try {
            const gameId = socket.gameId;
            const username = socket.username;
            const game = games[gameId];

            if (!game || !username || game.phase !== 'drafting') {
                socket.emit('errorMsg', 'Cannot submit draft right now.');
                return;
            }

            if (game.submittedPlayers.includes(username)) {
                // Should be prevented client-side too, but double-check here
                // socket.emit('errorMsg', 'You have already submitted your draft.');
                return;
            }

            // --- Submission successful ---
            game.submittedPlayers.push(username);
            game.drafts[username] = finalDraftPicks; // Store the FINAL draft
            console.log(`User ${username} submitted final draft for game ${gameId}`);

             // Notify the user their submission was accepted
             socket.emit('submitSuccess');

             // Update everyone on the submission status
             io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));


            // Check if all players have submitted
            if (game.submittedPlayers.length === game.expectedPlayers.length) {
                game.phase = 'reveal';
                console.log(`Game ${gameId} entering reveal phase.`);
                // Send the final drafts to everyone in the room
                 // Delay slightly to ensure clients process the phase change? Optional.
                // setTimeout(() => {
                    io.to(gameId).emit('revealAllDrafts', game.drafts);
                    io.to(gameId).emit('gamePhaseChanged', 'reveal');
                // }, 100);
            }
        } catch (error) {
             console.error(`Error submitting draft for ${username} in game ${gameId}:`, error);
             socket.emit('errorMsg', 'An error occurred while submitting your draft.');
        }
    });


    // --- Handle Disconnect ---
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
        try {
            // Find which game the disconnecting socket was in
            const gameId = socket.gameId;
            const username = socket.username;

            if (gameId && games[gameId] && username) {
                 const game = games[gameId];
                 // Only remove if the socket ID matches the stored one (prevents issues if they rejoined quickly)
                 if (game.loggedInPlayers[username] === socket.id) {
                    delete game.loggedInPlayers[username];
                    console.log(`User ${username} removed from loggedInPlayers in game ${gameId} due to disconnect.`);

                    // Notify remaining players in the room unless game is over
                    if (game.phase !== 'reveal') {
                         io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));
                    }

                     // Optional: Clean up game if empty after a delay?
                     // Could also check if the creator disconnected during login and cancel game
                 } else {
                      console.log(`Socket ${socket.id} disconnected, but user ${username} was already associated with a different socket.`);
                 }
            }
        } catch (error) {
             console.error(`Error during disconnect handling for socket ${socket.id}:`, error);
        }
    });

});

// Helper function to get game state suitable for sending to clients (omits sensitive info if any)
function getSanitizedGameState(gameId) {
    const game = games[gameId];
    if (!game) return null;
    return {
        gameId: gameId,
        phase: game.phase,
        expectedPlayers: game.expectedPlayers,
        loggedInUsernames: Object.keys(game.loggedInPlayers),
        submittedPlayers: game.submittedPlayers,
        // Note: We don't send draft data in the general state update
        // It's sent specifically on join (for reconnect) or during reveal
    };
}


server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});