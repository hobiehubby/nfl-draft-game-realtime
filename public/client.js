document.addEventListener('DOMContentLoaded', () => {
    // --- Establish Socket.IO Connection ---
    // The '/socket.io/socket.io.js' script loaded in HTML defines the 'io' object.
    const socket = io();

    // --- DOM Elements ---
    // Ensure all these IDs match your index.html
    const setupSection = document.getElementById('setupSection');
    const playerNamesInput = document.getElementById('playerNamesInput');
    const setupButton = document.getElementById('setupButton');
    const setupError = document.getElementById('setupError');

    const shareSection = document.getElementById('shareSection');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyLinkButton = document.getElementById('copyLinkButton');
    const lobbyPlayerList = document.getElementById('lobbyPlayerList');
    const lobbyStatus = document.getElementById('lobbyStatus');

    const loginSection = document.getElementById('loginSection');
    const loginHeader = document.getElementById('loginHeader');
    const loginPlayerList = document.getElementById('loginPlayerList');
    const usernameInput = document.getElementById('usernameInput');
    const loginButton = document.getElementById('loginButton');
    const loginStatus = document.getElementById('loginStatus');

    const draftContainer = document.getElementById('draftContainer');
    const gameInfo = document.getElementById('gameInfo');
    const gameIdDisplay = document.getElementById('gameIdDisplay');
    const currentUserInfo = document.getElementById('currentUserInfo');
    const availablePlayersList = document.getElementById("availablePlayersList");
    const draftSlotsContainer = document.getElementById("draftSlots");
    const searchFilterInput = document.getElementById("searchFilter");
    const positionFilterSelect = document.getElementById("positionFilter");
    const schoolFilterSelect = document.getElementById("schoolFilter");
    const submitButton = document.getElementById("submitBtn");
    const resetDraftButton = document.getElementById("resetDraftButton");
    const submissionStatusDiv = document.getElementById("submissionStatus");
    const submittedDraftsContainer = document.getElementById("submittedDraftsContainer");
    const allDraftsDiv = document.getElementById("allDrafts");
    const pickRangeSpan = document.getElementById('pickRange');

    const generalStatus = document.getElementById('generalStatus');


    // --- Global Client State ---
    let currentUser = null;
    let currentGameId = null;
    let currentPhase = 'setup'; // Default phase
    let currentGameState = null; // Holds the latest state received from server
    let availablePlayersSortable = null;
    let draftSlotSortables = []; // Store sortable instances for draft slots
    const draftSlots = 32; // Make sure this matches desired draft length
    let localDraft = []; // Store the user's current draft picks locally before submitting
    let debounceTimeout = null; // For debouncing draft updates


    // --- Player Data (Should be identical on Client and Server) ---
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



    // --- Utility Functions ---
    function showSection(sectionId) {
        const sections = ['setupSection', 'shareSection', 'loginSection', 'draftContainer'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) {
            sectionToShow.style.display = sectionId === 'draftContainer' ? 'flex' : 'block';
        }
    }

    function displayStatus(message, element = generalStatus, isError = true) {
        if (!element) return;
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'info'}`; // Use classes for styling
        element.style.display = message ? 'block' : 'none';
    }

    function clearStatus(element = generalStatus) {
        displayStatus('', element);
    }


    // --- Socket Event Handlers ---

    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        clearStatus(generalStatus);
        // Check URL for game ID on initial connect or reconnect
        handleUrlGameId();
    });

    socket.on('disconnect', (reason) => {
        displayStatus(`Disconnected from server: ${reason}. Attempting to reconnect...`);
        // Optionally disable UI elements until reconnected
        toggleDraftingInteraction(false); // Disable draft board on disconnect
    });

    socket.on('errorMsg', (message) => {
        // Display errors in specific areas if possible, otherwise use general status
        if (currentPhase === 'setup') displayStatus(message, setupError);
        else if (currentPhase === 'login') displayStatus(message, loginStatus);
        else displayStatus(message, generalStatus);
    });

     socket.on('forceDisconnect', (message) => {
        alert(`Disconnected by server: ${message}`);
        // Optionally redirect or disable the page completely
        toggleDraftingInteraction(false);
        socket.disconnect(); // Ensure socket is closed client-side too
    });


    socket.on('gameCreated', ({ gameId, expectedPlayers }) => {
        currentGameId = gameId;
        currentGameState = {
            gameId: gameId,
            phase: 'login', // Server sets phase, update client accordingly
            expectedPlayers: expectedPlayers,
            loggedInUsernames: [], // Starts empty
            submittedPlayers: [] // Starts empty
        };
        currentPhase = 'lobby'; // Client shows lobby/share view first
        const link = `${window.location.origin}/game/${gameId}`;
        shareLinkInput.value = link;
        updatePlayerStatusList(lobbyPlayerList, currentGameState); // Show players in lobby
        showSection('shareSection');
        displayStatus(`Game created! Share the link above. Waiting for players...`, lobbyStatus, false);
    });

    socket.on('joinSuccess', ({ username, gameState, draft }) => {
        currentUser = username;
        currentGameId = gameState.gameId;
        currentGameState = gameState;
        currentPhase = gameState.phase;
        console.log(`Successfully joined game ${currentGameId} as ${username}. Phase: ${currentPhase}`);
        clearStatus(loginStatus);
        usernameInput.value = '';

        // Initialize board if entering drafting phase
        if (currentPhase === 'drafting' || currentPhase === 'reveal') {
             if (!draftSlotSortables.length) { // Avoid re-initializing if already exists
                initializeDraftBoard();
             }
             // Load draft if provided (reconnect scenario)
             if (draft) {
                 console.log("Loading previous draft state:", draft);
                 loadDraftState(draft);
             } else {
                 // Ensure local draft is reset if no state provided
                  localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
             }
        }
        updateUIBasedOnState();
    });

    socket.on('gameStateUpdate', (gameState) => {
        console.log("Received game state update:", gameState);
        currentGameState = gameState;
        // Avoid changing phase if client is in lobby - let server dictate phase change explicitly
        if (currentPhase !== 'lobby' || gameState.phase === 'drafting' || gameState.phase === 'reveal') {
             currentPhase = gameState.phase;
        }
        updateUIBasedOnState();
    });

    socket.on('gamePhaseChanged', (newPhase) => {
        console.log("Game phase changed to:", newPhase);
        // If transitioning TO drafting, ensure board is ready
        if (newPhase === 'drafting' && currentPhase !== 'drafting') {
            if (!draftSlotSortables.length) {
                 initializeDraftBoard();
            }
             // Make sure local draft is initialized/reset for the start
             localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        }
         currentPhase = newPhase;
         updateUIBasedOnState(); // Update UI AFTER phase change
    });


    socket.on('revealAllDrafts', (allDrafts) => {
        console.log("Received all drafts for reveal");
         if (currentPhase === 'reveal') { // Only display if we are in reveal phase
            displayAllSubmissions(allDrafts);
            toggleDraftingInteraction(false); // Ensure drafting is disabled
         } else {
             console.warn("Received reveal data but not in reveal phase.");
         }
    });

    socket.on('submitSuccess', () => {
         // Server confirms submission, update local state/UI
         if (currentUser && currentGameState && !currentGameState.submittedPlayers.includes(currentUser)) {
            currentGameState.submittedPlayers.push(currentUser); // Assume success and update client state
         }
         alert(`Your draft has been submitted successfully! Waiting for others...`);
         toggleDraftingInteraction(false); // Disable board
         updateUIBasedOnState(); // Refresh button states etc.
    });


    // --- UI Update Logic ---

    function updateUIBasedOnState() {
        clearStatus(generalStatus); // Clear general errors on UI update

        // Update shared elements if game state exists
        if (currentGameState) {
            gameIdDisplay.textContent = currentGameState.gameId || 'N/A';
            // Update player lists for lobby and login screens
            updatePlayerStatusList(lobbyPlayerList, currentGameState);
            updatePlayerStatusList(loginPlayerList, currentGameState);
            // Update submission status display
            updateSubmissionStatus();
        } else {
             gameIdDisplay.textContent = 'N/A';
        }


        // Show the correct main section based on phase
        switch (currentPhase) {
            case 'setup':
                showSection('setupSection');
                break;
            case 'lobby':
                showSection('shareSection');
                 // Update lobby status message
                 if(currentGameState?.expectedPlayers && currentGameState.loggedInUsernames?.length === currentGameState.expectedPlayers.length){
                     displayStatus("All players ready! Starting game...", lobbyStatus, false);
                 } else {
                     displayStatus("Waiting for players to join via the link...", lobbyStatus, false);
                 }
                break;
            case 'login':
                showSection('loginSection');
                loginHeader.textContent = `Join Game: ${currentGameId || '...'}`;
                 displayStatus('', loginStatus); // Clear previous login errors/messages
                break;
            case 'drafting':
                showSection('draftContainer');
                submittedDraftsContainer.style.display = 'none';
                if (currentUser) {
                    currentUserInfo.textContent = `Drafting as: ${currentUser}`;
                    const isSubmitted = currentGameState?.submittedPlayers?.includes(currentUser);
                    toggleDraftingInteraction(!isSubmitted); // Enable/disable based on submission
                } else {
                     currentUserInfo.textContent = "Waiting for user info...";
                     toggleDraftingInteraction(false); // Disable if no user yet
                }
                break;
            case 'reveal':
                showSection('draftContainer');
                submittedDraftsContainer.style.display = 'block'; // Show submitted drafts
                if (currentUser) {
                    currentUserInfo.textContent = `Viewing Results as: ${currentUser}`;
                }
                toggleDraftingInteraction(false); // Ensure drafting is disabled
                // displayAllSubmissions() is triggered by 'revealAllDrafts' event
                break;
            default:
                showSection('setupSection'); // Fallback
        }
    }


    function updatePlayerStatusList(listElement, gameState) {
        if (!listElement || !gameState || !gameState.expectedPlayers) return;

        listElement.innerHTML = ''; // Clear current list
        gameState.expectedPlayers.forEach(player => {
            const li = document.createElement('li');
            let status = '';
            let liClass = '';

            if (gameState.loggedInUsernames?.includes(player)) {
                status = ' (Ready)';
                liClass = 'ready';
            }
            // Check submitted status AFTER ready status
            if (gameState.submittedPlayers?.includes(player)) {
                status = ' (Submitted)';
                liClass = 'submitted'; // Submitted overrides ready visually
            }

            li.textContent = `${player}${status}`;
            if (liClass) li.className = liClass;

            listElement.appendChild(li);
        });
    }


    function updateSubmissionStatus() {
        if (!currentGameState || !currentGameState.expectedPlayers) {
             submissionStatusDiv.textContent = 'Awaiting game data...';
             return;
        };

        const submittedCount = currentGameState.submittedPlayers?.length || 0;
        const totalPlayers = currentGameState.expectedPlayers.length;

        let statusText = `Submissions: ${submittedCount} / ${totalPlayers}`;
        if (currentPhase === 'drafting' && submittedCount < totalPlayers) {
            const waitingCount = totalPlayers - submittedCount;
            statusText += ` (Waiting for ${waitingCount})`;
        } else if (currentPhase === 'reveal' || submittedCount === totalPlayers) {
            statusText += ` (All Submitted!)`;
        }
        submissionStatusDiv.textContent = statusText;
    }


    // --- Draft Board Logic ---

    function initializeDraftBoard() {
        console.log("Initializing draft board UI...");
        pickRangeSpan.textContent = `#1 - #${draftSlots}`; // Update pick range display
        populatePlayers(); // Create available player elements
        populateSchoolFilter();
        createDraftSlots(); // Create draft slot elements and Sortable instances
        filterPlayers(); // Apply initial filters
        // Reset or load local draft state AFTER board elements are created
        localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        console.log("Draft board initialized.");
    }

    function populatePlayers() {
        availablePlayersList.innerHTML = ''; // Clear list first
        playersData.forEach(player => {
            const playerDiv = createPlayerElement(player);
            availablePlayersList.appendChild(playerDiv);
        });

        // Destroy previous instance if exists
        if (availablePlayersSortable) availablePlayersSortable.destroy();

        availablePlayersSortable = Sortable.create(availablePlayersList, {
            group: { name: "players", pull: true, put: true },
            animation: 150,
            sort: true, // Allow sorting within available list
            filter: '.player-disabled', // Class to prevent dragging
             preventOnFilter: true,
             onMove: function (evt) {
                // Additional check to prevent moving if user has submitted
                 return !(currentGameState?.submittedPlayers?.includes(currentUser));
             }
        });
    }

    function createPlayerElement(player) {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player";
        // Store data attributes for filtering and identification
        playerDiv.dataset.position = player.position;
        playerDiv.dataset.school = player.school;
        playerDiv.dataset.name = player.name; // Use name for identification
        playerDiv.textContent = `${player.name} - ${player.position} - ${player.school}`; // Display text

        // Example: Check if player is already drafted by SOMEONE in the current game state
        // This requires parsing all drafts if available, or a dedicated list from server
        // if (isPlayerGloballyDrafted(player.textContent)) {
        //    playerDiv.classList.add('player-disabled');
        // }
        return playerDiv;
    }


    function populateSchoolFilter() {
        // Get unique schools from the playerData list
        const schools = [...new Set(playersData.map(p => p.school).filter(Boolean))].sort();
        // Clear existing options except the first 'All Schools' one
        schoolFilterSelect.innerHTML = '<option value="">All Schools</option>';
        schools.forEach(school => {
            const option = document.createElement("option");
            option.value = school;
            option.textContent = school;
            schoolFilterSelect.appendChild(option);
        });
    }

    function createDraftSlots() {
        draftSlotsContainer.innerHTML = ''; // Clear previous slots
        draftSlotSortables = []; // Reset array of sortable instances

        for (let i = 1; i <= draftSlots; i++) {
            const slot = document.createElement("div");
            slot.className = "draft-slot";
            slot.id = `slot-${i}`; // Assign ID based on pick number
            slot.dataset.pickNumber = i; // Store pick number

            const pickNumberSpan = document.createElement("span");
            pickNumberSpan.className = "pick-number";
            pickNumberSpan.textContent = `${i}.`; // Display pick number
            slot.appendChild(pickNumberSpan);

            draftSlotsContainer.appendChild(slot);

            // Create a Sortable instance for each slot
            const sortable = Sortable.create(slot, {
                group: { name: "players", pull: true, put: true }, // Belongs to 'players' group
                animation: 150,
                onAdd: handlePlayerDrop, // Function called when a player is added
                onRemove: handlePlayerRemove, // Function called when a player is removed
                 onMove: function (evt) {
                     // Prevent moving if user has submitted
                     return !(currentGameState?.submittedPlayers?.includes(currentUser));
                 }
            });
            draftSlotSortables.push(sortable); // Store the instance
        }
    }


    function handlePlayerDrop(evt) {
        const playerElement = evt.item; // The player element being dropped
        const targetSlot = evt.to;   // The slot element receiving the drop

        if (!targetSlot.classList.contains('draft-slot')) return; // Safety check

        // Prevent changes if user has submitted
        if (currentGameState?.submittedPlayers?.includes(currentUser)) {
            console.warn("Attempted to drop player after submission.");
            // Move item back to where it came from
            (evt.from || availablePlayersList).appendChild(playerElement);
            return;
        }

        // Ensure only one player element per slot
        const existingPlayers = Array.from(targetSlot.children).filter(child => child.classList.contains('player'));
        if (existingPlayers.length > 1) {
            // Find the player that was *not* just dropped
            const playerToRemove = existingPlayers.find(p => p !== playerElement);
            if (playerToRemove) {
                // Move the previously existing player back to the available list
                availablePlayersList.appendChild(playerToRemove);
            }
        }

        targetSlot.classList.add('slot-filled'); // Add styling hook
        if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback

        // Update the local draft state and send update to server
        updateLocalDraftState();
        sendDraftUpdateToServer();
    }

    function handlePlayerRemove(evt) {
        // Function called when a player is dragged *out* of a draft slot
        const sourceSlot = evt.from;
        if (sourceSlot.classList.contains('draft-slot')) {
             sourceSlot.classList.remove('slot-filled');
             // Update the local draft state and send update to server
             updateLocalDraftState();
             sendDraftUpdateToServer();
        }
    }


    // --- Draft State Management ---

    function updateLocalDraftState() {
        // Reads the current state of the draft board UI and updates the 'localDraft' array
        localDraft = [];
        for (let i = 1; i <= draftSlots; i++) {
            const slot = document.getElementById(`slot-${i}`);
            const playerEl = slot?.querySelector(".player"); // Find player element within the slot
            localDraft.push({
                pick: i,
                playerText: playerEl ? playerEl.textContent : null // Store text content or null
            });
        }
         // console.log("Local draft state updated:", localDraft); // Debugging
    }

    function sendDraftUpdateToServer() {
        // Debounce the sending of updates
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
             if (currentPhase === 'drafting' && !(currentGameState?.submittedPlayers?.includes(currentUser))) {
                updateLocalDraftState(); // Ensure state is current before sending
                console.log("Sending draft update to server...");
                socket.emit('updateDraft', localDraft); // Send the array of picks
             }
        }, 750); // Send update 750ms after the last UI change
    }

    function loadDraftState(draftToLoad) {
        // Populates the UI based on a draft state array received (e.g., on reconnect)
        if (!draftToLoad || !Array.isArray(draftToLoad)) {
            console.warn("Invalid draft state provided for loading.");
            return;
        }

         // Clear existing board visually first
         resetDraftVisuals();

        draftToLoad.forEach(pickData => {
            if (pickData.playerText) {
                const slot = document.getElementById(`slot-${pickData.pick}`);
                // Find the corresponding player element in the *currently available* list
                const playerElement = Array.from(availablePlayersList.querySelectorAll('.player'))
                                          .find(p => p.textContent === pickData.playerText);

                if (playerElement && slot) {
                    if (!slot.querySelector('.player')) { // Check if slot is empty
                        slot.appendChild(playerElement); // Move player from available list to slot
                        slot.classList.add('slot-filled');
                    } else {
                         console.warn(`Slot ${pickData.pick} already filled when trying to load ${pickData.playerText}`);
                    }
                } else if (!playerElement) {
                    console.warn(`Player "${pickData.playerText}" for pick ${pickData.pick} not found in available list during load.`);
                    // Optionally create a placeholder in the slot?
                    // const placeholder = document.createElement('div');
                    // placeholder.className = 'player player-missing';
                    // placeholder.textContent = `(Previously: ${pickData.playerText})`;
                    // if(slot && !slot.querySelector('.player')) slot.appendChild(placeholder);
                }
            }
        });
        updateLocalDraftState(); // Sync localDraft array with the loaded state
        filterPlayers(); // Hide players moved to slots
    }

    function resetDraftVisuals() {
         // Moves players in slots back to available list WITHOUT saving/clearing storage
         const slots = draftSlotsContainer.querySelectorAll('.draft-slot');
         slots.forEach(slot => {
             const player = slot.querySelector('.player');
             if (player) {
                 availablePlayersList.appendChild(player); // Move back to available list
                 slot.classList.remove('slot-filled');
             }
         });
         filterPlayers(); // Update available list visibility
    }


    function resetDraft() {
        // Triggered by the reset button
        if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) {
            alert("Cannot reset draft now.");
            return;
        }
        if (!confirm(`Are you sure you want to reset your current draft selections, ${currentUser}?`)) return;

        resetDraftVisuals(); // Clear the board visually
        // Reset the local state representation
        localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        sendDraftUpdateToServer(); // Send the cleared state to the server
    }

    function submitDraft() {
        // Triggered by the submit button
        if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) {
            alert("Cannot submit draft now.");
            return;
        }

        updateLocalDraftState(); // Ensure local state is current

        let filledSlots = localDraft.filter(p => p.playerText !== null).length;
        let confirmationMessage = `Submit your final draft? You have selected ${filledSlots}/${draftSlots} players. You won't be able to make further changes.`;

        if (filledSlots < draftSlots) {
            confirmationMessage = `Warning: Only ${filledSlots}/${draftSlots} picks made. Submit final draft anyway? You won't be able to make further changes.`;
        }

        if (confirm(confirmationMessage)) {
            console.log("Submitting final draft:", localDraft);
            socket.emit('submitDraft', localDraft);
            // Client UI is disabled upon server confirmation via 'submitSuccess' event
        }
    }

    // --- Filter Logic ---
    function filterPlayers() {
        const searchTerm = searchFilterInput.value.toLowerCase();
        const selectedPos = positionFilterSelect.value;
        const selectedSchool = schoolFilterSelect.value;

        // Filter players currently in the available list
        const availablePlayerElements = availablePlayersList.querySelectorAll(".player");
        availablePlayerElements.forEach(player => {
            // Read data attributes for filtering
            const name = player.dataset.name?.toLowerCase() || '';
            const position = player.dataset.position || '';
            const school = player.dataset.school || '';

            // Determine if the player matches the filters
            const matchPos = !selectedPos || position.includes(selectedPos);
            const matchSchool = !selectedSchool || school === selectedSchool;
            const matchSearch = !searchTerm || name.includes(searchTerm) || position.toLowerCase().includes(searchTerm) || school.toLowerCase().includes(searchTerm);

            // Show or hide based on match
            player.style.display = (matchPos && matchSchool && matchSearch) ? "" : "none";
        });
    }

    // --- Reveal Logic ---
    function displayAllSubmissions(allDrafts) {
        allDraftsDiv.innerHTML = ""; // Clear previous content
        submittedDraftsContainer.style.display = 'block'; // Ensure container is visible

        if (!currentGameState || !currentGameState.expectedPlayers) {
            allDraftsDiv.innerHTML = "Error: Missing player list for display.";
            return;
        }

        // Iterate through expected players to maintain consistent order
        currentGameState.expectedPlayers.forEach(username => {
            const userDraftData = allDrafts[username]; // Get draft data for this user
            const submissionDiv = document.createElement("div");
            submissionDiv.className = 'submission'; // Add class for styling

            let picksHtml = '';
            if (userDraftData && Array.isArray(userDraftData)) {
                // Generate HTML for each pick
                picksHtml = userDraftData
                    .map(p => `<div>${p.pick}. ${p.playerText || '---'}</div>`) // Display pick number and player text (or '---')
                    .join("");
                submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong>${picksHtml}`;
            } else {
                 // Handle case where draft data might be missing (shouldn't happen if logic is correct)
                submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong> (Data not available)`;
            }
            allDraftsDiv.appendChild(submissionDiv); // Add this user's draft to the display area
        });
    }


    // --- Utility: Enable/Disable Drafting Interaction ---
    function toggleDraftingInteraction(enabled) {
        // Toggle form elements
        searchFilterInput.disabled = !enabled;
        positionFilterSelect.disabled = !enabled;
        schoolFilterSelect.disabled = !enabled;

         // Only enable buttons if the user hasn't submitted
         const canInteract = enabled && !(currentGameState?.submittedPlayers?.includes(currentUser));
         resetDraftButton.disabled = !canInteract;
         submitButton.disabled = !canInteract;


        // Enable/disable SortableJS instances
        if (availablePlayersSortable) {
            availablePlayersSortable.option("disabled", !enabled);
        }
        draftSlotSortables.forEach(sortable => {
            sortable.option("disabled", !enabled);
        });

        // Add/remove a visual overlay or style change
        const draftArea = document.querySelector('.lists-wrapper'); // Target the drafting area
        if (draftArea) {
             draftArea.style.opacity = enabled ? '1' : '0.6'; // Dim if disabled
             // draftArea.style.pointerEvents = enabled ? 'auto' : 'none'; // Prevent clicks if needed
        }
    }


    // --- Initial Load / URL Handling ---
    function handleUrlGameId() {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length === 3 && pathParts[1] === 'game') {
            const gameIdFromUrl = pathParts[2];
            if (gameIdFromUrl) {
                 currentGameId = gameIdFromUrl; // Store game ID found in URL
                 console.log("Attempting to join game from URL:", gameIdFromUrl);
                 currentPhase = 'login'; // Assume login phase if joining via link
                 updateUIBasedOnState(); // Show login section
                 // Note: We don't automatically emit 'requestJoin' here.
                 // User needs to enter their username first.
            } else {
                 // Invalid URL structure, default to setup
                 currentPhase = 'setup';
                 updateUIBasedOnState();
            }

        } else {
            // No game ID in URL, default to setup phase
            currentPhase = 'setup';
            updateUIBasedOnState();
        }
    }

    // --- Event Listeners (Setup after DOM loaded) ---

    // Setup button
    setupButton.addEventListener('click', () => {
        const names = playerNamesInput.value.split(',').map(n => n.trim()).filter(Boolean);
        if (names.length > 0) {
            clearStatus(setupError);
            socket.emit('setupGame', names);
        } else {
            displayStatus('Please enter at least one player name.', setupError);
        }
    });
     playerNamesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') setupButton.click();
     });


    // Copy Link Button
    copyLinkButton.addEventListener('click', () => {
        shareLinkInput.select();
        shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
        try {
            // Use Clipboard API if available (more modern)
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                     alert('Link copied to clipboard!');
                }).catch(err => {
                     console.error('Clipboard API copy failed:', err);
                     // Fallback for older browsers
                     document.execCommand('copy');
                     alert('Link copied (fallback method).');
                });
            } else {
                 // Fallback for very old browsers
                 document.execCommand('copy');
                 alert('Link copied (fallback method).');
            }

        } catch (err) {
            console.error('Copying failed:', err);
            alert('Failed to copy link automatically. Please copy it manually.');
        }
    });


    // Login button
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username && currentGameId) {
            clearStatus(loginStatus);
            displayStatus('Attempting to join...', loginStatus, false); // Show info status
            socket.emit('requestJoin', { gameId: currentGameId, username });
        } else if (!currentGameId) {
            displayStatus('Error: No game ID specified. Use a join link or create a new game.', loginStatus);
        } else {
            displayStatus('Please enter your name.', loginStatus);
        }
    });
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginButton.click();
    });


    // Filter listeners
    searchFilterInput.addEventListener('input', filterPlayers);
    positionFilterSelect.addEventListener('change', filterPlayers);
    schoolFilterSelect.addEventListener('change', filterPlayers);

    // Draft action buttons
    resetDraftButton.addEventListener('click', resetDraft);
    submitButton.addEventListener('click', submitDraft);

    // Initial setup when the script runs
    console.log("Client script loaded. Waiting for DOM and Socket connection...");
    // Initial UI state is set based on handleUrlGameId called within socket.on('connect')

}); // End DOMContentLoaded