document.addEventListener('DOMContentLoaded', () => {
    // --- Establish Socket.IO Connection ---
    const socket = io();

    // --- DOM Elements ---
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
    let currentGameState = null;
    let availablePlayersSortable = null;
    let draftSlotSortables = [];
    const draftSlots = 32;
    let localDraft = [];
    let debounceTimeout = null;


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
        element.className = `status-message ${isError ? 'error' : 'info'}`;
        element.style.display = message ? 'block' : 'none';
    }

    function clearStatus(element = generalStatus) {
        displayStatus('', element);
    }


    // --- Socket Event Handlers ---

    socket.on('connect', () => {
        console.log('DEBUG: Socket connected.'); // <-- ADDED LOG
        clearStatus(generalStatus);

        // Determine initial phase based on URL *before* doing anything else
        handleUrlGameId(); // This sets currentGameId and currentPhase
        console.log(`DEBUG: After handleUrlGameId in connect event, phase is: ${currentPhase}`); // <-- ADDED LOG

        // Now update the UI based on the phase determined by the URL
        updateUIBasedOnState();
        console.log('DEBUG: updateUIBasedOnState called from connect event.'); // <-- ADDED LOG
    });

    socket.on('disconnect', (reason) => {
        displayStatus(`Disconnected from server: ${reason}. Attempting to reconnect...`);
        toggleDraftingInteraction(false);
    });

    socket.on('errorMsg', (message) => {
        if (currentPhase === 'setup') displayStatus(message, setupError);
        else if (currentPhase === 'login') displayStatus(message, loginStatus);
        else displayStatus(message, generalStatus);
    });

     socket.on('forceDisconnect', (message) => {
        alert(`Disconnected by server: ${message}`);
        toggleDraftingInteraction(false);
        socket.disconnect();
    });

    socket.on('gameCreated', ({ gameId, expectedPlayers }) => {
        currentGameId = gameId;
        currentGameState = {
            gameId: gameId, phase: 'login', expectedPlayers: expectedPlayers,
            loggedInUsernames: [], submittedPlayers: []
        };
        currentPhase = 'lobby';
        const link = `${window.location.origin}/game/${gameId}`;
        shareLinkInput.value = link;
        updatePlayerStatusList(lobbyPlayerList, currentGameState);
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

        if (currentPhase === 'drafting' || currentPhase === 'reveal') {
             if (!draftSlotSortables.length) {
                initializeDraftBoard();
             }
             if (draft) {
                 console.log("Loading previous draft state:", draft);
                 loadDraftState(draft);
             } else {
                  localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
             }
        }
        updateUIBasedOnState();
    });

    socket.on('gameStateUpdate', (gameState) => {
        console.log("Received game state update:", gameState);
        currentGameState = gameState;
        if (currentPhase !== 'lobby' || gameState.phase === 'drafting' || gameState.phase === 'reveal') {
             currentPhase = gameState.phase;
        }
        updateUIBasedOnState();
    });

    socket.on('gamePhaseChanged', (newPhase) => {
        console.log("Game phase changed to:", newPhase);
        if (newPhase === 'drafting' && currentPhase !== 'drafting') {
            if (!draftSlotSortables.length) {
                 initializeDraftBoard();
            }
             localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        }
         currentPhase = newPhase;
         updateUIBasedOnState();
    });


    socket.on('revealAllDrafts', (allDrafts) => {
        console.log("Received all drafts for reveal");
         if (currentPhase === 'reveal') {
            displayAllSubmissions(allDrafts);
            toggleDraftingInteraction(false);
         } else {
             console.warn("Received reveal data but not in reveal phase.");
         }
    });

    socket.on('submitSuccess', () => {
         if (currentUser && currentGameState && !currentGameState.submittedPlayers.includes(currentUser)) {
            currentGameState.submittedPlayers.push(currentUser);
         }
         alert(`Your draft has been submitted successfully! Waiting for others...`);
         toggleDraftingInteraction(false);
         updateUIBasedOnState();
    });


    // --- UI Update Logic ---

    function updateUIBasedOnState() {
         console.log(`DEBUG: updateUIBasedOnState called. currentPhase = ${currentPhase}`); // <-- ADDED LOG
        clearStatus(generalStatus);

        if (currentGameState) {
            gameIdDisplay.textContent = currentGameState.gameId || 'N/A';
            updatePlayerStatusList(lobbyPlayerList, currentGameState);
            updatePlayerStatusList(loginPlayerList, currentGameState);
            updateSubmissionStatus();
        } else {
             gameIdDisplay.textContent = 'N/A';
        }

        switch (currentPhase) {
            case 'setup':
                 console.log("DEBUG: updateUI - Showing 'setupSection'"); // <-- ADDED LOG
                showSection('setupSection');
                break;
            case 'lobby':
                 console.log("DEBUG: updateUI - Showing 'shareSection' (Lobby)"); // <-- ADDED LOG
                 showSection('shareSection');
                 if(currentGameState?.expectedPlayers && currentGameState.loggedInUsernames?.length === currentGameState.expectedPlayers.length){
                     displayStatus("All players ready! Starting game...", lobbyStatus, false);
                 } else {
                     displayStatus("Waiting for players to join via the link...", lobbyStatus, false);
                 }
                break;
            case 'login':
                 console.log("DEBUG: updateUI - Showing 'loginSection'"); // <-- ADDED LOG
                showSection('loginSection');
                loginHeader.textContent = `Join Game: ${currentGameId || '...'}`;
                 displayStatus('', loginStatus); // Clear previous login errors/messages
                break;
            case 'drafting':
                 console.log("DEBUG: updateUI - Showing 'draftContainer' (Drafting)"); // <-- ADDED LOG
                showSection('draftContainer');
                submittedDraftsContainer.style.display = 'none';
                if (currentUser) {
                    currentUserInfo.textContent = `Drafting as: ${currentUser}`;
                    const isSubmitted = currentGameState?.submittedPlayers?.includes(currentUser);
                    toggleDraftingInteraction(!isSubmitted);
                } else {
                     currentUserInfo.textContent = "Waiting for user info...";
                     toggleDraftingInteraction(false);
                }
                 // Ensure board initialized if needed
                 if (!draftSlotSortables.length) { initializeDraftBoard(); }
                break;
            case 'reveal':
                 console.log("DEBUG: updateUI - Showing 'draftContainer' (Reveal)"); // <-- ADDED LOG
                showSection('draftContainer');
                submittedDraftsContainer.style.display = 'block';
                if (currentUser) {
                    currentUserInfo.textContent = `Viewing Results as: ${currentUser}`;
                }
                toggleDraftingInteraction(false);
                 // Ensure board initialized if needed (e.g., page refresh during reveal)
                 if (!draftSlotSortables.length) { initializeDraftBoard(); }
                break;
            default:
                 console.log(`DEBUG: updateUI - Unknown phase '${currentPhase}', defaulting to 'setupSection'`); // <-- ADDED LOG
                 showSection('setupSection');
         }
         console.log("DEBUG: updateUI - Finished."); // <-- ADDED LOG
    }


    function updatePlayerStatusList(listElement, gameState) {
        if (!listElement || !gameState || !gameState.expectedPlayers) return;
        listElement.innerHTML = '';
        gameState.expectedPlayers.forEach(player => {
            const li = document.createElement('li');
            let status = '';
            let liClass = '';
            if (gameState.loggedInUsernames?.includes(player)) {
                status = ' (Ready)'; liClass = 'ready';
            }
            if (gameState.submittedPlayers?.includes(player)) {
                status = ' (Submitted)'; liClass = 'submitted';
            }
            li.textContent = `${player}${status}`;
            if (liClass) li.className = liClass;
            listElement.appendChild(li);
        });
    }


    function updateSubmissionStatus() {
        if (!currentGameState || !currentGameState.expectedPlayers) {
             submissionStatusDiv.textContent = 'Awaiting game data...'; return;
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
        pickRangeSpan.textContent = `#1 - #${draftSlots}`;
        populatePlayers();
        populateSchoolFilter();
        createDraftSlots();
        localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        filterPlayers();
        console.log("Draft board initialized.");
    }

    function populatePlayers() {
        availablePlayersList.innerHTML = '';
        playersData.forEach(player => {
            const playerDiv = createPlayerElement(player);
            availablePlayersList.appendChild(playerDiv);
        });
        if (availablePlayersSortable) availablePlayersSortable.destroy();
        availablePlayersSortable = Sortable.create(availablePlayersList, {
            group: { name: "players", pull: true, put: true },
            animation: 150, sort: true, filter: '.player-disabled',
             preventOnFilter: true,
             onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); }
        });
    }

    function createPlayerElement(player) {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player";
        playerDiv.dataset.position = player.position;
        playerDiv.dataset.school = player.school;
        playerDiv.dataset.name = player.name;
        playerDiv.textContent = `${player.name} - ${player.position} - ${player.school}`;
        return playerDiv;
    }

    function populateSchoolFilter() {
        const schools = [...new Set(playersData.map(p => p.school).filter(Boolean))].sort();
        schoolFilterSelect.innerHTML = '<option value="">All Schools</option>';
        schools.forEach(school => {
            const option = document.createElement("option");
            option.value = school; option.textContent = school;
            schoolFilterSelect.appendChild(option);
        });
    }

    function createDraftSlots() {
        draftSlotsContainer.innerHTML = '';
        draftSlotSortables = [];
        for (let i = 1; i <= draftSlots; i++) {
            const slot = document.createElement("div");
            slot.className = "draft-slot"; slot.id = `slot-${i}`; slot.dataset.pickNumber = i;
            const pickNumberSpan = document.createElement("span");
            pickNumberSpan.className = "pick-number"; pickNumberSpan.textContent = `${i}.`;
            slot.appendChild(pickNumberSpan);
            draftSlotsContainer.appendChild(slot);
            const sortable = Sortable.create(slot, {
                group: { name: "players", pull: true, put: true }, animation: 150,
                onAdd: handlePlayerDrop, onRemove: handlePlayerRemove,
                 onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); }
            });
            draftSlotSortables.push(sortable);
        }
    }

    function handlePlayerDrop(evt) {
        const playerElement = evt.item; const targetSlot = evt.to;
        if (!targetSlot.classList.contains('draft-slot')) return;
        if (currentGameState?.submittedPlayers?.includes(currentUser)) {
            console.warn("Attempted to drop player after submission.");
            (evt.from || availablePlayersList).appendChild(playerElement); return;
        }
        const existingPlayers = Array.from(targetSlot.children).filter(child => child.classList.contains('player'));
        if (existingPlayers.length > 1) {
            const playerToRemove = existingPlayers.find(p => p !== playerElement);
            if (playerToRemove) { availablePlayersList.appendChild(playerToRemove); }
        }
        targetSlot.classList.add('slot-filled');
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        updateLocalDraftState(); sendDraftUpdateToServer();
    }

    function handlePlayerRemove(evt) {
        const sourceSlot = evt.from;
        if (sourceSlot.classList.contains('draft-slot')) {
             sourceSlot.classList.remove('slot-filled');
             updateLocalDraftState(); sendDraftUpdateToServer();
        }
    }

    // --- Draft State Management ---

    function updateLocalDraftState() {
        localDraft = [];
        for (let i = 1; i <= draftSlots; i++) {
            const slot = document.getElementById(`slot-${i}`);
            const playerEl = slot?.querySelector(".player");
            localDraft.push({ pick: i, playerText: playerEl ? playerEl.textContent : null });
        }
    }

    function sendDraftUpdateToServer() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
             if (currentPhase === 'drafting' && !(currentGameState?.submittedPlayers?.includes(currentUser))) {
                updateLocalDraftState();
                // console.log("Sending draft update to server..."); // Reduce noise
                socket.emit('updateDraft', localDraft);
             }
        }, 750);
    }

    function loadDraftState(draftToLoad) {
        if (!draftToLoad || !Array.isArray(draftToLoad)) { console.warn("Invalid draft state provided."); return; }
        resetDraftVisuals();
        draftToLoad.forEach(pickData => {
            if (pickData.playerText) {
                const slot = document.getElementById(`slot-${pickData.pick}`);
                const playerElement = Array.from(availablePlayersList.querySelectorAll('.player')).find(p => p.textContent === pickData.playerText);
                if (playerElement && slot) {
                    if (!slot.querySelector('.player')) {
                        slot.appendChild(playerElement); slot.classList.add('slot-filled');
                    } else { console.warn(`Slot ${pickData.pick} occupied loading ${pickData.playerText}`); }
                } else if (!playerElement) { console.warn(`Player "${pickData.playerText}" pick ${pickData.pick} not available.`); }
            }
        });
        updateLocalDraftState(); filterPlayers();
    }

    function resetDraftVisuals() {
         const slots = draftSlotsContainer.querySelectorAll('.draft-slot');
         slots.forEach(slot => {
             const player = slot.querySelector('.player');
             if (player) { availablePlayersList.appendChild(player); slot.classList.remove('slot-filled'); }
         });
         filterPlayers();
    }

    function resetDraft() {
        if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot reset draft now."); return; }
        if (!confirm(`Are you sure you want to reset your current draft selections, ${currentUser}?`)) return;
        resetDraftVisuals();
        localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        sendDraftUpdateToServer();
    }

    function submitDraft() {
        if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot submit draft now."); return; }
        updateLocalDraftState();
        let filledSlots = localDraft.filter(p => p.playerText !== null).length;
        let confirmationMessage = `Submit final draft? (${filledSlots}/${draftSlots} picks). No changes allowed after submission.`;
        if (filledSlots < draftSlots) { confirmationMessage = `Warning: Only ${filledSlots}/${draftSlots} picks made. Submit anyway? No changes allowed after submission.`; }
        if (confirm(confirmationMessage)) { console.log("Submitting final draft:", localDraft); socket.emit('submitDraft', localDraft); }
    }

    // --- Filter Logic ---
    function filterPlayers() {
        const searchTerm = searchFilterInput.value.toLowerCase();
        const selectedPos = positionFilterSelect.value;
        const selectedSchool = schoolFilterSelect.value;
        const availablePlayerElements = availablePlayersList.querySelectorAll(".player");
        availablePlayerElements.forEach(player => {
            const name = player.dataset.name?.toLowerCase() || '';
            const position = player.dataset.position || '';
            const school = player.dataset.school || '';
            const matchPos = !selectedPos || position.includes(selectedPos);
            const matchSchool = !selectedSchool || school === selectedSchool;
            const matchSearch = !searchTerm || name.includes(searchTerm) || position.toLowerCase().includes(searchTerm) || school.toLowerCase().includes(searchTerm);
            player.style.display = (matchPos && matchSchool && matchSearch) ? "" : "none";
        });
    }

    // --- Reveal Logic ---
    function displayAllSubmissions(allDrafts) {
        allDraftsDiv.innerHTML = "";
        submittedDraftsContainer.style.display = 'block';
        if (!currentGameState || !currentGameState.expectedPlayers) { allDraftsDiv.innerHTML = "Error: Missing player list."; return; }
        currentGameState.expectedPlayers.forEach(username => {
             const userDraftData = allDrafts[username];
             const submissionDiv = document.createElement("div");
             submissionDiv.className = 'submission';
             let picksHtml = '';
             if (userDraftData && Array.isArray(userDraftData)) {
                 picksHtml = userDraftData.map(p => `<div>${p.pick}. ${p.playerText || '---'}</div>`).join("");
                 submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong>${picksHtml}`;
             } else { submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong> (Data not available)`; }
             allDraftsDiv.appendChild(submissionDiv);
        });
    }

    // --- Utility: Enable/Disable Drafting Interaction ---
    function toggleDraftingInteraction(enabled) {
        searchFilterInput.disabled = !enabled;
        positionFilterSelect.disabled = !enabled;
        schoolFilterSelect.disabled = !enabled;
        const canInteract = enabled && !(currentGameState?.submittedPlayers?.includes(currentUser));
        resetDraftButton.disabled = !canInteract;
        submitButton.disabled = !canInteract;
        if (availablePlayersSortable) { availablePlayersSortable.option("disabled", !enabled); }
        draftSlotSortables.forEach(sortable => { sortable.option("disabled", !enabled); });
        const draftArea = document.querySelector('.lists-wrapper');
        if (draftArea) { draftArea.style.opacity = enabled ? '1' : '0.6'; }
    }

    // --- Initial Load / URL Handling ---
    function handleUrlGameId() {
         console.log('DEBUG: handleUrlGameId started.'); // <-- Logging
         const pathParts = window.location.pathname.split('/');
         console.log('DEBUG: window.location.pathname is:', window.location.pathname); // <-- Logging
         console.log('DEBUG: pathParts are:', pathParts); // <-- Logging

         // Expecting path like /game/GAME_ID, so length should be 3 parts: ["", "game", "GAME_ID"]
         if (pathParts.length === 3 && pathParts[1] === 'game') {
             const gameIdFromUrl = pathParts[2];
             console.log('DEBUG: Path matches /game/ structure.'); // <-- Logging
             if (gameIdFromUrl && gameIdFromUrl.length > 0) { // Check if gameId is not empty
                 currentGameId = gameIdFromUrl;
                 currentPhase = 'login';
                 console.log(`DEBUG: Game ID found: ${currentGameId}. Setting phase to 'login'.`); // <-- Logging
             } else {
                 currentPhase = 'setup';
                 console.log("DEBUG: Path matched /game/ but game ID was empty. Setting phase to 'setup'."); // <-- Logging
             }
         } else {
             currentPhase = 'setup';
             console.log("DEBUG: URL path does not match /game/GAME_ID pattern. Setting phase to 'setup'."); // <-- Logging
         }
         console.log('DEBUG: handleUrlGameId finished. currentPhase is now:', currentPhase); // <-- Logging
    }

    // --- Event Listeners ---
    setupButton.addEventListener('click', () => {
        const names = playerNamesInput.value.split(',').map(n => n.trim()).filter(Boolean);
        if (names.length > 0) { clearStatus(setupError); socket.emit('setupGame', names); }
        else { displayStatus('Please enter at least one player name.', setupError); }
    });
    playerNamesInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setupButton.click(); });

    copyLinkButton.addEventListener('click', () => {
        shareLinkInput.select(); shareLinkInput.setSelectionRange(0, 99999);
        try {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareLinkInput.value).then(() => { alert('Link copied!'); }).catch(err => { document.execCommand('copy'); alert('Link copied (fallback).'); });
            } else { document.execCommand('copy'); alert('Link copied (fallback).'); }
        } catch (err) { alert('Failed to copy link automatically.'); }
    });

    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username && currentGameId) {
            clearStatus(loginStatus); displayStatus('Attempting to join...', loginStatus, false);
            socket.emit('requestJoin', { gameId: currentGameId, username });
        } else if (!currentGameId) { displayStatus('Error: No game ID specified. Use a join link.', loginStatus); }
        else { displayStatus('Please enter your name.', loginStatus); }
    });
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginButton.click(); });

    searchFilterInput.addEventListener('input', filterPlayers);
    positionFilterSelect.addEventListener('change', filterPlayers);
    schoolFilterSelect.addEventListener('change', filterPlayers);
    resetDraftButton.addEventListener('click', resetDraft);
    submitButton.addEventListener('click', submitDraft);

    console.log("Client script loaded. Waiting for DOM and Socket connection...");
    // Initial UI state set via 'connect' event handler

}); // End DOMContentLoaded