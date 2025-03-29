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

    // Check essential buttons early
    if (!setupButton) { console.error("CRITICAL ERROR: Could not find setupButton on page load!"); }
    if (!copyLinkButton) { console.warn("Warning: Could not find copyLinkButton on page load (listener attached later)."); }
    if (!loginButton) { console.warn("Warning: Could not find loginButton on page load (listener attached later)."); }

    // --- Global Client State ---
    let currentUser = null;
    let currentGameId = null;
    let currentPhase = 'setup';
    let currentGameState = null;
    let availablePlayersSortable = null;
    let draftSlotSortables = [];
    const draftSlots = 32;
    let localDraft = [];
    let debounceTimeout = null;
    let loginListenersAttached = false;
    let setupListenersAttached = false;
    let copyLinkListenerAttached = false;
    let revealedDraftsData = null; // <--- Variable to store draft data for reveal

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
        sections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) { sectionToShow.style.display = sectionId === 'draftContainer' ? 'flex' : 'block'; }
        else { console.error(`ERROR: Tried to show unknown section '${sectionId}'`); }
    }

    function displayStatus(message, element = generalStatus, isError = true) {
        if (!element) { console.error("ERROR: displayStatus called with null element"); return; }
        element.textContent = message; element.className = `status-message ${isError ? 'error' : 'info'}`;
        element.style.display = message ? 'block' : 'none';
    }

    function clearStatus(element = generalStatus) { displayStatus('', element); }

    // --- Socket Event Handlers ---
    socket.on('connect', () => {
        console.log('DEBUG: Socket connected.'); clearStatus(generalStatus);
        handleUrlGameId(); console.log(`DEBUG: After handleUrlGameId in connect event, phase is: ${currentPhase}`);
        updateUIBasedOnState(); console.log('DEBUG: updateUIBasedOnState called from connect event.');
    });
    socket.on('disconnect', (reason) => { displayStatus(`Disconnected: ${reason}. Reconnecting...`); toggleDraftingInteraction(false); });
    socket.on('errorMsg', (message) => { console.error("Server Error:", message); if (currentPhase === 'setup') displayStatus(message, setupError); else if (currentPhase === 'login') displayStatus(message, loginStatus); else displayStatus(message, generalStatus); });
    socket.on('forceDisconnect', (message) => { alert(`Disconnected: ${message}`); toggleDraftingInteraction(false); socket.disconnect(); });
    socket.on('gameCreated', ({ gameId, expectedPlayers }) => {
        console.log("DEBUG: gameCreated received", { gameId, expectedPlayers }); currentGameId = gameId;
        currentGameState = { gameId: gameId, phase: 'login', expectedPlayers: expectedPlayers, loggedInUsernames: [], submittedPlayers: [] };
        currentPhase = 'lobby'; const link = `${window.location.origin}/game/${gameId}`; shareLinkInput.value = link;
        updatePlayerStatusList(lobbyPlayerList, currentGameState); showSection('shareSection');
        displayStatus(`Game created! Share link. Waiting...`, lobbyStatus, false);
        attachCopyLinkListener(); // Attach listener when lobby shown
    });
    socket.on('joinSuccess', ({ username, gameState, draft }) => {
        console.log("DEBUG: joinSuccess received", { username, gameState, draftExists: !!draft }); currentUser = username;
        currentGameId = gameState.gameId; currentGameState = gameState; currentPhase = gameState.phase;
        clearStatus(loginStatus); if (usernameInput) usernameInput.value = '';
        if (currentPhase === 'drafting' || currentPhase === 'reveal') {
            if (!draftSlotSortables.length) { initializeDraftBoard(); }
            if (draft) { loadDraftState(draft); } else { localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); }
        }
        updateUIBasedOnState();
    });
    socket.on('gameStateUpdate', (gameState) => {
        console.log("DEBUG: gameStateUpdate received", gameState); currentGameState = gameState;
        if (currentPhase !== 'lobby' || ['drafting', 'reveal'].includes(gameState.phase)) { currentPhase = gameState.phase; }
        updateUIBasedOnState();
    });
    socket.on('gamePhaseChanged', (newPhase) => {
        console.log("DEBUG: gamePhaseChanged received:", newPhase);
        if (newPhase === 'drafting' && currentPhase !== 'drafting') {
            if (!draftSlotSortables.length) { initializeDraftBoard(); }
            localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null }));
        }
        currentPhase = newPhase; updateUIBasedOnState(); // Update UI *after* phase change
    });
    socket.on('revealAllDrafts', (allDrafts) => { // <--- MODIFIED HANDLER
        console.log("DEBUG: revealAllDrafts event received with data:", allDrafts);
        revealedDraftsData = allDrafts; // Store the received data

        // Try to display immediately ONLY if we are ALREADY in reveal phase
        if (currentPhase === 'reveal') {
            console.log("DEBUG: Already in reveal phase, calling displayAllSubmissions immediately.");
            displayAllSubmissions(revealedDraftsData);
            toggleDraftingInteraction(false);
        } else {
             console.log("DEBUG: Not in reveal phase yet, stored drafts for later display.");
        }
    });
    socket.on('submitSuccess', () => {
        console.log("DEBUG: submitSuccess received");
        if (currentUser && currentGameState && !currentGameState.submittedPlayers.includes(currentUser)) { currentGameState.submittedPlayers.push(currentUser); }
        alert(`Draft submitted! Waiting for others...`); toggleDraftingInteraction(false); updateUIBasedOnState();
    });

    // --- UI Update Logic ---
    function updateUIBasedOnState() {
        console.log(`DEBUG: updateUIBasedOnState called. currentPhase = ${currentPhase}`); clearStatus(generalStatus);
        if (currentGameState) {
            gameIdDisplay.textContent = currentGameState.gameId || 'N/A';
            updatePlayerStatusList(lobbyPlayerList, currentGameState);
            updatePlayerStatusList(loginPlayerList, currentGameState);
            updateSubmissionStatus();
        } else {
            gameIdDisplay.textContent = 'N/A';
            if (lobbyPlayerList) lobbyPlayerList.innerHTML = '';
            if (loginPlayerList) loginPlayerList.innerHTML = '';
        }

        // Reset listener flags when switching sections
        if (currentPhase !== 'login') loginListenersAttached = false;
        if (currentPhase !== 'setup') setupListenersAttached = false;
        if (currentPhase !== 'lobby') copyLinkListenerAttached = false;

        switch (currentPhase) {
            case 'setup':
                console.log("DEBUG: updateUI - Showing 'setupSection'"); showSection('setupSection');
                attachSetupListeners();
                break;
            case 'lobby':
                console.log("DEBUG: updateUI - Showing 'shareSection' (Lobby)"); showSection('shareSection');
                if(currentGameState?.expectedPlayers && currentGameState.loggedInUsernames?.length === currentGameState.expectedPlayers.length){ displayStatus("All players ready! Starting...", lobbyStatus, false); }
                else { displayStatus("Waiting for players via link...", lobbyStatus, false); }
                attachCopyLinkListener();
                break;
            case 'login':
                console.log("DEBUG: updateUI - Showing 'loginSection'"); showSection('loginSection');
                loginHeader.textContent = `Join Game: ${currentGameId || '...'}`;
                if (currentGameState) { updatePlayerStatusList(loginPlayerList, currentGameState); displayStatus('Enter your name from list to join.', loginStatus, false); }
                else { displayStatus('Waiting for game info...', loginStatus, false); if (loginPlayerList) loginPlayerList.innerHTML = '<li>Loading...</li>'; }
                attachLoginListeners();
                break;
            case 'drafting':
                console.log("DEBUG: updateUI - Showing 'draftContainer' (Drafting)"); showSection('draftContainer');
                submittedDraftsContainer.style.display = 'none';
                if (currentUser) { currentUserInfo.textContent = `Drafting as: ${currentUser}`; const isSubmitted = currentGameState?.submittedPlayers?.includes(currentUser); toggleDraftingInteraction(!isSubmitted); }
                else { currentUserInfo.textContent = "Waiting..."; toggleDraftingInteraction(false); }
                if (!draftSlotSortables.length) { initializeDraftBoard(); }
                attachDraftingListeners();
                break;
            case 'reveal': // <--- MODIFIED CASE
                console.log("DEBUG: updateUI - Showing 'draftContainer' (Reveal)");
                showSection('draftContainer');
                submittedDraftsContainer.style.display = 'block'; // Show the container
                if (currentUser) { currentUserInfo.textContent = `Viewing Results as: ${currentUser}`; }
                toggleDraftingInteraction(false); // Ensure disabled

                // Check if we have the draft data and display it
                if (revealedDraftsData) {
                    console.log("DEBUG: updateUI - In reveal phase and have draft data, calling displayAllSubmissions.");
                    displayAllSubmissions(revealedDraftsData);
                } else {
                     console.log("DEBUG: updateUI - In reveal phase but waiting for draft data.");
                     // Optionally show a "Loading results..." message
                     if (allDraftsDiv) allDraftsDiv.innerHTML = '<p>Loading submitted drafts...</p>';
                }

                // Initialize board visually if needed (e.g., for page refresh during reveal)
                if (!draftSlotSortables.length) { initializeDraftBoard(); }
                break;
             default:
                 console.log(`DEBUG: updateUI - Unknown phase '${currentPhase}', defaulting to 'setupSection'`); showSection('setupSection');
                 attachSetupListeners();
         }
         console.log("DEBUG: updateUI - Finished.");
    }

    // --- Listener Attachment Functions ---
    // (attachSetupListeners, attachLoginListeners, attachCopyLinkListener, attachDraftingListeners)
    // Ensure these functions correctly find elements and attach listeners only once using flags
    function attachSetupListeners() { if (setupListenersAttached || !setupButton || !playerNamesInput) return; console.log("DEBUG: Attaching Setup listeners."); setupButton.addEventListener('click', () => { console.log('DEBUG: Create Game CLICKED!'); const names = playerNamesInput.value.split(',').map(n => n.trim()).filter(Boolean); console.log('DEBUG: Names entered:', names); if (names.length > 0) { clearStatus(setupError); console.log('DEBUG: Emitting setupGame...'); socket.emit('setupGame', names); } else { console.log('DEBUG: No names.'); displayStatus('Enter player name(s).', setupError); } }); playerNamesInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setupButton.click(); }); setupListenersAttached = true; }
    function attachLoginListeners() { if (loginListenersAttached || !loginButton || !usernameInput) return; console.log("DEBUG: Attaching Login listeners."); loginButton.addEventListener('click', () => { console.log("DEBUG: Join Game CLICKED!"); const username = usernameInput.value.trim(); console.log(`DEBUG: Join attempt - User: '${username}', GameID: '${currentGameId}'`); if (username && currentGameId) { clearStatus(loginStatus); displayStatus('Joining...', loginStatus, false); console.log("DEBUG: Emitting 'requestJoin'..."); socket.emit('requestJoin', { gameId: currentGameId, username }); } else if (!currentGameId) { console.log("DEBUG: Join fail - No gameId"); displayStatus('Error: No game ID.', loginStatus); } else { console.log("DEBUG: Join fail - No username"); displayStatus('Enter your name.', loginStatus); } }); usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { console.log("DEBUG: Enter in login input"); loginButton.click(); } }); loginListenersAttached = true; }
    function attachCopyLinkListener() { if (copyLinkListenerAttached || !copyLinkButton || !shareLinkInput) return; console.log("DEBUG: Attaching Copy Link listener."); copyLinkButton.addEventListener('click', () => { console.log("DEBUG: Copy Link CLICKED!"); shareLinkInput.select(); shareLinkInput.setSelectionRange(0, 99999); try { let copied = false; if (navigator.clipboard) { navigator.clipboard.writeText(shareLinkInput.value).then(() => { copied = true; alert('Link copied!'); }).catch(err => { console.warn('Clipboard API fail:', err); copied = document.execCommand('copy'); if (copied) { alert('Link copied (fallback).'); } else { throw new Error('execCommand fail'); } }); } else { copied = document.execCommand('copy'); if (copied) { alert('Link copied (fallback).'); } else { throw new Error('execCommand fail'); } } } catch (err) { console.error('Copy failed:', err); alert('Copy failed.'); } }); copyLinkListenerAttached = true; }
    function attachDraftingListeners() { /* ... same attach logic for filter/reset/submit listeners ... */ searchFilterInput?.addEventListener('input', filterPlayers); positionFilterSelect?.addEventListener('change', filterPlayers); schoolFilterSelect?.addEventListener('change', filterPlayers); resetDraftButton?.addEventListener('click', resetDraft); submitButton?.addEventListener('click', submitDraft); }

    // --- Other Functions --- (initializeDraftBoard, populatePlayers, etc.)
    // These functions remain largely the same as the last complete version provided.
    // Make sure they are all present below here.
    function initializeDraftBoard() { console.log("DEBUG: Initializing draft board UI..."); pickRangeSpan.textContent = `#1 - #${draftSlots}`; populatePlayers(); populateSchoolFilter(); createDraftSlots(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); filterPlayers(); console.log("DEBUG: Draft board initialized."); }
    function populatePlayers() { availablePlayersList.innerHTML = ''; playersData.forEach(player => availablePlayersList.appendChild(createPlayerElement(player))); if (availablePlayersSortable) availablePlayersSortable.destroy(); availablePlayersSortable = Sortable.create(availablePlayersList, { group: { name: "players", pull: true, put: true }, animation: 150, sort: true, filter: '.player-disabled', preventOnFilter: true, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); }
    function createPlayerElement(player) { const playerDiv = document.createElement("div"); playerDiv.className = "player"; playerDiv.dataset.position = player.position; playerDiv.dataset.school = player.school; playerDiv.dataset.name = player.name; playerDiv.textContent = `${player.name} - ${player.position} - ${player.school}`; return playerDiv; }
    function populateSchoolFilter() { const schools = [...new Set(playersData.map(p => p.school).filter(Boolean))].sort(); schoolFilterSelect.innerHTML = '<option value="">All Schools</option>'; schools.forEach(school => { const option = document.createElement("option"); option.value = school; option.textContent = school; schoolFilterSelect.appendChild(option); }); }
    function createDraftSlots() { draftSlotsContainer.innerHTML = ''; draftSlotSortables = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.createElement("div"); slot.className = "draft-slot"; slot.id = `slot-${i}`; slot.dataset.pickNumber = i; const pickNumberSpan = document.createElement("span"); pickNumberSpan.className = "pick-number"; pickNumberSpan.textContent = `${i}.`; slot.appendChild(pickNumberSpan); draftSlotsContainer.appendChild(slot); const sortable = Sortable.create(slot, { group: { name: "players", pull: true, put: true }, animation: 150, onAdd: handlePlayerDrop, onRemove: handlePlayerRemove, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); draftSlotSortables.push(sortable); } }
    function handlePlayerDrop(evt) { const playerElement = evt.item; const targetSlot = evt.to; if (!targetSlot.classList.contains('draft-slot')) return; if (currentGameState?.submittedPlayers?.includes(currentUser)) { console.warn("Attempted drop after submission."); (evt.from || availablePlayersList).appendChild(playerElement); return; } const existingPlayers = Array.from(targetSlot.children).filter(child => child.classList.contains('player')); if (existingPlayers.length > 1) { const playerToRemove = existingPlayers.find(p => p !== playerElement); if (playerToRemove) { availablePlayersList.appendChild(playerToRemove); } } targetSlot.classList.add('slot-filled'); if (window.navigator.vibrate) window.navigator.vibrate(50); updateLocalDraftState(); sendDraftUpdateToServer(); }
    function handlePlayerRemove(evt) { const sourceSlot = evt.from; if (sourceSlot.classList.contains('draft-slot')) { sourceSlot.classList.remove('slot-filled'); updateLocalDraftState(); sendDraftUpdateToServer(); } }
    function updateLocalDraftState() { localDraft = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.getElementById(`slot-${i}`); const playerEl = slot?.querySelector(".player"); localDraft.push({ pick: i, playerText: playerEl ? playerEl.textContent : null }); } }
    function sendDraftUpdateToServer() { clearTimeout(debounceTimeout); debounceTimeout = setTimeout(() => { if (currentPhase === 'drafting' && !(currentGameState?.submittedPlayers?.includes(currentUser))) { updateLocalDraftState(); console.log("DEBUG: Sending draft update..."); socket.emit('updateDraft', localDraft); } }, 750); }
    function loadDraftState(draftToLoad) { if (!draftToLoad || !Array.isArray(draftToLoad)) { console.warn("Invalid draft state"); return; } resetDraftVisuals(); draftToLoad.forEach(pickData => { if (pickData.playerText) { const slot = document.getElementById(`slot-${pickData.pick}`); const playerElement = Array.from(availablePlayersList.querySelectorAll('.player')).find(p => p.textContent === pickData.playerText); if (playerElement && slot) { if (!slot.querySelector('.player')) { slot.appendChild(playerElement); slot.classList.add('slot-filled'); } else { console.warn(`Slot ${pickData.pick} occupied loading ${pickData.playerText}`); } } else if (!playerElement) { console.warn(`Player "${pickData.playerText}" pick ${pickData.pick} not available.`); } } }); updateLocalDraftState(); filterPlayers(); }
    function resetDraftVisuals() { const slots = draftSlotsContainer.querySelectorAll('.draft-slot'); slots.forEach(slot => { const player = slot.querySelector('.player'); if (player) { availablePlayersList.appendChild(player); slot.classList.remove('slot-filled'); } }); filterPlayers(); }
    function resetDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot reset."); return; } if (!confirm(`Reset selections, ${currentUser}?`)) return; resetDraftVisuals(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); sendDraftUpdateToServer(); }
    function submitDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot submit."); return; } updateLocalDraftState(); let filledSlots = localDraft.filter(p => p.playerText !== null).length; let msg = `Submit final draft? (${filledSlots}/${draftSlots} picks). No changes allowed.`; if (filledSlots < draftSlots) { msg = `Warning: Only ${filledSlots}/${draftSlots} picks made. Submit anyway? No changes allowed.`; } if (confirm(msg)) { console.log("DEBUG: Submitting final draft..."); socket.emit('submitDraft', localDraft); } }
    function filterPlayers() { const searchTerm = searchFilterInput.value.toLowerCase(); const selectedPos = positionFilterSelect.value; const selectedSchool = schoolFilterSelect.value; const availablePlayerElements = availablePlayersList.querySelectorAll(".player"); availablePlayerElements.forEach(player => { const name = player.dataset.name?.toLowerCase() || ''; const position = player.dataset.position || ''; const school = player.dataset.school || ''; const matchPos = !selectedPos || position.includes(selectedPos); const matchSchool = !selectedSchool || school === selectedSchool; const matchSearch = !searchTerm || name.includes(searchTerm) || position.toLowerCase().includes(searchTerm) || school.toLowerCase().includes(searchTerm); player.style.display = (matchPos && matchSchool && matchSearch) ? "" : "none"; }); }
    function displayAllSubmissions(allDrafts) { allDraftsDiv.innerHTML = ""; submittedDraftsContainer.style.display = 'block'; if (!currentGameState || !currentGameState.expectedPlayers) { allDraftsDiv.innerHTML = "Error: Missing player list."; return; } currentGameState.expectedPlayers.forEach(username => { const userDraftData = allDrafts[username]; const submissionDiv = document.createElement("div"); submissionDiv.className = 'submission'; let picksHtml = ''; if (userDraftData && Array.isArray(userDraftData)) { picksHtml = userDraftData.map(p => `<div>${p.pick}. ${p.playerText || '---'}</div>`).join(""); submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong>${picksHtml}`; } else { submissionDiv.innerHTML = `<strong>${username}'s Draft:</strong> (Data not available)`; } allDraftsDiv.appendChild(submissionDiv); }); }
    function toggleDraftingInteraction(enabled) { searchFilterInput.disabled = !enabled; positionFilterSelect.disabled = !enabled; schoolFilterSelect.disabled = !enabled; const canInteract = enabled && !(currentGameState?.submittedPlayers?.includes(currentUser)); resetDraftButton.disabled = !canInteract; submitButton.disabled = !canInteract; if (availablePlayersSortable) { availablePlayersSortable.option("disabled", !enabled); } draftSlotSortables.forEach(sortable => { sortable.option("disabled", !enabled); }); const draftArea = document.querySelector('.lists-wrapper'); if (draftArea) { draftArea.style.opacity = enabled ? '1' : '0.6'; } }
    function handleUrlGameId() { console.log('DEBUG: handleUrlGameId started.'); const pathParts = window.location.pathname.split('/'); console.log('DEBUG: window.location.pathname is:', window.location.pathname); console.log('DEBUG: pathParts are:', pathParts); if (pathParts.length === 3 && pathParts[1] === 'game') { const gameIdFromUrl = pathParts[2]; console.log('DEBUG: Path matches /game/ structure.'); if (gameIdFromUrl && gameIdFromUrl.length > 0) { currentGameId = gameIdFromUrl; currentPhase = 'login'; console.log(`DEBUG: Game ID found: ${currentGameId}. Setting phase to 'login'.`); } else { currentPhase = 'setup'; console.log("DEBUG: Path matched /game/ but game ID was empty. Setting phase to 'setup'."); } } else { currentPhase = 'setup'; console.log("DEBUG: URL path does not match /game/GAME_ID pattern. Setting phase to 'setup'."); } console.log('DEBUG: handleUrlGameId finished. currentPhase is now:', currentPhase); }

    console.log("Client script loaded. Waiting for DOM and Socket connection...");
    // Initial UI state set via 'connect' event handler

}); // End DOMContentLoaded