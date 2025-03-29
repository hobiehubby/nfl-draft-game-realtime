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
    let revealedDraftsData = null;

    // --- Player Data (MUST BE CONSISTENT WITH server.js) ---
    // REPLACE THIS EXAMPLE WITH YOUR FULL PLAYER LIST
    const playersData = [
        { name: "Travis Hunter", position: "WR/CB", school: "Colorado" },
        { name: "Abdul Carter", position: "Edge", school: "Penn State" },
        { name: "Tetairoa McMillan", position: "WR", school: "Arizona" },
        { name: "Mason Graham", position: "DI", school: "Michigan" },
        { name: "Ashton Jeanty", position: "HB", school: "Boise State" },
        { name: "Will Campbell", position: "T", school: "LSU" },
        { name: "Jahdae Barron", position: "CB", school: "Texas" },
        { name: "Tyler Warren", position: "TE", school: "Penn State" },
        { name: "Malaki Starks", position: "S", school: "Georgia" },
        { name: "Jihaad Campbell", position: "LB", school: "Alabama" },
        { name: "Mike Green", position: "Edge", school: "Marshall" },
        { name: "Will Johnson", position: "CB", school: "Michigan" },
        { name: "James Pearce Jr.", position: "Edge", school: "Tennessee" },
        { name: "Donovan Ezeiruaku", position: "Edge", school: "Boston College" },
        { name: "Jalon Walker", position: "LB", school: "Georgia" },
        { name: "Mykel Williams", position: "Edge", school: "Georgia" },
        { name: "Demetrius Knight Jr.", position: "LB", school: "South Carolina" },
        { name: "Xavier Watts", position: "S", school: "Notre Dame" },
        { name: "Nick Emmanwori", position: "S", school: "South Carolina" },
        { name: "Shavon Revel Jr.", position: "CB", school: "East Carolina" },
        { name: "Jaxson Dart", position: "QB", school: "Ole Miss" },
        { name: "RJ Harvey", position: "RB", school: "UCF" },
        { name: "Jaylin Noel", position: "WR", school: "Iowa State" },
        { name: "Mason Taylor", position: "TE", school: "LSU" },
        { name: "Donovan Jackson", position: "IOL", school: "Ohio State" },
        { name: "Darius Alexander", position: "DI", school: "Toledo" },
        { name: "Aeneas Peebles", position: "DI", school: "Virginia Tech" },
        { name: "Kelvin Banks Jr.", position: "T", school: "Texas" },
        { name: "Armand Membou", position: "T", school: "Missouri" },
        { name: "Tyler Booker", position: "OG", school: "Alabama" },
        { name: "Colston Loveland", position: "TE", school: "Michigan" },
        { name: "Omarion Hampton", position: "RB", school: "UNC" },
        { name: "Kenneth Grant", position: "DT", school: "Michigan" },
        { name: "Matthew Golden", position: "WR", school: "Texas" },
        { name: "Emeka Egbuka", position: "WR", school: "Ohio State" },
        { name: "Tyleik Williams", position: "DT", school: "Ohio State" },
        { name: "Luther Burden III", position: "WR", school: "Missouri" },
        { name: "Elic Ayomanor", position: "WR", school: "Stanford" },
        { name: "Shemar Stewart", position: "Edge", school: "Texas A&M" },
        { name: "Shedeur Sanders", position: "QB", school: "Colorado" },
        { name: "Benjamin Morrison", position: "CB", school: "Notre Dame" },
        { name: "TreVeyon Henderson", position: "RB", school: "Ohio State" },
        { name: "Tate Ratledge", position: "OG", school: "Georgia" },
        { name: "Josh Simmons", position: "OT", school: "Ohio State" },
        { name: "Elijah Arroyo", position: "TE", school: "Miami" },
        { name: "Tyler Shough", position: "QB", school: "Louisville" },
        { name: "Alfred Collins", position: "DT", school: "Texas" },
        { name: "Jayden Higgins", position: "WR", school: "Iowa State" },
        { name: "Darien Porter", position: "CB", school: "Iowa State" },
        { name: "Josiah Stewart", position: "OLB", school: "Michigan" },
        { name: "Elijah Roberts", position: "Edge", school: "SMU" },
        { name: "Josh Conerly Jr.", position: "OT", school: "Oregon" },
        { name: "Grey Zabel", position: "OL", school: "NDSU" },
        { name: "Walter Nolen", position: "DT", school: "Ole Miss" },
        { name: "Cam Ward", position: "QB", school: "Miami" },
        { name: "Tyler Van Dyke", position: "QB", school: "Miami" },
        { name: "Braelon Allen", position: "RB", school: "Wisconsin" },
        { name: "Jahmyr Gibbs", position: "RB", school: "Alabama" },
        { name: "Jordan Addison", position: "WR", school: "USC" },
        { name: "Kayshon Boutte", position: "WR", school: "LSU" },
        { name: "Michael Mayer", position: "TE", school: "Notre Dame" }
    ]; // <--- End of playersData array

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

    // --- Function Definition for updatePlayerStatusList ---
    function updatePlayerStatusList(listElement, gameState) {
        if (!listElement || !gameState || !gameState.expectedPlayers) {
            if (listElement) listElement.innerHTML = ''; return;
        }
        listElement.innerHTML = '';
        gameState.expectedPlayers.forEach(player => {
            const li = document.createElement('li'); let status = ''; let liClass = '';
            if (gameState.loggedInUsernames?.includes(player)) { status = ' (Ready)'; liClass = 'ready'; }
            if (gameState.submittedPlayers?.includes(player)) { status = ' (Submitted)'; liClass = 'submitted'; }
            li.textContent = `${player}${status}`; if (liClass) li.className = liClass; listElement.appendChild(li);
        });
    }
    // --- End of function definition ---

    // --- Function Definition for updateSubmissionStatus ---
    function updateSubmissionStatus() {
        if (!currentGameState || !currentGameState.expectedPlayers || !submissionStatusDiv) {
             if(submissionStatusDiv) submissionStatusDiv.textContent = 'Awaiting game data...'; return;
        };
        const submittedCount = currentGameState.submittedPlayers?.length || 0; const totalPlayers = currentGameState.expectedPlayers.length;
        let statusText = `Submissions: ${submittedCount} / ${totalPlayers}`;
        if (currentPhase === 'drafting' && submittedCount < totalPlayers) { const waitingCount = totalPlayers - submittedCount; statusText += ` (Waiting for ${waitingCount})`; }
        else if (currentPhase === 'reveal' || submittedCount === totalPlayers) { if (submittedCount === totalPlayers) { statusText += ` (All Submitted!)`; } }
        submissionStatusDiv.textContent = statusText;
    }
    // --- End of function definition --- (Ensure no stray characters after this closing brace)

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
        attachCopyLinkListener();
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
        currentPhase = newPhase; updateUIBasedOnState();
    });
    socket.on('revealAllDrafts', (allDrafts) => {
        console.log("DEBUG: revealAllDrafts event received with data:", allDrafts);
        revealedDraftsData = allDrafts;
        if (currentPhase === 'reveal') {
            console.log("DEBUG: Already in reveal phase, calling displayAllSubmissions immediately.");
            displayAllSubmissions(revealedDraftsData); toggleDraftingInteraction(false);
        } else { console.log("DEBUG: Not in reveal phase yet, stored drafts for later display."); }
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
            updateSubmissionStatus(); // <-- Call the restored function
        } else {
            gameIdDisplay.textContent = 'N/A';
            if (lobbyPlayerList) lobbyPlayerList.innerHTML = '';
            if (loginPlayerList) loginPlayerList.innerHTML = '';
        }

        if (currentPhase !== 'login') loginListenersAttached = false;
        if (currentPhase !== 'setup') setupListenersAttached = false;
        if (currentPhase !== 'lobby') copyLinkListenerAttached = false;

        switch (currentPhase) {
            case 'setup': console.log("DEBUG: updateUI - Showing 'setupSection'"); showSection('setupSection'); attachSetupListeners(); break;
            case 'lobby': console.log("DEBUG: updateUI - Showing 'shareSection' (Lobby)"); showSection('shareSection'); if(currentGameState?.expectedPlayers && currentGameState.loggedInUsernames?.length === currentGameState.expectedPlayers.length){ displayStatus("All players ready! Starting...", lobbyStatus, false); } else { displayStatus("Waiting for players via link...", lobbyStatus, false); } attachCopyLinkListener(); break;
            case 'login': console.log("DEBUG: updateUI - Showing 'loginSection'"); showSection('loginSection'); loginHeader.textContent = `Join Game: ${currentGameId || '...'}`; if (currentGameState) { updatePlayerStatusList(loginPlayerList, currentGameState); displayStatus('Enter your name from list to join.', loginStatus, false); } else { displayStatus('Waiting for game info...', loginStatus, false); if (loginPlayerList) loginPlayerList.innerHTML = '<li>Loading...</li>'; } attachLoginListeners(); break;
            case 'drafting': console.log("DEBUG: updateUI - Showing 'draftContainer' (Drafting)"); showSection('draftContainer'); submittedDraftsContainer.style.display = 'none'; if (currentUser) { currentUserInfo.textContent = `Drafting as: ${currentUser}`; const isSubmitted = currentGameState?.submittedPlayers?.includes(currentUser); toggleDraftingInteraction(!isSubmitted); } else { currentUserInfo.textContent = "Waiting..."; toggleDraftingInteraction(false); } if (!draftSlotSortables.length) { initializeDraftBoard(); } attachDraftingListeners(); break;
            case 'reveal': console.log("DEBUG: updateUI - Showing 'draftContainer' (Reveal)"); showSection('draftContainer'); submittedDraftsContainer.style.display = 'block'; if (currentUser) { currentUserInfo.textContent = `Viewing Results as: ${currentUser}`; } toggleDraftingInteraction(false); if (revealedDraftsData) { console.log("DEBUG: updateUI - In reveal phase and have data, calling display."); displayAllSubmissions(revealedDraftsData); } else { console.log("DEBUG: updateUI - In reveal phase but waiting for data."); if (allDraftsDiv) allDraftsDiv.innerHTML = '<p>Loading results...</p>'; } if (!draftSlotSortables.length) { initializeDraftBoard(); } break;
            default: console.log(`DEBUG: updateUI - Unknown phase '${currentPhase}', defaulting to 'setupSection'`); showSection('setupSection'); attachSetupListeners();
         }
         console.log("DEBUG: updateUI - Finished.");
    }

    // --- Listener Attachment Functions ---
    function attachSetupListeners() { if (setupListenersAttached || !setupButton || !playerNamesInput) return; console.log("DEBUG: Attaching Setup listeners."); setupButton.addEventListener('click', () => { console.log('DEBUG: Create Game CLICKED!'); const names = playerNamesInput.value.split(',').map(n => n.trim()).filter(Boolean); console.log('DEBUG: Names entered:', names); if (names.length > 0) { clearStatus(setupError); console.log('DEBUG: Emitting setupGame...'); socket.emit('setupGame', names); } else { console.log('DEBUG: No names.'); displayStatus('Enter player name(s).', setupError); } }); playerNamesInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') setupButton.click(); }); setupListenersAttached = true; }
    function attachLoginListeners() { if (loginListenersAttached || !loginButton || !usernameInput) { console.error("Cannot attach login listeners - button or input missing"); return; } console.log("DEBUG: Attaching Login listeners."); loginButton.addEventListener('click', () => { console.log("DEBUG: Join Game CLICKED!"); const username = usernameInput.value.trim(); console.log(`DEBUG: Join attempt - User: '${username}', GameID: '${currentGameId}'`); if (username && currentGameId) { clearStatus(loginStatus); displayStatus('Joining...', loginStatus, false); console.log("DEBUG: Emitting 'requestJoin'..."); socket.emit('requestJoin', { gameId: currentGameId, username }); } else if (!currentGameId) { console.log("DEBUG: Join fail - No gameId"); displayStatus('Error: No game ID.', loginStatus); } else { console.log("DEBUG: Join fail - No username"); displayStatus('Enter your name.', loginStatus); } }); usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { console.log("DEBUG: Enter in login input"); loginButton.click(); } }); loginListenersAttached = true; }
    function attachCopyLinkListener() { if (copyLinkListenerAttached || !copyLinkButton || !shareLinkInput) return; console.log("DEBUG: Attaching Copy Link listener."); copyLinkButton.addEventListener('click', () => { console.log("DEBUG: Copy Link CLICKED!"); shareLinkInput.select(); shareLinkInput.setSelectionRange(0, 99999); try { let c = false; if (navigator.clipboard) { navigator.clipboard.writeText(shareLinkInput.value).then(() => { c = true; alert('Link copied!'); }).catch(err => { console.warn('Clipboard API fail:', err); c = document.execCommand('copy'); if (c) { alert('Link copied (fallback).'); } else { throw new Error('execCommand fail'); } }); } else { c = document.execCommand('copy'); if (c) { alert('Link copied (fallback).'); } else { throw new Error('execCommand fail'); } } } catch (err) { console.error('Copy failed:', err); alert('Copy failed.'); } }); copyLinkListenerAttached = true; }
    function attachDraftingListeners() { searchFilterInput?.addEventListener('input', filterPlayers); positionFilterSelect?.addEventListener('change', filterPlayers); schoolFilterSelect?.addEventListener('change', filterPlayers); resetDraftButton?.addEventListener('click', resetDraft); submitButton?.addEventListener('click', submitDraft); }

    // --- Other Functions --- (initializeDraftBoard, populatePlayers, etc.)
    function initializeDraftBoard() { console.log("DEBUG: Initializing draft board UI..."); pickRangeSpan.textContent = `#1 - #${draftSlots}`; populatePlayers(); populateSchoolFilter(); createDraftSlots(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); filterPlayers(); console.log("DEBUG: Draft board initialized."); }
    function populatePlayers() { availablePlayersList.innerHTML = ''; playersData.forEach(player => availablePlayersList.appendChild(createPlayerElement(player))); if (availablePlayersSortable) availablePlayersSortable.destroy(); availablePlayersSortable = Sortable.create(availablePlayersList, { group: { name: "players", pull: true, put: true }, animation: 150, sort: true, filter: '.player-disabled', preventOnFilter: true, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); }
    function createPlayerElement(player) { const playerDiv = document.createElement("div"); playerDiv.className = "player"; playerDiv.dataset.position = player.position; playerDiv.dataset.school = player.school; playerDiv.dataset.name = player.name; playerDiv.textContent = `${player.name} - ${player.position} - ${player.school}`; return playerDiv; }
    function populateSchoolFilter() { const schools = [...new Set(playersData.map(p => p.school).filter(Boolean))].sort(); schoolFilterSelect.innerHTML = '<option value="">All Schools</option>'; schools.forEach(school => { const option = document.createElement("option"); option.value = school; option.textContent = school; schoolFilterSelect.appendChild(option); }); }
    function createDraftSlots() { draftSlotsContainer.innerHTML = ''; draftSlotSortables = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.createElement("div"); slot.className = "draft-slot"; slot.id = `slot-${i}`; slot.dataset.pickNumber = i; const pickNumberSpan = document.createElement("span"); pickNumberSpan.className = "pick-number"; pickNumberSpan.textContent = `${i}.`; slot.appendChild(pickNumberSpan); draftSlotsContainer.appendChild(slot); const sortable = Sortable.create(slot, { group: { name: "players", pull: true, put: true }, animation: 150, onAdd: handlePlayerDrop, onRemove: handlePlayerRemove, onMove: function (evt) { return !(currentGameState?.submittedPlayers?.includes(currentUser)); } }); draftSlotSortables.push(sortable); } }
    function handlePlayerDrop(evt) { const playerElement = evt.item; const targetSlot = evt.to; if (!targetSlot.classList.contains('draft-slot')) return; if (currentGameState?.submittedPlayers?.includes(currentUser)) { console.warn("Drop after submit."); (evt.from || availablePlayersList).appendChild(playerElement); return; } const existing = Array.from(targetSlot.children).filter(c => c.classList.contains('player')); if (existing.length > 1) { const remove = existing.find(p => p !== playerElement); if (remove) { availablePlayersList.appendChild(remove); } } targetSlot.classList.add('slot-filled'); if (window.navigator.vibrate) window.navigator.vibrate(50); updateLocalDraftState(); sendDraftUpdateToServer(); }
    function handlePlayerRemove(evt) { const source = evt.from; if (source.classList.contains('draft-slot')) { source.classList.remove('slot-filled'); updateLocalDraftState(); sendDraftUpdateToServer(); } }
    function updateLocalDraftState() { localDraft = []; for (let i = 1; i <= draftSlots; i++) { const slot = document.getElementById(`slot-${i}`); const playerEl = slot?.querySelector(".player"); localDraft.push({ pick: i, playerText: playerEl ? playerEl.textContent : null }); } }
    function sendDraftUpdateToServer() { clearTimeout(debounceTimeout); debounceTimeout = setTimeout(() => { if (currentPhase === 'drafting' && !(currentGameState?.submittedPlayers?.includes(currentUser))) { updateLocalDraftState(); console.log("DEBUG: Sending draft update..."); socket.emit('updateDraft', localDraft); } }, 750); }
    function loadDraftState(draftToLoad) { if (!draftToLoad || !Array.isArray(draftToLoad)) { console.warn("Invalid draft state"); return; } resetDraftVisuals(); draftToLoad.forEach(pickData => { if (pickData.playerText) { const slot = document.getElementById(`slot-${pickData.pick}`); const el = Array.from(availablePlayersList.querySelectorAll('.player')).find(p => p.textContent === pickData.playerText); if (el && slot) { if (!slot.querySelector('.player')) { slot.appendChild(el); slot.classList.add('slot-filled'); } else { console.warn(`Slot ${pickData.pick} occupied loading ${pickData.playerText}`); } } else if (!el) { console.warn(`Player "${pickData.playerText}" pick ${pickData.pick} not available.`); } } }); updateLocalDraftState(); filterPlayers(); }
    function resetDraftVisuals() { const slots = draftSlotsContainer.querySelectorAll('.draft-slot'); slots.forEach(slot => { const player = slot.querySelector('.player'); if (player) { availablePlayersList.appendChild(player); slot.classList.remove('slot-filled'); } }); filterPlayers(); }
    function resetDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot reset."); return; } if (!confirm(`Reset selections, ${currentUser}?`)) return; resetDraftVisuals(); localDraft = Array(draftSlots).fill(null).map((_, i) => ({ pick: i + 1, playerText: null })); sendDraftUpdateToServer(); }
    function submitDraft() { if (!currentUser || currentPhase !== 'drafting' || currentGameState?.submittedPlayers?.includes(currentUser)) { alert("Cannot submit."); return; } updateLocalDraftState(); let filled = localDraft.filter(p => p.playerText !== null).length; let msg = `Submit final draft? (${filled}/${draftSlots} picks). No changes allowed.`; if (filled < draftSlots) { msg = `Warning: Only ${filled}/${draftSlots} picks made. Submit anyway? No changes allowed.`; } if (confirm(msg)) { console.log("DEBUG: Submitting final draft..."); socket.emit('submitDraft', localDraft); } }
    function filterPlayers() { const term = searchFilterInput.value.toLowerCase(); const pos = positionFilterSelect.value; const school = schoolFilterSelect.value; const elements = availablePlayersList.querySelectorAll(".player"); elements.forEach(p => { const name = p.dataset.name?.toLowerCase() || ''; const position = p.dataset.position || ''; const sch = p.dataset.school || ''; const matchPos = !pos || position.includes(pos); const matchSch = !school || sch === school; const matchSearch = !term || name.includes(term) || position.toLowerCase().includes(term) || sch.toLowerCase().includes(term); p.style.display = (matchPos && matchSch && matchSearch) ? "" : "none"; }); }
    function displayAllSubmissions(allDrafts) { allDraftsDiv.innerHTML = ""; submittedDraftsContainer.style.display = 'block'; if (!currentGameState || !currentGameState.expectedPlayers) { allDraftsDiv.innerHTML = "Error: Missing player list."; return; } currentGameState.expectedPlayers.forEach(username => { const data = allDrafts[username]; const div = document.createElement("div"); div.className = 'submission'; let html = ''; if (data && Array.isArray(data)) { html = data.map(p => `<div>${p.pick}. ${p.playerText || '---'}</div>`).join(""); div.innerHTML = `<strong>${username}'s Draft:</strong>${html}`; } else { div.innerHTML = `<strong>${username}'s Draft:</strong> (Data missing)`; } allDraftsDiv.appendChild(div); }); }
    function toggleDraftingInteraction(enabled) { searchFilterInput.disabled = !enabled; positionFilterSelect.disabled = !enabled; schoolFilterSelect.disabled = !enabled; const can = enabled && !(currentGameState?.submittedPlayers?.includes(currentUser)); resetDraftButton.disabled = !can; submitButton.disabled = !can; if (availablePlayersSortable) { availablePlayersSortable.option("disabled", !enabled); } draftSlotSortables.forEach(s => { s.option("disabled", !enabled); }); const area = document.querySelector('.lists-wrapper'); if (area) { area.style.opacity = enabled ? '1' : '0.6'; } }
    function handleUrlGameId() { console.log('DEBUG: handleUrlGameId started.'); const parts = window.location.pathname.split('/'); console.log('DEBUG: path:', window.location.pathname, 'parts:', parts); if (parts.length === 3 && parts[1] === 'game') { const id = parts[2]; console.log('DEBUG: Path matches /game/.'); if (id && id.length > 0) { currentGameId = id; currentPhase = 'login'; console.log(`DEBUG: Game ID found: ${currentGameId}. Phase=login.`); } else { currentPhase = 'setup'; console.log("DEBUG: Game ID empty. Phase=setup."); } } else { currentPhase = 'setup'; console.log("DEBUG: Path no match. Phase=setup."); } console.log('DEBUG: handleUrlGameId finished. Phase:', currentPhase); }

    console.log("Client script loaded. Waiting for DOM and Socket connection...");
    // Initial UI state set via 'connect' event handler

}); // End DOMContentLoaded