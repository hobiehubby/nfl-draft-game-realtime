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

    // Check if essential button exists immediately after DOM load
    if (!setupButton) { console.error("CRITICAL ERROR: Could not find setupButton element on page load!"); }


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


    // --- Player Data (MUST BE CONSISTENT WITH server.js) ---
    // REPLACE THIS EXAMPLE WITH YOUR FULL PLAYER LIST
    const playersData = [
        // QB
        { name: "Carson Beck", position: "QB", school: "Georgia" },
        { name: "Shedeur Sanders", position: "QB", school: "Colorado" },
        // ... Add ALL your players here ...
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
        } else {
            console.error(`ERROR: Tried to show unknown section '${sectionId}'`);
        }
    }

    function displayStatus(message, element = generalStatus, isError = true) {
        if (!element) { console.error("ERROR: displayStatus called with null element"); return; }
        element.textContent = message;
        element.className = `status-message ${isError ? 'error' : 'info'}`;
        element.style.display = message ? 'block' : 'none';
    }

    function clearStatus(element = generalStatus) {
        displayStatus('', element);
    }


    // --- Socket Event Handlers ---

    socket.on('connect', () => {
        console.log('DEBUG: Socket connected.');
        clearStatus(generalStatus);
        handleUrlGameId();
        console.log(`DEBUG: After handleUrlGameId in connect event, phase is: ${currentPhase}`);
        updateUIBasedOnState();
        console.log('DEBUG: updateUIBasedOnState called from connect event.');
    });

    socket.on('disconnect', (reason) => {
        displayStatus(`Disconnected from server: ${reason}. Attempting to reconnect...`);
        toggleDraftingInteraction(false);
    });

    socket.on('errorMsg', (message) => {
        console.error("Server Error Message:", message); // Log error
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
        console.log("DEBUG: gameCreated event received", { gameId, expectedPlayers });
        currentGameId = gameId;
        currentGameState = {
            gameId: gameId, phase: 'login', expectedPlayers: expectedPlayers,
            loggedInUsernames: [], submittedPlayers: []
        };
        currentPhase = 'lobby'; // Show lobby after creating
        const link = `${window.location.origin}/game/${gameId}`;
        shareLinkInput.value = link;
        updatePlayerStatusList(lobbyPlayerList, currentGameState);
        showSection('shareSection');
        displayStatus(`Game created! Share link above. Waiting for players...`, lobbyStatus, false);
    });

    socket.on('joinSuccess', ({ username, gameState, draft }) => {
        console.log("DEBUG: joinSuccess event received", { username, gameState, draftExists: !!draft });
        currentUser = username;
        currentGameId = gameState.gameId;
        currentGameState = gameState;
        currentPhase = gameState.phase;
        clearStatus(loginStatus);
        usernameInput.value = '';

        if (currentPhase === 'drafting' || currentPhase === 'reveal') {
             if (!draftSlotSortables.length) { initializeDraftBoard(); }
             if (draft) { loadDraftState(draft); }
             else { localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); }
        }
        updateUIBasedOnState();
    });

    socket.on('gameStateUpdate', (gameState) => {
        console.log("DEBUG: gameStateUpdate event received", gameState);
        currentGameState = gameState;
        // Only update phase if not in lobby, or if server moves phase forward
        if (currentPhase !== 'lobby' || ['drafting', 'reveal'].includes(gameState.phase)) {
            currentPhase = gameState.phase;
        }
        updateUIBasedOnState();
    });

    socket.on('gamePhaseChanged', (newPhase) => {
        console.log("DEBUG: gamePhaseChanged event received:", newPhase);
        if (newPhase === 'drafting' && currentPhase !== 'drafting') {
            if (!draftSlotSortables.length) { initializeDraftBoard(); }
            localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        }
        currentPhase = newPhase;
        updateUIBasedOnState();
    });

    socket.on('revealAllDrafts', (allDrafts) => {
        console.log("DEBUG: revealAllDrafts event received");
         if (currentPhase === 'reveal') {
            displayAllSubmissions(allDrafts);
            toggleDraftingInteraction(false);
         } else { console.warn("Received reveal data but not in reveal phase."); }
    });

    socket.on('submitSuccess', () => {
        console.log("DEBUG: submitSuccess event received");
        if (currentUser && currentGameState && !currentGameState.submittedPlayers.includes(currentUser)) {
            currentGameState.submittedPlayers.push(currentUser); // Optimistically update local state
        }
        alert(`Your draft has been submitted successfully! Waiting for others...`);
        toggleDraftingInteraction(false);
        updateUIBasedOnState(); // Refresh UI reflecting submission
    });


    // --- UI Update Logic ---

    function updateUIBasedOnState() {
         console.log(`DEBUG: updateUIBasedOnState called. currentPhase = ${currentPhase}`);
        clearStatus(generalStatus);

        if (currentGameState) {
            gameIdDisplay.textContent = currentGameState.gameId || 'N/A';
            updatePlayerStatusList(lobbyPlayerList, currentGameState);
            updatePlayerStatusList(loginPlayerList, currentGameState);
            updateSubmissionStatus();
        } else { gameIdDisplay.textContent = 'N/A'; }

        switch (currentPhase) {
            case 'setup': console.log("DEBUG: updateUI - Showing 'setupSection'"); showSection('setupSection'); break;
            case 'lobby': console.log("DEBUG: updateUI - Showing 'shareSection' (Lobby)"); showSection('shareSection');
                 if(currentGameState?.expectedPlayers && currentGameState.loggedInUsernames?.length === currentGameState.expectedPlayers.length){ displayStatus("All players ready! Starting game...", lobbyStatus, false); }
                 else { displayStatus("Waiting for players to join via the link...", lobbyStatus, false); } break;
            case 'login': console.log("DEBUG: updateUI - Showing 'loginSection'"); showSection('loginSection');
                 loginHeader.textContent = `Join Game: ${currentGameId || '...'}`; displayStatus('', loginStatus); break;
            case 'drafting': console.log("DEBUG: updateUI - Showing 'draftContainer' (Drafting)"); showSection('draftContainer');
                 submittedDraftsContainer.style.display = 'none';
                 if (currentUser) { currentUserInfo.textContent = `Drafting as: ${currentUser}`; const isSubmitted = currentGameState?.submittedPlayers?.includes(currentUser); toggleDraftingInteraction(!isSubmitted); }
                 else { currentUserInfo.textContent = "Waiting for user info..."; toggleDraftingInteraction(false); }
                 if (!draftSlotSortables.length) { initializeDraftBoard(); } break;
            case 'reveal': console.log("DEBUG: updateUI - Showing 'draftContainer' (Reveal)"); showSection('draftContainer');
                 submittedDraftsContainer.style.display = 'block';
                 if (currentUser) { currentUserInfo.textContent = `Viewing Results as: ${currentUser}`; }
                 toggleDraftingInteraction(false);
                 if (!draftSlotSortables.length) { initializeDraftBoard(); } break;
            default: console.log(`DEBUG: updateUI - Unknown phase '${currentPhase}', defaulting to 'setupSection'`); showSection('setupSection');
         }
         console.log("DEBUG: updateUI - Finished.");
    }


    function updatePlayerStatusList(listElement, gameState) {
        if (!listElement || !gameState || !gameState.expectedPlayers) return;
        listElement.innerHTML = '';
        gameState.expectedPlayers.forEach(player => {
            const li = document.createElement('li'); let status = ''; let liClass = '';
            if (gameState.loggedInUsernames?.includes(player)) { status = ' (Ready)'; liClass = 'ready'; }
            if (gameState.submittedPlayers?.includes(player)) { status = ' (Submitted)'; liClass = 'submitted'; }
            li.textContent = `${player}${status}`; if (liClass) li.className = liClass; listElement.appendChild(li);
        });
    }

    function updateSubmissionStatus() {
        if (!currentGameState || !currentGameState.expectedPlayers) { submissionStatusDiv.textContent = 'Awaiting game data...'; return; };
        const submittedCount = currentGameState.submittedPlayers?.length || 0; const totalPlayers = currentGameState.expectedPlayers.length;
        let statusText = `Submissions: ${submittedCount} / ${totalPlayers}`;
        if (currentPhase === 'drafting' && submittedCount < totalPlayers) { const waitingCount = totalPlayers - submittedCount; statusText += ` (Waiting for ${waitingCount})`; }
        else if (currentPhase === 'reveal' || submittedCount === totalPlayers) { statusText += ` (All Submitted!)`; }
        submissionStatusDiv.textContent = statusText;
    }

    // --- Draft Board Logic --- (Functions: initialize, populatePlayers, createPlayerElement, populateSchoolFilter, createDraftSlots, handlePlayerDrop, handlePlayerRemove) ---
    function initializeDraftBoard() { console.log("DEBUG: Initializing draft board UI..."); pickRangeSpan.textContent = `#1 - #${draftSlots}`; populatePlayers(); populateSchoolFilter(); createDraftSlots(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); filterPlayers(); console.log("DEBUG: Draft board initialized."); }
    function populatePlayers() { availablePlayersList.innerHTML = ''; playersData.forEach(player => availablePlayersList.appendChild(createPlayerElement(player))); if (availablePlayersSortable) availablePlayersSortable.destroy(); availablePlayersSortable = Sortable.create(availablePlayersList, { group: { name: "players", pull: true, put: true }, animation: 150, sort: true, filter: '.player-disabled', preventOnFilter: true, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); }
    function createPlayerElement(player) { const playerDiv = document.createElement("div"); playerDiv.className = "player"; playerDiv.dataset.position = player.position; playerDiv.dataset.school = player.school; playerDiv.dataset.name = player.name; playerDiv.textContent = `${player.name} - ${player.position} - ${player.school}`; return playerDiv; }
    function populateSchoolFilter() { const schools = [...new Set(playersData.map(p => p.school).filter(Boolean))].sort(); schoolFilterSelect.innerHTML = '<option value="">All Schools</option>'; schools.forEach(school => { const option = document.createElement("option"); option.value = school; option.textContent = school; schoolFilterSelect.appendChild(option); }); }
    function createDraftSlots() { draftSlotsContainer.innerHTML = ''; draftSlotSortables = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.createElement("div"); slot.className = "draft-slot"; slot.id = `slot-${i}`; slot.dataset.pickNumber = i; const pickNumberSpan = document.createElement("span"); pickNumberSpan.className = "pick-number"; pickNumberSpan.textContent = `${i}.`; slot.appendChild(pickNumberSpan); draftSlotsContainer.appendChild(slot); const sortable = Sortable.create(slot, { group: { name: "players", pull: true, put: true }, animation: 150, onAdd: handlePlayerDrop, onRemove: handlePlayerRemove, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); draftSlotSortables.push(sortable); } }
    function handlePlayerDrop(evt) { const playerElement = evt.item; const targetSlot = evt.to; if (!targetSlot.classList.contains('draft-slot')) return; if (currentGameState?.submittedPlayers?.includes(currentUser)) { console.warn("Attempted drop after submission."); (evt.from || availablePlayersList).appendChild(playerElement); return; } const existingPlayers = Array.from(targetSlot.children).filter(child => child.classList.contains('player')); if (existingPlayers.length > 1) { const playerToRemove = existingPlayers.find(p => p !== playerElement); if (playerToRemove) { availablePlayersList.appendChild(playerToRemove); } } targetSlot.classList.add('slot-filled'); if (window.navigator.vibrate) window.navigator.vibrate(50); updateLocalDraftState(); sendDraftUpdateToServer(); }
    function handlePlayerRemove(evt) { const sourceSlot = evt.from; if (sourceSlot.classList.contains('draft-slot')) { sourceSlot.classList.remove('slot-filled'); updateLocalDraftState(); sendDraftUpdateToServer(); } }

    // --- Draft State Management --- (Functions: updateLocalDraftState, sendDraftUpdateToServer, loadDraftState, resetDraftVisuals, resetDraft, submitDraft) ---
    function updateLocalDraftState() { localDraft = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.getElementById(`slot-${i}`); const playerEl = slot?.querySelector(".player"); localDraft.push({ pick: i, playerText: playerEl ? playerEl.textContent : null }); } }
    function sendDraftUpdateToServer() { clearTimeout(debounceTimeout); debounceTimeout = setTimeout(() => { if (currentPhase === 'drafting' && !(currentGameState?.submittedPlayers?.includes(currentUser))) { updateLocalDraftState(); console.log("DEBUG: Sending draft update to server..."); socket.emit('updateDraft', localDraft); } }, 750); }
    function loadDraftState(draftToLoad) { if (!draftToLoad || !Array.isArray(draftToLoad)) { console.warn("Invalid draft state provided."); return; } resetDraftVisuals(); draftToLoad.forEach(pickData => { if (pickData.playerText) { const slot = document.getElementById(`slot-${pickData.pick}`); const playerElement = Array.from(availablePlayersList.querySelectorAll('.player')).find(p => p.textContent === pickData.playerText); if (playerElement && slot) { if (!slot.querySelector('.player')) { slot.appendChild(playerElement); slot.classList.add('slot-filled'); } else { console.warn(`Slot ${pickData.pick} occupied loading ${pickData.playerText}`); } } else if (!playerElement) { console.warn(`Player "${pickData.playerText}" pick ${pickData.pick} not available.`); } } }); updateLocalDraftState(); filterPlayers(); }
    function resetDraftVisuals() { const slots = draftSlotsContainer.querySelectorAll('.draft-slot'); slots.forEach(slot => { const player = slot.querySelector('.player'); if (player) { availablePlayersList.appendChild(player); slot.classList.remove('slot-filled'); } }); filterPlayers(); }
    function resetDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot reset draft now."); return; } if (!confirm(`Reset current draft selections, ${currentUser}?`)) return; resetDraftVisuals(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); sendDraftUpdateToServer(); }
    function submitDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot submit draft now."); return; } updateLocalDraftState(); let filledSlots = localDraft.filter(p => p.playerText !== null).length; let confirmationMessage = `Submit final draft? (${filledSlots}/${draftSlots} picks). No changes allowed.`; if (filledSlots < draftSlots) { confirmationMessage = `Warning: Only ${filledSlots}/${draftSlots} picks made. Submit anyway? No changes allowed.`; } if (confirm(confirmationMessage)) { console.log("DEBUG: Submitting final draft..."); socket.emit('submitDraft', localDraft); } }

    // --- Filter Logic ---
    function filterPlayers() { const searchTerm = searchFilterInput.value.toLowerCase(); const selectedPos = positionFilterSelect.value; const selectedSchool = schoolFilterSelect.value; const availablePlayerElements = availablePlayersList.querySelectorAll(".player"); availablePlayerElements.forEach(player => { const name = player.dataset.name?.toLowerCase() || ''; const position = player.dataset.position || ''; const school = player.dataset.school || ''; const matchPos = !selectedPos || position.includes(selectedPos); const matchSchool = !selectedSchool || school === selectedSchool; const matchSearch = !searchTerm || name.includes(searchTerm) || position.toLowerCase().includes(searchTerm) || school.toLowerCase().includes(searchTerm); player.style.display = (matchPos && matchSchool && matchSearch) ? "" : "none"; }); }

    // --- Reveal Logic ---
    function displayAllSubmissions(allDrafts) { allDraftsDiv.innerHTML = ""; submittedDraftsContainer.style.display = 'block'; if (!currentGameState || !currentGameState.expectedPlayers) { allDraftsDiv.innerHTML = "Error: Missing player list."; return; } currentGameState.expectedPlayers.forEach(username => { const userDraftData = allDrafts[username]; const submissionDiv = document.createElement("div"); submissionDiv.className = 'submission'; let picksHtml = ''; if (userDraftData && Array.isArray(userDraftData)) { picksHtml = userDraftData.map(p => `<div>${p.pick}. ${p.playerText || '---'}</div>`).join(""); submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong>${picksHtml}`; } else { submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong> (Data not available)`; } allDraftsDiv.appendChild(submissionDiv); }); }

    // --- Utility: Enable/Disable Drafting Interaction ---
    function toggleDraftingInteraction(enabled) { searchFilterInput.disabled = !enabled; positionFilterSelect.disabled = !enabled; schoolFilterSelect.disabled = !enabled; const canInteract = enabled && !(currentGameState?.submittedPlayers?.includes(currentUser)); resetDraftButton.disabled = !canInteract; submitButton.disabled = !canInteract; if (availablePlayersSortable) { availablePlayersSortable.option("disabled", !enabled); } draftSlotSortables.forEach(sortable => { sortable.option("disabled", !enabled); }); const draftArea = document.querySelector('.lists-wrapper'); if (draftArea) { draftArea.style.opacity = enabled ? '1' : '0.6'; } }

    // --- Initial Load / URL Handling ---
    function handleUrlGameId() {
         console.log('DEBUG: handleUrlGameId started.');
         const pathParts = window.location.pathname.split('/');
         console.log('DEBUG: window.location.pathname is:', window.location.pathname);
         console.log('DEBUG: pathParts are:', pathParts);
         if (pathParts.length === 3 && pathParts[1] === 'game') {
             const gameIdFromUrl = pathParts[2];
             console.log('DEBUG: Path matches /game/ structure.');
             if (gameIdFromUrl && gameIdFromUrl.length > 0) {
                 currentGameId = gameIdFromUrl; currentPhase = 'login';
                 console.log(`DEBUG: Game ID found: ${currentGameId}. Setting phase to 'login'.`);
             } else { currentPhase = 'setup'; console.log("DEBUG: Path matched /game/ but game ID was empty. Setting phase to 'setup'."); }
         } else { currentPhase = 'setup'; console.log("DEBUG: URL path does not match /game/GAME_ID pattern. Setting phase to 'setup'."); }
         console.log('DEBUG: handleUrlGameId finished. currentPhase is now:', currentPhase);
    }

    // --- Event Listeners ---
    // Ensure setupButton exists before adding listener
    if (setupButton) {
        setupButton.addEventListener('click', () => {
            console.log('DEBUG: Create Game button CLICKED!'); // Log click
            const names = playerNamesInput.value.split(',').map(n => n.trim()).filter(Boolean);
            console.log('DEBUG: Names entered:', names);
            if (names.length > 0) {
                clearStatus(setupError);
                console.log('DEBUG: Emitting setupGame event with names:', names);
                socket.emit('setupGame', names);
            } else {
                console.log('DEBUG: No names entered.');
                displayStatus('Please enter at least one player name.', setupError);
            }
        });
        playerNamesInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setupButton.click(); });
    } else {
        console.error("ERROR: setupButton not found, cannot attach click listener.");
    }

    // Other listeners
    if (copyLinkButton) {
        copyLinkButton.addEventListener('click', () => {
            shareLinkInput.select();
            shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
            try {
                let copied = false;
                // Use Clipboard API if available (more modern)
                if (navigator.clipboard) {
                   navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                        copied = true;
                        alert('Link copied!');
                    }).catch(err => {
                        console.warn('Clipboard API copy failed, trying fallback:', err);
                        // Fallback needed
                        copied = document.execCommand('copy');
                        if (copied) {
                           alert('Link copied (fallback method).');
                        } else {
                           throw new Error('execCommand failed');
                        }
                    });
                } else {
                     // Fallback for very old browsers
                     copied = document.execCommand('copy');
                     if (copied) {
                        alert('Link copied (fallback method).');
                     } else {
                        throw new Error('execCommand failed');
                     }
                }
            } catch (err) {
                console.error('Copying failed overall:', err);
                alert('Failed to copy link automatically. Please copy it manually.');
            }
        });
    } else {
        console.error("ERROR: copyLinkButton not found, cannot attach click listener.");
    }
    loginButton?.addEventListener('click', () => { /* ... login logic ... */ }); // Added '?'
    usernameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginButton?.click(); }); // Added '?'

    searchFilterInput?.addEventListener('input', filterPlayers); // Added '?'
    positionFilterSelect?.addEventListener('change', filterPlayers); // Added '?'
    schoolFilterSelect?.addEventListener('change', filterPlayers); // Added '?'
    resetDraftButton?.addEventListener('click', resetDraft); // Added '?'
    submitButton?.addEventListener('click', submitDraft); // Added '?'

    console.log("Client script loaded. Waiting for DOM and Socket connection...");
    // Initial UI state set via 'connect' event handler

}); // End DOMContentLoaded